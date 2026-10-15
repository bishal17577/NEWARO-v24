import { useState, useEffect, useCallback } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { RedeemCode, CoinTarget } from '../types';
import { playUiSound } from './settings';

export interface CoinTransaction { id: string; type: 'credit' | 'debit'; amount: number; reason: string; createdAt: number; }
const CODES_STORAGE_KEY = 'newaro_redeem_codes_v3';
const TARGETS_STORAGE_KEY = 'newaro_coin_targets_v2';
const balanceKey = (uid: string) => `newaro_coins_v3_${uid}`;
const historyKey = (uid: string) => `newaro_coin_history_v3_${uid}`;
const safeRead = <T,>(key: string, fallback: T): T => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } };
export function loadLocalRedeemCodes(): RedeemCode[] { return safeRead(CODES_STORAGE_KEY, []); }
export function saveLocalRedeemCodes(codes: RedeemCode[]) { try { localStorage.setItem(CODES_STORAGE_KEY, JSON.stringify(codes)); window.dispatchEvent(new CustomEvent('newaro:redeem_codes_updated', { detail: codes })); } catch {} }
export function loadLocalCoinTargets(): CoinTarget[] { return safeRead(TARGETS_STORAGE_KEY, []); }
export function saveLocalCoinTargets(targets: CoinTarget[]) { try { localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(targets)); window.dispatchEvent(new CustomEvent('newaro:coin_targets_updated', { detail: targets })); } catch {} }

/** Admin UI helper. The caller must already have passed the app's admin guard. */
export async function adjustUserCoinsByAdmin(userId: string, delta: number): Promise<number> {
  if (!userId || !Number.isFinite(delta) || !Number.isInteger(delta) || delta === 0) throw new Error('Invalid coin adjustment');
  const userRef = doc(db, 'users', userId);
  const nextCoins = await runTransaction(db, async tx => {
    const snap = await tx.get(userRef);
    const current = Math.max(0, Number(snap.data()?.giftCoins || 0));
    const next = Math.max(0, current + delta);
    tx.set(userRef, { giftCoins: next }, { merge: true });
    const txRef = doc(collection(db, 'users', userId, 'coin_transactions'));
    tx.set(txRef, { type: delta > 0 ? 'credit' : 'debit', amount: Math.abs(delta), reason: 'Admin adjustment', createdAt: serverTimestamp() });
    return next;
  });
  try { localStorage.setItem(balanceKey(userId), String(nextCoins)); window.dispatchEvent(new CustomEvent('newaro:user_coins_updated', { detail: { userId, coins: nextCoins } })); } catch {}
  return nextCoins;
}

export function useGiftCoins(userId?: string, _initialCoins?: number) {
  const uid = userId || 'guest';
  const [coins, setCoins] = useState(0);
  const [history, setHistory] = useState<CoinTransaction[]>([]);
  const [loadedUid, setLoadedUid] = useState('');

  const refresh = useCallback(async () => {
    if (!userId) { setCoins(0); setHistory([]); setLoadedUid('guest'); return; }
    const snap = await getDoc(doc(db, 'users', userId));
    const dbCoins = Math.max(0, Number(snap.data()?.giftCoins || 0));
    setCoins(dbCoins); setLoadedUid(userId);
    try { localStorage.setItem(balanceKey(userId), String(dbCoins)); } catch {}
    try {
      const txSnap = await getDocs(collection(db, 'users', userId, 'coin_transactions'));
      const rows = txSnap.docs.map(d => { const v = d.data(); return { id: d.id, type: v.type === 'debit' ? 'debit' as const : 'credit' as const, amount: Math.max(0, Number(v.amount || 0)), reason: String(v.reason || ''), createdAt: typeof v.createdAt?.toMillis === 'function' ? v.createdAt.toMillis() : Number(v.createdAt || 0) }; }).sort((a,b)=>b.createdAt-a.createdAt).slice(0,50);
      setHistory(rows);
      try { localStorage.setItem(historyKey(userId), JSON.stringify(rows)); } catch {}
    } catch { setHistory(safeRead(historyKey(userId), [])); }
  }, [userId]);

  useEffect(() => { let active = true; if (!userId) { setCoins(0); setHistory([]); setLoadedUid('guest'); return; } setCoins(0); setHistory([]); setLoadedUid(''); getDoc(doc(db,'users',userId)).then(async snap => { if (!active) return; const balance = Math.max(0, Number(snap.data()?.giftCoins || 0)); setCoins(balance); setLoadedUid(userId); try { localStorage.setItem(balanceKey(userId),String(balance)); } catch {} try { const ts = await getDocs(collection(db,'users',userId,'coin_transactions')); if (!active) return; const rows = ts.docs.map(d=>{const v=d.data();return {id:d.id,type:v.type==='debit'?'debit' as const:'credit' as const,amount:Math.max(0,Number(v.amount||0)),reason:String(v.reason||''),createdAt:typeof v.createdAt?.toMillis==='function'?v.createdAt.toMillis():Number(v.createdAt||0)}}).sort((a,b)=>b.createdAt-a.createdAt).slice(0,50); setHistory(rows); } catch { if(active) setHistory(safeRead(historyKey(userId),[])); } }).catch(err=>console.error('Wallet balance load failed',err)); return ()=>{active=false;}; },[userId]);

  const addCoins = async (delta: number, reason: string, type: 'credit' | 'debit' = delta < 0 ? 'debit' : 'credit') => {
    if (!userId) throw new Error('Sign in to use Gift Coins');
    if (!Number.isFinite(delta) || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) throw new Error('Invalid coin amount');
    const userRef = doc(db,'users',userId); const transactionRef = doc(collection(db,'users',userId,'coin_transactions'));
    const nextCoins = await runTransaction(db, async tx => { const snap=await tx.get(userRef); const current=Math.max(0,Number(snap.data()?.giftCoins||0)); if(delta<0 && current < Math.abs(delta)) throw new Error('Insufficient Gift Coins'); const next=current+delta; tx.set(userRef,{giftCoins:next},{merge:true}); tx.set(transactionRef,{type,amount:Math.abs(delta),reason:String(reason||'Wallet transaction').slice(0,160),createdAt:serverTimestamp()}); return next; });
    const row: CoinTransaction={id:transactionRef.id,type,amount:Math.abs(delta),reason:String(reason||'Wallet transaction').slice(0,160),createdAt:Date.now()}; setCoins(nextCoins); setLoadedUid(userId); setHistory(prev=>[row,...prev].slice(0,50)); try {localStorage.setItem(balanceKey(userId),String(nextCoins));}catch{}; try {localStorage.setItem(historyKey(userId),JSON.stringify([row,...history].slice(0,50)));}catch{}; window.dispatchEvent(new CustomEvent('newaro:user_coins_updated',{detail:{userId,coins:nextCoins}})); return nextCoins;
  };

  const claimDailyBonus = async () => {
    if (!userId) throw new Error('Sign in to claim the daily bonus');
    const dateKey = new Date().toLocaleDateString('en-CA');
    const userRef = doc(db, 'users', userId);
    const txRef = doc(collection(db, 'users', userId, 'coin_transactions'));
    const nextCoins = await runTransaction(db, async tx => {
      const snap = await tx.get(userRef);
      if (snap.data()?.lastDailyClaimDate === dateKey) throw new Error('You already claimed your daily bonus today');
      const next = Math.max(0, Number(snap.data()?.giftCoins || 0)) + 25;
      tx.set(userRef, { giftCoins: next, lastDailyClaimDate: dateKey }, { merge: true });
      tx.set(txRef, { type: 'credit', amount: 25, reason: 'Daily Login & Streak Bonus', createdAt: serverTimestamp() });
      return next;
    });
    setCoins(nextCoins); setLoadedUid(userId);
    const row: CoinTransaction = { id: txRef.id, type: 'credit', amount: 25, reason: 'Daily Login & Streak Bonus', createdAt: Date.now() };
    setHistory(prev => [row, ...prev].slice(0, 50));
    try { localStorage.setItem(balanceKey(userId), String(nextCoins)); } catch {}
    window.dispatchEvent(new CustomEvent('newaro:user_coins_updated', { detail: { userId, coins: nextCoins } }));
    playUiSound('success');
    return nextCoins;
  };

  const redeemBonusCode = async (rawCode: string) => {
    if (!userId) return {ok:false,message:'Sign in to redeem a code'};
    const clean=rawCode.trim().toUpperCase(); if(!/^[A-Z0-9_-]{3,64}$/.test(clean)) return {ok:false,message:'Enter a valid code'};
    const codeRef=doc(db,'redeem_codes',`code_${clean.toLowerCase()}`); const userRef=doc(db,'users',userId); const txRef=doc(collection(db,'users',userId,'coin_transactions'));
    try { const reward=await runTransaction(db,async tx=>{const codeSnap=await tx.get(codeRef);const userSnap=await tx.get(userRef);if(!codeSnap.exists())throw new Error('Invalid bonus code');const c=codeSnap.data();const usedBy=Array.isArray(c.usedBy)?c.usedBy as string[]:[];const currentCodes=Array.isArray(userSnap.data()?.redeemedCodes)?userSnap.data()?.redeemedCodes as string[]:[];if(c.active!==true)throw new Error('This code is inactive');if(usedBy.includes(userId)||currentCodes.includes(clean))throw new Error('You have already redeemed this code');const maxUses=Math.max(0,Number(c.maxUses||0));if(maxUses>0&&Number(c.usedCount||0)>=maxUses)throw new Error('This code has reached its usage limit');const amount=Number(c.coins);if(!Number.isInteger(amount)||amount<1||amount>100000)throw new Error('This code has an invalid reward');tx.update(codeRef,{usedCount:Number(c.usedCount||0)+1,usedBy:[...usedBy,userId]});tx.set(userRef,{giftCoins:Math.max(0,Number(userSnap.data()?.giftCoins||0))+amount,redeemedCodes:[...new Set([...currentCodes,clean])]}, {merge:true});tx.set(txRef,{type:'credit',amount,reason:`Redeemed bonus code: ${clean}`,createdAt:serverTimestamp()});return amount;}); await refresh(); playUiSound('success');return {ok:true,message:`+${reward} Gift Coins added!`};} catch(e:any){return {ok:false,message:e?.message||'Could not redeem code'};}
  };
  return {coins,balance:coins,ledger:history,addCoins,redeemBonusCode,claimDailyBonus,refresh,loaded:loadedUid===uid};
}

export function useCoinTargetsManager() {
  const [targets,setTargets]=useState<CoinTarget[]>(()=>loadLocalCoinTargets());
  useEffect(()=>{let active=true;getDocs(collection(db,'coin_targets')).then(snap=>{if(!active)return;const list=snap.docs.map(d=>({id:d.id,...d.data()} as CoinTarget));setTargets(list);saveLocalCoinTargets(list);}).catch(err=>console.error('Coin targets load failed',err));return()=>{active=false;};},[]);
  const createTarget=async(data:{title:string;description:string;coins:number})=>{if(!data.title.trim()||!Number.isInteger(data.coins)||data.coins<1)throw new Error('Enter a title and positive integer coin reward');const ref=doc(collection(db,'coin_targets'));const target:CoinTarget={id:ref.id,title:data.title.trim(),description:data.description.trim(),coins:data.coins,active:true,claimedBy:[],createdAt:Date.now()};await setDoc(ref,target);setTargets(prev=>{const next=[target,...prev];saveLocalCoinTargets(next);return next;});};
  const toggleTargetActive=async(id:string,active:boolean)=>{await updateDoc(doc(db,'coin_targets',id),{active});setTargets(prev=>{const next=prev.map(t=>t.id===id?{...t,active}:t);saveLocalCoinTargets(next);return next;});};
  const deleteTarget=async(id:string)=>{await deleteDoc(doc(db,'coin_targets',id));setTargets(prev=>{const next=prev.filter(t=>t.id!==id);saveLocalCoinTargets(next);return next;});};
  const claimTarget=async(targetId:string,userId:string)=>{if(!userId)return{ok:false,message:'Sign in to claim a target'};const targetRef=doc(db,'coin_targets',targetId);const userRef=doc(db,'users',userId);const txRef=doc(collection(db,'users',userId,'coin_transactions'));try{const reward=await runTransaction(db,async tx=>{const [targetSnap,userSnap]=await Promise.all([tx.get(targetRef),tx.get(userRef)]);if(!targetSnap.exists())throw new Error('Target not found');const t=targetSnap.data();if(t.active!==true)throw new Error('This target is inactive');const claimed=Array.isArray(t.claimedBy)?t.claimedBy as string[]:[];if(claimed.includes(userId))throw new Error('Already claimed');const amount=Number(t.coins);if(!Number.isInteger(amount)||amount<1)throw new Error('Invalid target reward');tx.update(targetRef,{claimedBy:[...claimed,userId]});tx.set(userRef,{giftCoins:Math.max(0,Number(userSnap.data()?.giftCoins||0))+amount},{merge:true});tx.set(txRef,{type:'credit',amount,reason:`Claimed target: ${String(t.title||targetId).slice(0,100)}`,createdAt:serverTimestamp()});return amount;});const snap=await getDoc(targetRef);if(snap.exists()){const updated={id:snap.id,...snap.data()} as CoinTarget;setTargets(prev=>{const next=prev.map(t=>t.id===targetId?updated:t);saveLocalCoinTargets(next);return next;});}playUiSound('success');window.dispatchEvent(new CustomEvent('newaro:user_coins_updated',{detail:{userId}}));return{ok:true,message:`+${reward} Gift Coins claimed!`};}catch(e:any){return{ok:false,message:e?.message||'Could not claim reward'};}};
  return{targets,createTarget,toggleTargetActive,deleteTarget,claimTarget};
}

export function useRedeemCodesManager() {
  const [codes,setCodes]=useState<RedeemCode[]>(()=>loadLocalRedeemCodes());
  useEffect(()=>{let active=true;getDocs(collection(db,'redeem_codes')).then(snap=>{if(!active)return;const list=snap.docs.map(d=>({id:d.id,...d.data()} as RedeemCode));setCodes(list);saveLocalRedeemCodes(list);}).catch(err=>console.error('Redeem codes load failed',err));return()=>{active=false;};},[]);
  const createCode=async(data:{code:string;coins:number;maxUses:number;description:string})=>{const clean=data.code.trim().toUpperCase();if(!/^[A-Z0-9_-]{3,64}$/.test(clean)||!Number.isInteger(data.coins)||data.coins<1||!Number.isInteger(data.maxUses)||data.maxUses<0)throw new Error('Invalid redeem code details');const id=`code_${clean.toLowerCase()}`;const value:RedeemCode={id,code:clean,coins:data.coins,maxUses:data.maxUses,description:data.description.trim(),usedCount:0,usedBy:[],active:true,createdAt:Date.now()};await setDoc(doc(db,'redeem_codes',id),value);setCodes(prev=>{const next=[value,...prev.filter(c=>c.id!==id)];saveLocalRedeemCodes(next);return next;});};
  const toggleCodeActive=async(codeStr:string,active:boolean)=>{const found=codes.find(c=>c.code===codeStr);if(!found)return;await updateDoc(doc(db,'redeem_codes',found.id),{active});setCodes(prev=>{const next=prev.map(c=>c.code===codeStr?{...c,active}:c);saveLocalRedeemCodes(next);return next;});};
  const deleteCode=async(codeStr:string)=>{const found=codes.find(c=>c.code===codeStr);if(!found)return;await deleteDoc(doc(db,'redeem_codes',found.id));setCodes(prev=>{const next=prev.filter(c=>c.code!==codeStr);saveLocalRedeemCodes(next);return next;});};
  return{codes,createCode,toggleCodeActive,deleteCode};
}

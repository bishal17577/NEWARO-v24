import React, { useEffect, useMemo, useState } from 'react';
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ExternalLink, Search, Plus, AppWindow, Loader2 } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../auth/AuthContext';

type AppListing = { id: string; name: string; description: string; category: string; url: string; logoUrl?: string; status?: string; pinned?: boolean };
const safeUrl = (value: string) => { try { const u = new URL(value); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; } };

export const AppsPage: React.FC = () => {
  const [apps, setApps] = useState<AppListing[]>([]);
  const [pendingApps, setPendingApps] = useState<AppListing[]>([]);
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'Tools', url: '', logoUrl: '' });
  const { addToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'apps'), where('status', '==', 'published')));
      setApps(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppListing)));
      if (isAdmin) { const pending = await getDocs(query(collection(db, 'apps'), where('status', '==', 'pending'))); setPendingApps(pending.docs.map(d => ({ id: d.id, ...d.data() } as AppListing))); }
    } catch (e) { console.error('Apps load failed', e); addToast('Could not load apps. Check Firestore rules and connection.', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [isAdmin]);
  const moderate = async (app: AppListing, status: 'published' | 'rejected') => { try { await updateDoc(doc(db, 'apps', app.id), { status, updatedAt: serverTimestamp() }); setPendingApps(prev => prev.filter(x => x.id !== app.id)); if (status === 'published') setApps(prev => [{ ...app, status }, ...prev]); addToast(status === 'published' ? 'App published.' : 'App rejected.', 'success'); } catch (e) { console.error(e); addToast('Moderation failed. Check admin account and Firestore rules.', 'error'); } };

  const filtered = useMemo(() => apps.filter(a => `${a.name} ${a.description} ${a.category}`.toLowerCase().includes(search.toLowerCase().trim())).sort((a,b) => Number(!!b.pinned)-Number(!!a.pinned)), [apps, search]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) { addToast('Sign in before submitting an app.', 'info'); return; }
    if (form.name.trim().length < 2 || form.description.trim().length < 8 || !safeUrl(form.url) || (form.logoUrl && !safeUrl(form.logoUrl))) { addToast('Enter a name, useful description, valid app URL, and valid optional logo URL.', 'error'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'apps'), { name: form.name.trim(), description: form.description.trim(), category: form.category, url: form.url.trim(), logoUrl: form.logoUrl.trim() || '', status: 'pending', pinned: false, ownerUid: user.uid, ownerEmail: user.email || '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      addToast('App submitted for admin review. It will appear after approval.', 'success');
      setForm({ name: '', description: '', category: 'Tools', url: '', logoUrl: '' }); setShowForm(false);
    } catch (e) { console.error(e); addToast('App submission failed. Check Firestore rules.', 'error'); }
    finally { setSaving(false); }
  };

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
    <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-600 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8"><div><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-100"><AppWindow size={18}/> NEWARO APPS</div><h1 className="text-3xl font-black">Apps & useful tools</h1><p className="mt-2 max-w-xl text-sm text-indigo-100">Discover community tools and submit your own app for review.</p></div><button onClick={() => setShowForm(v => !v)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-indigo-700"><Plus size={18}/> Submit an app</button></header>
    {showForm && <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2"><h2 className="text-lg font-bold sm:col-span-2">Submit your app</h2><input required maxLength={80} placeholder="App name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="rounded-xl border p-3"/><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="rounded-xl border p-3"><option>Tools</option><option>Education</option><option>Business</option><option>Entertainment</option><option>Games</option><option>Productivity</option><option>Other</option></select><input required type="url" placeholder="App URL (https://...)" value={form.url} onChange={e=>setForm({...form,url:e.target.value})} className="rounded-xl border p-3"/><input type="url" placeholder="Logo URL (optional)" value={form.logoUrl} onChange={e=>setForm({...form,logoUrl:e.target.value})} className="rounded-xl border p-3"/><textarea required minLength={8} maxLength={500} placeholder="What does your app do?" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="min-h-24 rounded-xl border p-3 sm:col-span-2"/><div className="flex gap-2 sm:col-span-2"><button disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? 'Submitting…' : 'Submit for review'}</button><button type="button" onClick={()=>setShowForm(false)} className="rounded-xl bg-slate-100 px-5 py-3 font-semibold">Cancel</button></div></form>}
    {isAdmin && pendingApps.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="mb-3 font-bold text-amber-900">Apps awaiting review ({pendingApps.length})</h2><div className="space-y-3">{pendingApps.map(a=><div key={a.id} className="flex flex-col gap-3 rounded-xl bg-white p-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-bold">{a.name}</p><p className="break-all text-xs text-slate-500">{a.url}</p><p className="text-sm text-slate-600">{a.description}</p></div><div className="flex gap-2"><button onClick={()=>void moderate(a,'published')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white">Publish</button><button onClick={()=>void moderate(a,'rejected')} className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-bold text-rose-700">Reject</button></div></div>)}</div></section>}
    <label className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3"><Search className="text-slate-400" size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search apps and tools" className="w-full outline-none"/></label>
    {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600"/></div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed p-12 text-center text-slate-500">No published apps found yet. Submit an app to get started.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(a=><article key={a.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3">{a.logoUrl && safeUrl(a.logoUrl) ? <img src={a.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" loading="lazy"/> : <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><AppWindow/></div>}<div className="min-w-0 flex-1"><h2 className="font-bold">{a.name}</h2><span className="text-xs font-semibold text-indigo-600">{a.category || 'Other'}</span></div>{a.pinned && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">Featured</span>}</div><p className="my-4 flex-1 whitespace-pre-wrap text-sm text-slate-600">{a.description}</p><a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white">Open app <ExternalLink size={16}/></a></article>)}</div>}
  </main>;
};
export default AppsPage;

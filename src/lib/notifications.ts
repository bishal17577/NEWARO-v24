import {
  addDoc,
  collection,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { NotificationItem, NotificationType } from '../types';

export interface NotifyParams {
  recipientId: string;
  recipientEmail?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  linkTitle?: string;
  badge?: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  imageUrl?: string;
  targetId?: string;
  skipEmail?: boolean;
  allowSelf?: boolean;
  data?: Record<string, any>;
}

const chatEmailHourlyTracker = new Map<string, number>();

export function canSendChatEmailNow(
  chatId: string,
  recipientId: string,
  previousUnreadCount: number
): boolean {
  if (previousUnreadCount !== 0) return false;
  const key = `${chatId}_${recipientId}`;
  const lastSent = chatEmailHourlyTracker.get(key) || 0;
  const now = Date.now();
  if (now - lastSent < 60 * 60 * 1000) {
    return false;
  }
  chatEmailHourlyTracker.set(key, now);
  return true;
}

export async function notify(params: NotifyParams): Promise<void> {
  try {
    if (!params.recipientId) return;
    const currentUid = auth.currentUser?.uid || '';
    const callerActorId = params.actorId || currentUid;

    if (!params.allowSelf && callerActorId && params.recipientId === callerActorId) {
      return;
    }

    const effectiveActorId = currentUid || callerActorId || 'system';
    const createdAt = Date.now();
    const cleanTitle = String(params.title || 'NEWARO Notification').slice(0, 100);
    const cleanMessage = String(params.message || '').slice(0, 500);
    const cleanLink = params.link || '/';

    const firestoreDoc: Record<string, any> = {
      recipientId: params.recipientId,
      type: params.type,
      title: cleanTitle,
      message: cleanMessage,
      link: cleanLink,
      linkTitle: params.linkTitle || 'View Details',
      badge: params.badge || '',
      read: false,
      actorId: effectiveActorId,
      actorName: String(params.actorName || 'NEWARO').slice(0, 80),
      actorAvatar: String(params.actorAvatar || ''),
      imageUrl: params.imageUrl || '',
      createdAt,
    };

    await addDoc(collection(db, 'notifications'), firestoreDoc).catch(() => {});

    if (params.skipEmail) return;

    let recipientEmail = params.recipientEmail?.trim() || '';
    if (params.recipientId !== 'ALL' && !recipientEmail) {
      try {
        const userSnap = await getDoc(doc(db, 'users', params.recipientId));
        if (userSnap.exists()) {
          recipientEmail = userSnap.data()?.email || '';
        }
      } catch {}
    }

    if (recipientEmail && recipientEmail.includes('@')) {
      const emailType =
        params.type === 'weekly_report'
          ? 'weekly_insight'
          : params.type === 'threshold_alert'
          ? 'alert_threshold'
          : params.type === 'gig_proposal' || params.type === 'gig_accepted'
          ? 'system'
          : params.type;

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: emailType,
          to: recipientEmail,
          data: {
            title: cleanTitle,
            message: cleanMessage,
            link: cleanLink,
            actorName: params.actorName,
            ...(params.data || {}),
          },
        }),
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('notify() warning:', err);
  }
}

export const sendPlatformNotification = notify;

export async function notifyFollowers(
  targetId: string,
  actor: { id: string; name: string; avatar?: string },
  type: string,
  snippet: string,
  link: string,
  imageUrl?: string
): Promise<void> {
  notify({
    recipientId: targetId,
    type: 'product_update',
    title: `New update from ${actor.name}`,
    message: snippet,
    link,
    imageUrl,
    actorId: actor.id,
    actorName: actor.name,
    actorAvatar: actor.avatar,
  }).catch(() => {});
}

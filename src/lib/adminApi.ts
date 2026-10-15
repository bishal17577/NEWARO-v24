import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function executeAdminAction(params: {
  action: 'delete' | 'update' | 'patch';
  collectionName: string;
  docId: string;
  data?: Record<string, any>;
  passcode?: string;
  idToken?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { action, collectionName, docId, data } = params;

  // Try 1: Client Firestore SDK
  let clientSuccess = false;
  try {
    const docRef = doc(db, collectionName, docId);
    if (action === 'delete') {
      await deleteDoc(docRef);
      clientSuccess = true;
    } else if (action === 'update' || action === 'patch') {
      if (data) {
        await updateDoc(docRef, data);
        clientSuccess = true;
      }
    }
  } catch (clientErr: any) {
    console.warn(`[Admin] Client SDK ${action} on ${collectionName}/${docId} fallback to server:`, clientErr?.message);
  }

  if (clientSuccess) {
    return { ok: true };
  }

  // Try 2: Server API endpoint (/api/admin/action)
  try {
    if (!params.idToken) return { ok: false, error: 'Your admin session has expired. Sign in again.' };
    const res = await fetch('/api/admin/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(params.idToken ? { Authorization: `Bearer ${params.idToken}` } : {}),
      },
      body: JSON.stringify({
        action,
        collectionName,
        docId,
        data,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok) {
      return { ok: true };
    }
    return { ok: false, error: json.error || 'Server admin action failed' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Admin action failed' };
  }
}

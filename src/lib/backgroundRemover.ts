/** Background removal calls a server-side endpoint; provider secrets stay on the server. */
import { auth } from './firebase';

export async function removeImageBackground(
  fileOrBase64: File | Blob | string,
  onProgress?: (status: string) => void
): Promise<{ success: boolean; resultUrl?: string; error?: string }> {
  try {
    if (onProgress) onProgress('Preparing image for AI background removal...');
    let imagePayload = '';
    if (typeof fileOrBase64 === 'string') {
      imagePayload = fileOrBase64;
    } else {
      imagePayload = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrBase64);
      });
    }

    if (onProgress) onProgress('Removing background with remove.bg AI...');
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Please sign in before using image tools.');
    const idToken = await currentUser.getIdToken();
    const res = await fetch('/api/image/remove-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ image: imagePayload }),
    });

    const data = await res.json();
    if (res.ok && data.ok && data.url) {
      if (onProgress) onProgress('Background removed cleanly!');
      return { success: true, resultUrl: data.url };
    }
    return {
      success: false,
      error: data.error || 'Failed to remove background',
    };
  } catch (err: any) {
    console.warn('Background removal error:', err);
    return {
      success: false,
      error: err?.message || 'Network error removing background',
    };
  }
}

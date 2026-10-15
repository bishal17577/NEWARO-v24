import { auth } from './firebase';
import { removeImageBackground } from './backgroundRemover';


export interface ImgBBUploadResult {
  url: string;
  displayUrl: string;
  deleteUrl?: string;
  thumbUrl?: string;
  usedKeyLabel?: string;
  bgRemoved?: boolean;
}

export function createFastLocalPreview(file: File): string {
  try {
    return URL.createObjectURL(file);
  } catch {
    return '';
  }
}

export async function compressImage(file: File | Blob, maxDimension = 960, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      resolve(file);
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(img, 0, 0, width, height);
      const targetMime = file.type === 'image/png' ? 'image/png' : 'image/webp';
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        targetMime,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


// Used only when the server has no image-hosting key yet. Shrinks the photo so it fits safely
// inside a Firestore document (limit 1 MB per document) and still looks sharp on screen.
async function toCompactInlineImage(blob: Blob): Promise<string> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This image could not be read. Try a JPG or PNG.'));
      el.src = objectUrl;
    });
    for (const [maxSide, quality] of [[900, 0.72], [760, 0.65], [640, 0.58], [520, 0.5]] as const) {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) break;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const out = canvas.toDataURL('image/jpeg', quality);
      if (out.length <= 190_000) return out;
    }
    throw new Error('This image is too detailed to store without an image host. Add IMGBB_API_KEY_1 on the server.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadToImgBB(
  fileOrBlob: File | Blob | string,
  onProgressOrOptions?: ((percent: number) => void) | { removeBackground?: boolean },
  maybeOptions?: { removeBackground?: boolean }
): Promise<ImgBBUploadResult> {
  const onProgress = typeof onProgressOrOptions === 'function' ? onProgressOrOptions : undefined;
  const options =
    typeof onProgressOrOptions === 'object' && onProgressOrOptions !== null
      ? onProgressOrOptions
      : maybeOptions;

  if (onProgress) onProgress(15);
  let uploadBlob: File | Blob;

  if (typeof fileOrBlob === 'string') {
    const res = await fetch(fileOrBlob);
    uploadBlob = await res.blob();
  } else {
    uploadBlob = fileOrBlob;
  }

  let bgRemoved = false;

  // 1. Automatic background removal with remove.bg if enabled
  if (options?.removeBackground) {
    if (onProgress) onProgress(25);
    try {
      const bgResult = await removeImageBackground(fileOrBlob);
      if (bgResult.success && bgResult.resultUrl) {
        const res = await fetch(bgResult.resultUrl);
        uploadBlob = await res.blob();
        bgRemoved = true;
      }
    } catch (err) {
      console.warn('Auto remove.bg deferred to original upload:', err);
    }
  }

  // 2. Client compression
  if (uploadBlob instanceof File && uploadBlob.type.startsWith('image/')) {
    uploadBlob = await compressImage(uploadBlob);
  }

  if (onProgress) onProgress(45);

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please sign in to NEWARO before uploading images.');
  }
  const dataUrl = await blobToDataUrl(uploadBlob);
  const idToken = await currentUser.getIdToken();
  if (onProgress) onProgress(60);
  const response = await fetch('/api/image/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ image: dataUrl }),
  });
  const result = await response.json().catch(() => null);
  if (response.status === 503 && result?.code === 'UPLOAD_NOT_CONFIGURED') {
    const inline = await toCompactInlineImage(uploadBlob);
    if (onProgress) onProgress(100);
    return { url: inline, displayUrl: inline, thumbUrl: inline, bgRemoved };
  }
  if (!response.ok || !result?.ok || !result?.url) {
    throw new Error(result?.error || `Image upload failed (HTTP ${response.status}).`);
  }
  if (onProgress) onProgress(100);
  return {
    url: result.url,
    displayUrl: result.displayUrl || result.url,
    thumbUrl: result.thumbUrl || result.url,
    bgRemoved,
  };
}

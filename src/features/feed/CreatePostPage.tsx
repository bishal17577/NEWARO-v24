import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ImageIcon,
  X,
  Loader2,
  ArrowLeft,
  Send,
  Clock,
  Link2,
  LayoutList,
  Sparkles,
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { uploadToImgBB } from '../../lib/imgbb';
import { notifyFollowers } from '../../lib/notifications';
import { generateSellerText } from '../../lib/gemini';

const MAX_JOINT_PHOTOS = 10;

export const CreatePostPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isStoryParam = searchParams.get('isStory') === 'true';
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const [isStory, setIsStory] = useState(isStoryParam);
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxAllowed = isStory ? 1 : MAX_JOINT_PHOTOS;
    const remainingSlots = maxAllowed - images.length;
    if (remainingSlots <= 0) {
      addToast(
        isStory ? 'Stories use 1 photo' : `Maximum ${MAX_JOINT_PHOTOS} joint photos allowed per post`,
        'info'
      );
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    for (let i = 0; i < filesToUpload.length; i++) {
      try {
        setUploadProgress(15);
        const res = await uploadToImgBB(filesToUpload[i], (p) => setUploadProgress(p));
        setImages((prev) => [...prev, res.url].slice(0, maxAllowed));
      } catch {
        addToast('Failed to upload one of the images', 'error');
      }
    }
    setUploadProgress(null);
    e.target.value = '';
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAiCaption = async () => {
    setGeneratingAi(true);
    try {
      const prompt = content.trim()
        ? `Rewrite and polish this social commerce post caption to be engaging and concise (max 2 sentences): "${content.trim()}"`
        : 'Write a short, engaging social commerce update for a local store or creator in Nepal sharing new arrivals.';
      const res = await generateSellerText('generate_description', {
        name: content.trim() || 'New Arrival Update',
        category: 'Social Post',
        prompt,
      });
      if (res) {
        setContent(res);
        addToast('AI caption generated!', 'success');
      }
    } catch {
      addToast('Could not generate caption right now', 'error');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast('Please sign in to publish content', 'info');
      navigate('/auth');
      return;
    }

    if (!content.trim() && images.length === 0) {
      addToast('Provide some text or at least one photo', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const now = Date.now();
      if (isStory) {
        if (images.length === 0) {
          addToast('Stories require a photo!', 'error');
          setSubmitting(false);
          return;
        }
        const storyPayload = {
          authorId: user.uid,
          authorName: profile?.displayName || user.email?.split('@')[0] || 'User',
          authorEmail: user.email || '',
          authorAvatar: profile?.photoURL || '',
          imageUrl: images[0],
          mediaUrl: images[0],
          caption: content.trim(),
          createdAt: now,
          expiresAt: now + 24 * 60 * 60 * 1000,
        };
        const storyRef = await addDoc(collection(db, 'stories'), storyPayload);
        notifyFollowers(
          user.uid,
          { id: user.uid, name: profile?.displayName || 'A friend', avatar: profile?.photoURL },
          'story',
          content.trim() || 'New 24h Story',
          `/#story-${storyRef.id}`,
          images[0]
        ).catch(() => {});
        addToast('Story published for 24 hours!', 'success');
      } else {
        const postData: any = {
          authorId: user.uid,
          authorName: profile?.displayName || user.email?.split('@')[0] || 'User',
          authorEmail: user.email || '',
          authorAvatar: profile?.photoURL || '',
          content: content.trim(),
          images: images.slice(0, MAX_JOINT_PHOTOS),
          likesCount: 0,
          commentsCount: 0,
          createdAt: now,
        };
        if (linkUrl.trim()) {
          postData.link = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
        }
        const postRef = await addDoc(collection(db, 'posts'), postData);
        notifyFollowers(
          user.uid,
          { id: user.uid, name: profile?.displayName || 'A friend', avatar: profile?.photoURL },
          'post',
          content.trim() || `Shared ${images.length} photo(s)`,
          `/#post-${postRef.id}`,
          images[0]
        ).catch(() => {});
        addToast('Post published!', 'success');
      }
      navigate('/');
    } catch {
      addToast('Publishing failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Link to="/" className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
            {isStory ? 'Create 24h Story' : 'Create Joint Photo Post'}
          </h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4">
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setIsStory(false)}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              !isStory ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5 shrink-0" />
            <span>Feed Post</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsStory(true);
              if (images.length > 1) setImages([images[0]]);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isStory ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>24h Story</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                {isStory ? 'Story Caption' : 'Post Caption'}
              </label>
              <button
                type="button"
                onClick={handleAiCaption}
                disabled={generatingAi}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                {generatingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>AI Write</span>
              </button>
            </div>
            <textarea
              rows={isStory ? 2 : 4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isStory ? 'Add story caption...' : 'Share updates, multiple photos, or store news...'}
              className="w-full text-xs sm:text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-500 outline-hidden transition-all"
            />
          </div>

          {!isStory && (
            <div className="relative">
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Optional link URL"
                className="w-full text-xs sm:text-sm pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-hidden"
              />
            </div>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group"
                >
                  <img src={img} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
              <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                multiple={!isStory}
                onChange={handleImageSelect}
                className="hidden"
                disabled={uploadProgress !== null}
              />
            </label>

            <button
              type="submit"
              disabled={submitting || uploadProgress !== null}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isStory ? 'Share Story' : 'Publish Post'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

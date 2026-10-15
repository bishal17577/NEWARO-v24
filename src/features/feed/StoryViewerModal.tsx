import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Store, Heart, Send, Edit3, Trash2, Check } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { sendPlatformNotification } from '../../lib/notifications';
import { doc, setDoc, addDoc, collection, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Story } from '../../types';

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onStoryViewed?: (storyId: string) => void;
  onStoryDeleted?: (storyId: string) => void;
  onStoryUpdated?: (storyId: string, caption: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  onClose,
  onStoryViewed,
  onStoryDeleted,
  onStoryUpdated,
}) => {
  const { user, profile, isAdmin } = useAuth();
  const { addToast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [likedStories, setLikedStories] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');

  const currentStory = stories[currentIndex];
  const reportedStoryIdsRef = useRef<Set<string>>(new Set());

  const canManageStory =
    !!currentStory &&
    (isAdmin ||
      (user &&
        (currentStory.authorId === user.uid ||
          (currentStory.authorEmail &&
            user.email &&
            currentStory.authorEmail.toLowerCase() === (user.email || '').toLowerCase()))));

  useEffect(() => {
    if (currentStory?.id && !reportedStoryIdsRef.current.has(currentStory.id)) {
      reportedStoryIdsRef.current.add(currentStory.id);
      onStoryViewed?.(currentStory.id);
    }
  }, [currentStory?.id, onStoryViewed]);

  useEffect(() => {
    if (isPaused || editingCaption) return;
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(100, prev + 2));
    }, 100);
    return () => clearInterval(interval);
  }, [currentIndex, isPaused, editingCaption]);

  useEffect(() => {
    if (progress >= 100) {
      if (currentIndex < stories.length - 1) {
        setCurrentIndex((idx) => idx + 1);
        setProgress(0);
      } else {
        onClose();
      }
    }
  }, [progress, currentIndex, stories.length, onClose]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((idx) => idx - 1);
      setProgress(0);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((idx) => idx + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handleSaveCaption = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentStory || !canManageStory) return;
    const clean = captionDraft.trim();
    try {
      await updateDoc(doc(db, 'stories', currentStory.id), { caption: clean });
      onStoryUpdated?.(currentStory.id, clean);
      setEditingCaption(false);
      setIsPaused(false);
      addToast('Story updated!', 'success');
    } catch {
      addToast('Failed to update story', 'error');
    }
  };

  const handleDeleteStory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentStory || !canManageStory) return;
    try {
      await deleteDoc(doc(db, 'stories', currentStory.id));
      onStoryDeleted?.(currentStory.id);
      addToast('Story deleted', 'info');
      if (stories.length <= 1) {
        onClose();
      } else if (currentIndex >= stories.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    } catch {
      addToast('Failed to delete story', 'error');
    }
  };

  const handleLikeStory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      addToast('Please sign in to react to stories', 'info');
      return;
    }
    if (!currentStory) return;
    const isLiked = !likedStories[currentStory.id];
    setLikedStories((prev) => ({ ...prev, [currentStory.id]: !isLiked }));
    if (!isLiked) {
      addToast('Liked story!', 'success');
      if (currentStory.authorId && currentStory.authorId !== user.uid) {
        const actorName = profile?.displayName || user.email?.split('@')[0] || 'A member';
        sendPlatformNotification({
          recipientId: currentStory.authorId,
          recipientEmail: currentStory.authorEmail,
          type: 'like',
          title: `${actorName} liked your story`,
          message: `${actorName} reacted to your story on NEWARO.`,
          link: `/#story-${currentStory.id}`,
          actorId: user.uid,
          actorName,
          actorAvatar: profile?.photoURL || '',
        }).catch(() => {});
      }
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      addToast('Please sign in to reply to stories', 'info');
      return;
    }
    if (!replyText.trim() || !currentStory || sendingReply) return;
    setSendingReply(true);
    const text = replyText.trim();
    setReplyText('');
    try {
      const participants = [user.uid, currentStory.authorId].sort();
      const chatId = `${participants[0]}_${participants[1]}`;
      await setDoc(
        doc(db, 'chats', chatId),
        {
          id: chatId,
          participants,
          participantDetails: {
            [user.uid]: {
              name: profile?.displayName || user.email?.split('@')[0] || 'User',
              avatar: profile?.photoURL || '',
            },
            [currentStory.authorId]: {
              name: currentStory.authorName || 'Seller',
              shopName: currentStory.shopName || '',
            },
          },
          lastMessage: `Replied to story: "${text}"`,
          lastMessageTime: Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId,
        senderId: user.uid,
        senderName: profile?.displayName || 'User',
        senderAvatar: profile?.photoURL || '',
        text: `Replied to story: "${text}"`,
        imageUrl: currentStory.imageUrl || '',
        createdAt: Date.now(),
        read: false,
      });
      addToast('Reply sent!', 'success');
    } catch {
      addToast('Failed to send reply', 'error');
    } finally {
      setSendingReply(false);
      setIsPaused(false);
    }
  };

  // Keep the page behind from scrolling while a story is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // If a story is deleted, keep the index inside the list
  useEffect(() => {
    if (stories.length > 0 && currentIndex > stories.length - 1) {
      setCurrentIndex(stories.length - 1);
      setProgress(0);
    }
  }, [stories.length, currentIndex]);

  // Keyboard: Esc closes, arrows move between stories
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);
      if (e.key === 'Escape') onClose();
      if (typing) return;
      if (e.key === 'ArrowRight') {
        if (currentIndex < stories.length - 1) {
          setCurrentIndex((i) => i + 1);
          setProgress(0);
        } else onClose();
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
        setProgress(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, stories.length, onClose]);

  if (!currentStory) return null;
  const isCurrentLiked = !!likedStories[currentStory.id];
  const mediaUrl = currentStory.imageUrl || currentStory.mediaUrl || '';
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl);
  const holdStart = () => setIsPaused(true);
  const holdEnd = () => {
    if (!editingCaption && !replyText) setIsPaused(false);
  };

  const viewer = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center select-none overflow-hidden"
      style={{ height: '100dvh', width: '100vw' }}
      onClick={onClose}
      role="dialog"
      aria-label="Story viewer"
    >
      {/* Soft backdrop built from the story itself, never a flat black page */}
      <div className="absolute inset-0 bg-slate-300 dark:bg-slate-800" aria-hidden />
      {mediaUrl && !isVideo && (
        <img
          src={mediaUrl}
          alt=""
          aria-hidden
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-60 pointer-events-none"
        />
      )}
      <div className="absolute inset-0 bg-white/20 dark:bg-slate-900/30 backdrop-blur-sm" aria-hidden />

      {/* Card: header / photo / footer stacked in a column so nothing can overlap */}
      <div
        className="relative z-10 w-full sm:max-w-[420px] flex flex-col overflow-hidden sm:rounded-3xl shadow-2xl ring-1 ring-white/30 bg-slate-900/55 backdrop-blur-xl text-white"
        style={{ height: 'min(100dvh, 860px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-3 pt-3 pb-2 space-y-2.5" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <div className="flex gap-1">
            {stories.map((st, idx) => (
              <div key={st.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{ width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%', transition: 'width 100ms linear' }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Link
              to={`/profile/${currentStory.authorId}`}
              className="flex items-center gap-2.5 group min-w-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-9 h-9 rounded-full bg-blue-600 border-2 border-white/90 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                {currentStory.authorAvatar ? (
                  <img
                    src={currentStory.authorAvatar}
                    alt={currentStory.authorName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (currentStory.authorName || 'N').charAt(0).toUpperCase()
                )}
              </div>
              <p className="font-semibold text-sm flex items-center gap-1.5 min-w-0 group-hover:underline">
                <span className="truncate">{currentStory.authorName}</span>
                {currentStory.shopName && (
                  <span className="text-[10px] bg-blue-600/80 px-1.5 py-0.5 rounded font-normal flex items-center gap-0.5 shrink-0">
                    <Store className="w-2.5 h-2.5" /> {currentStory.shopName}
                  </span>
                )}
              </p>
            </Link>

            <div className="flex items-center gap-1.5 shrink-0">
              {canManageStory && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCaptionDraft(currentStory.caption || '');
                      setEditingCaption(true);
                      setIsPaused(true);
                    }}
                    className="p-2 rounded-full bg-white/15 hover:bg-blue-600 transition-colors"
                    title="Edit story caption"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDeleteStory}
                    className="p-2 rounded-full bg-white/15 hover:bg-rose-600 transition-colors"
                    title="Delete story"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/15 hover:bg-white/30 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Photo area takes whatever space is left. The media never covers the header or footer. */}
        <div
          className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden"
          onPointerDown={holdStart}
          onPointerUp={holdEnd}
          onPointerLeave={holdEnd}
        >
          {!mediaUrl ? (
            <div className="px-8 text-center text-xl font-semibold leading-relaxed">
              {currentStory.caption || 'This story has no photo or video.'}
            </div>
          ) : isVideo ? (
            <video
              key={currentStory.id}
              src={mediaUrl}
              className="max-h-full max-w-full object-contain"
              autoPlay
              muted
              playsInline
              loop
              controls={false}
              onError={() => addToast('This story video could not be loaded.', 'error')}
            />
          ) : (
            <img
              key={currentStory.id}
              src={mediaUrl}
              alt={currentStory.caption || 'Story'}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain"
              onError={() => addToast('This story photo could not be loaded.', 'error')}
            />
          )}
          <div className="absolute inset-y-0 left-0 w-1/3 cursor-pointer" onClick={handlePrev} />
          <div className="absolute inset-y-0 right-0 w-1/3 cursor-pointer" onClick={handleNext} />
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/35 hover:bg-black/55 hidden sm:flex"
              aria-label="Previous story"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {currentIndex < stories.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/35 hover:bg-black/55 hidden sm:flex"
              aria-label="Next story"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="shrink-0 px-3 pt-2 space-y-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          {editingCaption ? (
            <form
              onSubmit={handleSaveCaption}
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 rounded-2xl bg-white/15 border border-white/25 flex items-center gap-2"
            >
              <input
                type="text"
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                placeholder="Update story caption..."
                autoFocus
                className="flex-1 min-w-0 bg-transparent text-white placeholder-white/60 text-sm outline-hidden"
              />
              <button type="submit" className="p-1.5 bg-blue-600 text-white rounded-xl" title="Save">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingCaption(false);
                  setIsPaused(false);
                }}
                className="p-1.5 bg-white/15 text-white rounded-xl"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            currentStory.caption &&
            mediaUrl && (
              <p className="px-3 py-2 rounded-2xl bg-white/12 text-[13px] leading-relaxed line-clamp-3 break-words">
                {currentStory.caption}
              </p>
            )
          )}

          <div className="flex items-center gap-2">
            <form
              onSubmit={handleSendReply}
              className="flex-1 min-w-0 flex items-center bg-white/15 rounded-2xl border border-white/25 px-3 py-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setIsPaused(true)}
                onBlur={() => !replyText && setIsPaused(false)}
                placeholder={`Reply to ${currentStory.authorName}...`}
                className="w-full min-w-0 bg-transparent text-white placeholder-white/60 text-sm outline-hidden"
              />
              <button
                type="submit"
                disabled={sendingReply || !replyText.trim()}
                className="p-1 text-white hover:text-blue-300 disabled:opacity-40 transition-colors shrink-0"
                aria-label="Send reply"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <button
              onClick={handleLikeStory}
              className={`p-3 rounded-2xl border transition-all shrink-0 ${
                isCurrentLiked ? 'bg-rose-600 border-rose-500 text-white' : 'bg-white/15 border-white/25 text-white hover:bg-rose-500/40'
              }`}
              title="Like story"
            >
              <Heart className={`w-4 h-4 ${isCurrentLiked ? 'fill-white' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  return createPortal(viewer, document.body);
};

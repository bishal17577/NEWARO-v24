import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Send,
  Image as ImageIcon,
  Paperclip,
  Link2,
  Store,
  MessageSquare,
  Loader2,
  ArrowLeft,
  Search,
  Pin,
  Trash2,
  MapPin,
  Banknote,
  CheckCheck,
  Smile,
  X,
  ExternalLink,
  Share2,
  ShoppingBag,
  UserPlus,
  FolderOpen,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  limit,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { uploadToImgBB, createFastLocalPreview } from '../../lib/imgbb';
import { triggerHaptic } from '../../lib/haptics';
import { sendPlatformNotification, canSendChatEmailNow } from '../../lib/notifications';
import { ChatConversation, ChatMessage, UserProfile, Shop, ChatProductSnippet } from '../../types';

const QUICK_REPLIES = [
  'Is this available?',
  'What is the best price?',
  'Cash on Delivery available?',
  'When can you deliver?',
  'Can you share more photos?',
];

const REACTION_ICONS = ['👍', '❤️', '🔥', '🎉', '😊', '🙏'];

export const ChatPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetUserId = searchParams.get('userId');
  const targetShopId = searchParams.get('shopId');
  const targetShopName = searchParams.get('shopName');
  const targetShopOwnerEmail = searchParams.get('shopOwnerEmail');
  const productTitleParam = searchParams.get('productTitle');
  const initialDraft = searchParams.get('draft');

  const { user, profile, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [directoryUsers, setDirectoryUsers] = useState<UserProfile[]>([]);
  const [directoryShops, setDirectoryShops] = useState<Shop[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'pinned' | 'stores' | 'people' | 'requests'>('all');
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaGalleryTab, setMediaGalleryTab] = useState<'media' | 'links'>('media');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerNote, setOfferNote] = useState('');

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');

  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; title?: string } | null>(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [activeProductSnippet, setActiveProductSnippet] = useState<ChatProductSnippet | null>(null);

  const [pinnedChats, setPinnedChats] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`newaro_pinned_chats_${user?.uid || 'guest'}`) || '{}');
    } catch {
      return {};
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialDraft) setText(initialDraft);
    if (productTitleParam) {
      setActiveProductSnippet({
        id: 'inquiry',
        name: productTitleParam,
        price: 0,
        shopName: targetShopName || undefined,
      });
    }
  }, [initialDraft, productTitleParam, targetShopName]);

  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        const [uSnap, sSnap] = await Promise.allSettled([
          getDocs(query(collection(db, 'users'), limit(50))),
          getDocs(query(collection(db, 'shops'), limit(50))),
        ]);
        if (uSnap.status === 'fulfilled') {
          const list = uSnap.value.docs
            .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
            .filter((u) => u.uid !== user?.uid);
          setDirectoryUsers(list);
        }
        if (sSnap.status === 'fulfilled') {
          const sList = sSnap.value.docs.map((d) => ({ id: d.id, ...d.data() } as Shop));
          setDirectoryShops(sList);
        }
      } catch {}
    };
    fetchDirectory();
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;

    const qParticipant = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(
      qParticipant,
      async (snapshot) => {
        const map = new Map<string, ChatConversation>();
        snapshot.docs.forEach((d) => {
          map.set(d.id, { id: d.id, ...d.data() } as ChatConversation);
        });

        if (user.email) {
          try {
            const qShopEmail = query(
              collection(db, 'chats'),
              where('shopOwnerEmail', '==', user.email.trim().toLowerCase())
            );
            const emailSnap = await getDocs(qShopEmail);
            emailSnap.docs.forEach((d) => {
              map.set(d.id, { id: d.id, ...d.data() } as ChatConversation);
            });
          } catch {}
        }

        const convos = Array.from(map.values()).sort(
          (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
        );
        setConversations(convos);

        if (targetUserId && targetUserId !== user.uid) {
          const existing = convos.find(
            (c) => c.participants.includes(targetUserId) || (targetShopId && c.shopId === targetShopId)
          );
          if (existing) {
            setSelectedChat(existing);
          } else {
            initConversation(
              targetUserId,
              targetShopName || undefined,
              targetShopId || undefined,
              targetShopOwnerEmail || undefined
            );
          }
        }
      },
      () => {}
    );

    return () => unsubscribe();
  }, [user?.uid, user?.email, targetUserId, targetShopId]);

  const initConversation = async (
    otherUid: string,
    shopName?: string,
    shopId?: string,
    shopOwnerEmail?: string
  ) => {
    if (!user) return;
    const participants = [user.uid, otherUid].sort();
    const chatId = `${participants[0]}_${participants[1]}`;

    let otherName = shopName || 'Member';
    let otherAvatar = '';
    let resolvedShopOwnerEmail = shopOwnerEmail || '';

    try {
      if (shopId) {
        const sDoc = await getDoc(doc(db, 'shops', shopId));
        if (sDoc.exists()) {
          const sData = sDoc.data() as Shop;
          otherName = sData.name || otherName;
          otherAvatar = sData.logoUrl || '';
          resolvedShopOwnerEmail = sData.ownerEmail || resolvedShopOwnerEmail;
        }
      }
      const userDoc = await getDoc(doc(db, 'users', otherUid));
      if (userDoc.exists()) {
        const uData = userDoc.data() as UserProfile;
        if (!shopName) otherName = uData.displayName || otherName;
        if (!otherAvatar) otherAvatar = uData.photoURL || '';
        if (!resolvedShopOwnerEmail && uData.email) resolvedShopOwnerEmail = uData.email;
      }
    } catch {}

    const newConvo: any = {
      id: chatId,
      participants,
      participantDetails: {
        [user.uid]: {
          name: profile?.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          avatar: profile?.photoURL || '',
          online: true,
        },
        [otherUid]: {
          name: otherName,
          email: resolvedShopOwnerEmail || '',
          avatar: otherAvatar,
          shopName: shopName || '',
          shopId: shopId || '',
          online: true,
        },
      },
      lastMessage: 'Conversation started',
      lastMessageTime: Date.now(),
      updatedAt: Date.now(),
    };

    if (shopId) newConvo.shopId = shopId;
    if (resolvedShopOwnerEmail) newConvo.shopOwnerEmail = resolvedShopOwnerEmail.toLowerCase();

    try {
      await setDoc(doc(db, 'chats', chatId), newConvo, { merge: true });
      setSelectedChat(newConvo as ChatConversation);
    } catch {
      setSelectedChat(newConvo as ChatConversation);
    }
  };

  useEffect(() => {
    if (!selectedChat) return;

    if (user?.uid && selectedChat.unreadCount && selectedChat.unreadCount[user.uid] > 0) {
      updateDoc(doc(db, 'chats', selectedChat.id), {
        [`unreadCount.${user.uid}`]: 0,
      }).catch(() => {});
    }

    const q = query(collection(db, 'chats', selectedChat.id, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      },
      () => {}
    );
    return () => unsubscribe();
  }, [selectedChat?.id]);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const sendMessagePayload = async (payload: {
    text: string;
    imageUrl?: string;
    linkUrl?: string;
    product?: ChatProductSnippet;
    fileName?: string;
  }) => {
    if (!user || !selectedChat || sending) return;
    if (!payload.text.trim() && !payload.imageUrl && !payload.linkUrl && !payload.product) return;

    triggerHaptic('send');
    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      chatId: selectedChat.id,
      senderId: user.uid,
      senderName: profile?.displayName || user.email?.split('@')[0] || 'User',
      senderAvatar: profile?.photoURL || '',
      text: payload.text.trim(),
      imageUrl: payload.imageUrl || '',
      linkUrl: payload.linkUrl || '',
      product: payload.product || (activeProductSnippet ? activeProductSnippet : undefined),
      createdAt: Date.now(),
      read: false,
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const preview =
        payload.text.trim() ||
        (payload.imageUrl ? '📷 Photo' : payload.linkUrl ? '🔗 Link' : '🛍️ Product inquiry');

      const chatDocRef = doc(db, 'chats', selectedChat.id);
      const chatUpdate: Record<string, any> = {
        id: selectedChat.id,
        participants: selectedChat.participants,
        lastMessage: preview,
        lastMessageTime: Date.now(),
        updatedAt: Date.now(),
      };
      if (selectedChat.participantDetails) {
        chatUpdate.participantDetails = selectedChat.participantDetails;
      }
      if (selectedChat.shopId) chatUpdate.shopId = selectedChat.shopId;
      if (selectedChat.shopOwnerEmail) chatUpdate.shopOwnerEmail = selectedChat.shopOwnerEmail;

      await setDoc(chatDocRef, chatUpdate, { merge: true });

      const msgData: Record<string, any> = {
        chatId: selectedChat.id,
        senderId: user.uid,
        senderName: profile?.displayName || user.email?.split('@')[0] || 'User',
        senderAvatar: profile?.photoURL || '',
        text: (payload.text || '').trim(),
        createdAt: Date.now(),
        read: false,
        status: 'sent',
      };
      if (payload.imageUrl) msgData.imageUrl = payload.imageUrl;
      if (payload.linkUrl) msgData.linkUrl = payload.linkUrl;
      if (payload.fileName) msgData.fileName = payload.fileName;
      if (payload.product) {
        msgData.product = {
          id: payload.product.id || 'item',
          name: payload.product.name || '',
          price: payload.product.price || 0,
          image: payload.product.image || '',
          shopName: payload.product.shopName || '',
        };
      }

      const msgRef = await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), msgData);

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: msgRef.id, status: 'sent' } : m))
      );

      const recipientId = selectedChat.participants.find((id) => id !== user.uid);
      const prevUnreadCount =
        recipientId && typeof selectedChat.unreadCount?.[recipientId] === 'number'
          ? selectedChat.unreadCount[recipientId]
          : 0;

      const nextUnreadMap = {
        ...(selectedChat.unreadCount || {}),
        [user.uid]: 0,
        ...(recipientId ? { [recipientId]: prevUnreadCount + 1 } : {}),
      };
      setDoc(chatDocRef, { unreadCount: nextUnreadMap }, { merge: true }).catch((err) => console.warn('Unread count update failed:', err));
      setSelectedChat((prev) => (prev ? { ...prev, unreadCount: nextUnreadMap, lastMessage: preview } : prev));

      if (recipientId) {
        const actorName = profile?.displayName || user.email?.split('@')[0] || 'Member';
        const allowEmail = canSendChatEmailNow(selectedChat.id, recipientId, prevUnreadCount);

        sendPlatformNotification({
          recipientId,
          recipientEmail:
            selectedChat.participantDetails?.[recipientId]?.email || selectedChat.shopOwnerEmail,
          type: 'message',
          title: `New message from ${actorName}`,
          message: preview.slice(0, 90),
          link: `/messages?userId=${user.uid}`,
          imageUrl: payload.imageUrl,
          actorId: user.uid,
          actorName,
          actorAvatar: profile?.photoURL || '',
          skipEmail: !allowEmail,
        }).catch(() => {});
      }

      if (activeProductSnippet) {
        setActiveProductSnippet(null);
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      const message = String(error?.message || 'Message could not be sent. Check your connection and conversation permissions.');
      console.error('NEWARO chat send failed:', error);
      addToast(message.includes('permission-denied')
        ? 'You do not have permission to send in this conversation. Refresh or start a new chat.'
        : 'Message failed to send. Please retry.', 'error');
    } finally {
      setSending(false);
      setShowAttachmentMenu(false);
      scrollToBottom();
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!user) {
      addToast('Please sign in to send messages', 'info');
      return;
    }
    const msg = text;
    setText('');
    await sendMessagePayload({ text: msg });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      addToast('Please sign in before uploading and sending a photo.', 'info');
      e.target.value = '';
      return;
    }
    if (!selectedChat) {
      addToast('Open a conversation before sending a photo.', 'info');
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      addToast('Choose an image file.', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 9 * 1024 * 1024) {
      addToast('Image is too large. Choose an image under 9 MB.', 'error');
      e.target.value = '';
      return;
    }

    const localPreviewUrl = createFastLocalPreview(file);
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      chatId: selectedChat.id,
      senderId: user.uid,
      senderName: profile?.displayName || user.email?.split('@')[0] || 'User',
      senderAvatar: profile?.photoURL || '',
      text: '',
      imageUrl: localPreviewUrl,
      createdAt: Date.now(),
      read: false,
      status: 'sending',
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    triggerHaptic('send');
    setUploadingImage(true);
    try {
      const res = await uploadToImgBB(file);
      await sendMessagePayload({ text: '', imageUrl: res.url });
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      addToast('Photo sent!', 'success');
    } catch (error: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      addToast(error?.message || 'Photo upload failed. Check your sign-in and image upload configuration.', 'error');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrlInput.trim()) return;
    const raw = linkUrlInput.trim();
    const clean = raw.startsWith('http') || raw.startsWith('/') ? raw : `https://${raw}`;
    setLinkUrlInput('');
    setLinkModalOpen(false);
    await sendMessagePayload({ text: `Shared link: ${clean}`, linkUrl: clean });
  };

  const handleShareLocation = () => {
    setShowAttachmentMenu(false);
    triggerHaptic('tap');
    if (!navigator.geolocation) {
      sendMessagePayload({
        text: '📍 Delivery Location: Kathmandu Valley, Nepal',
        linkUrl: 'https://maps.google.com/?q=27.7172,85.3240',
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapUrl = `https://maps.google.com/?q=${latitude.toFixed(5)},${longitude.toFixed(5)}`;
        sendMessagePayload({
          text: `📍 Shared Delivery Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          linkUrl: mapUrl,
        });
        addToast('Location shared!', 'success');
      },
      () => {
        sendMessagePayload({
          text: '📍 Delivery Location: Kathmandu, Nepal',
          linkUrl: 'https://maps.google.com/?q=27.7172,85.3240',
        });
      }
    );
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerAmount.trim()) return;
    const formatted = `💰 PRICE OFFER: NPR ${Number(offerAmount).toLocaleString()}${
      offerNote.trim() ? ` · "${offerNote.trim()}"` : ''
    }`;
    setOfferModalOpen(false);
    setOfferAmount('');
    setOfferNote('');
    await sendMessagePayload({ text: formatted });
    addToast('Price offer sent!', 'success');
  };

  const handleTogglePinConversation = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('tap');
    const next = { ...pinnedChats, [chatId]: !pinnedChats[chatId] };
    setPinnedChats(next);
    try {
      localStorage.setItem(`newaro_pinned_chats_${user?.uid || 'guest'}`, JSON.stringify(next));
    } catch {}
    addToast(next[chatId] ? 'Chat pinned' : 'Chat unpinned', 'info');
  };

  const handlePinMessage = async (msg: ChatMessage) => {
    if (!selectedChat) return;
    triggerHaptic('tap');
    const newPinned = !msg.pinned;
    try {
      await updateDoc(doc(db, 'chats', selectedChat.id, 'messages', msg.id), {
        pinned: newPinned,
      });
      await updateDoc(doc(db, 'chats', selectedChat.id), {
        pinnedMessage: newPinned ? msg.text || 'Pinned photo' : '',
      });
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, pinned: newPinned } : m)));
      addToast(newPinned ? 'Message pinned to top' : 'Message unpinned', 'success');
    } catch {}
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!selectedChat) return;
    triggerHaptic('delete');
    try {
      await deleteDoc(doc(db, 'chats', selectedChat.id, 'messages', msgId));
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      addToast('Message deleted', 'info');
    } catch {}
  };

  const handleReactMessage = async (msg: ChatMessage, emoji: string) => {
    if (!selectedChat || !user) return;
    triggerHaptic('reaction');
    const nextReactions = { ...(msg.reactions || {}), [user.uid]: emoji };
    setActiveReactionMsgId(null);
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, reactions: nextReactions } : m)));
    try {
      await updateDoc(doc(db, 'chats', selectedChat.id, 'messages', msg.id), {
        reactions: nextReactions,
      });
    } catch {}
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-blue-600">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Sign in to start chatting</h2>
        <p className="text-xs text-slate-500">
          Message verified local stores, negotiate offers, and get quick delivery updates.
        </p>
        <Link
          to="/auth"
          className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const getOtherParticipant = (convo: ChatConversation) => {
    const otherId = convo.participants.find((id) => id !== user.uid) || user.uid;
    return {
      uid: otherId,
      ...(convo.participantDetails?.[otherId] || { name: 'Member' }),
    };
  };

  const filteredConversations = conversations
    .filter((c) => {
      if (chatFilter === 'pinned' && !pinnedChats[c.id]) return false;
      if (chatFilter === 'requests' && !c.isRequest) return false;
      const other = getOtherParticipant(c);
      if (chatFilter === 'stores' && !other.shopId && !other.shopName) return false;
      if (chatFilter === 'people' && (other.shopId || other.shopName)) return false;
      if (!userSearchQuery.trim()) return true;
      return (
        other.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        other.shopName?.toLowerCase().includes(userSearchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      const aPin = pinnedChats[a.id] ? 1 : 0;
      const bPin = pinnedChats[b.id] ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

  const activeOther = selectedChat ? getOtherParticipant(selectedChat) : null;
  const pinnedMessage = messages.find((m) => m.pinned);
  const sharedMediaList = messages.filter((m) => m.imageUrl);
  const sharedLinksList = messages.filter((m) => m.linkUrl);

  return (
    <div className="w-full max-w-full h-[calc(100dvh-4.75rem)] md:h-[calc(100dvh-5.5rem)] flex flex-col min-h-0 bg-white rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden relative transition-all duration-200">
      <div className="flex-1 flex min-h-0 overflow-hidden w-full relative">
        {/* LEFT SIDEBAR: CONVERSATION LIST */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-100 flex flex-col shrink-0 min-h-0 bg-white ${
            selectedChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3.5 sm:p-4 border-b border-slate-100 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  Messages
                </h1>
                {conversations.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                    {conversations.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setNewChatModalOpen(true);
                }}
                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="New Message"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'pinned', label: 'Pinned' },
                  { id: 'stores', label: 'Stores' },
                  { id: 'people', label: 'People' },
                ] as const
              ).map((tab) => {
                const active = chatFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      triggerHaptic('tap');
                      setChatFilter(tab.id as any);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search chats, stores, people..."
                className="w-full pl-9 pr-8 py-2 bg-slate-100 rounded-xl text-xs outline-hidden focus:bg-white border border-transparent focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
              />
              {userSearchQuery && (
                <button
                  type="button"
                  onClick={() => setUserSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0 overscroll-contain">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((convo) => {
                const other = getOtherParticipant(convo);
                const isSelected = selectedChat?.id === convo.id;
                const isPinned = !!pinnedChats[convo.id];
                const unread = user ? convo.unreadCount?.[user.uid] || 0 : 0;

                return (
                  <div
                    key={convo.id}
                    onClick={() => {
                      triggerHaptic('tap');
                      setSelectedChat(convo);
                      setSearchParams({ userId: other.uid });
                    }}
                    className={`w-full p-3.5 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors relative ${
                      isSelected ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm overflow-hidden">
                        {other.avatar ? (
                          <img
                            src={other.avatar}
                            alt={other.name}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          other.name?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {other.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                          {convo.lastMessageTime
                            ? new Date(convo.lastMessageTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                      {other.shopName && (
                        <p className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 truncate mt-0.5">
                          <Store className="w-3 h-3 shrink-0" />
                          <span className="truncate">{other.shopName}</span>
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-slate-500 truncate min-w-0">
                          {convo.lastMessage || 'Start messaging'}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {isPinned && <Pin className="w-3 h-3 text-blue-600" />}
                          {unread > 0 && (
                            <span className="min-w-[18px] h-4.5 px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleTogglePinConversation(convo.id, e)}
                      className={`p-1 rounded-lg hover:bg-slate-200/80 transition-colors cursor-pointer ${
                        isPinned ? 'text-blue-600' : 'text-slate-300'
                      }`}
                      title={isPinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center space-y-3">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No conversations found</p>
                <p className="text-[11px] text-slate-400">
                  Search people or stores to start a new chat.
                </p>
                <button
                  type="button"
                  onClick={() => setNewChatModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-block cursor-pointer"
                >
                  Start New Chat
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CHAT THREAD */}
        <div
          className={`flex-1 flex flex-col min-h-0 bg-slate-50/50 w-full overflow-hidden ${
            !selectedChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedChat && activeOther ? (
            <>
              <div className="p-3 sm:p-4 border-b border-slate-200/80 bg-white/95 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setSelectedChat(null);
                      setSearchParams({});
                    }}
                    className="md:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-xl shrink-0 cursor-pointer"
                    aria-label="Back to messages"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <Link
                    to={`/profile/${activeOther.uid}`}
                    className="relative shrink-0 group"
                    title="View Profile"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm overflow-hidden">
                      {activeOther.avatar ? (
                        <img
                          src={activeOther.avatar}
                          alt={activeOther.name}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        activeOther.name?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </Link>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/profile/${activeOther.uid}`}
                        className="text-xs sm:text-sm font-extrabold text-slate-900 hover:text-blue-600 transition-colors truncate block"
                      >
                        {activeOther.name}
                      </Link>
                      {activeOther.shopName && (
                        <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded-md hidden sm:inline">
                          Store
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                      <span>Active now</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {(selectedChat.shopId || activeOther.shopId) && (
                    <Link
                      to={`/shops/${selectedChat.shopId || activeOther.shopId}`}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors"
                      title="Visit Store"
                    >
                      <Store className="w-4 h-4" />
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setShowMediaGallery(!showMediaGallery);
                    }}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      showMediaGallery ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Shared Media & Files"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {pinnedMessage && (
                <div className="bg-blue-50/90 border-b border-blue-200/60 px-4 py-2 flex items-center justify-between gap-2 shrink-0 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Pin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-slate-500 font-bold shrink-0">Pinned:</span>
                    <span className="text-slate-800 truncate font-medium">
                      {pinnedMessage.text || 'Pinned photo'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePinMessage(pinnedMessage)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {activeProductSnippet && (
                <div className="mx-3 sm:mx-4 mt-3 bg-white p-3 rounded-2xl border border-blue-100 shadow-xs flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {activeProductSnippet.image ? (
                        <img
                          src={activeProductSnippet.image}
                          alt={activeProductSnippet.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {activeProductSnippet.name}
                      </h4>
                      {activeProductSnippet.price > 0 && (
                        <p className="text-xs font-extrabold text-blue-600 tabular-nums">
                          NPR {(activeProductSnippet.price || 0).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        sendMessagePayload({
                          text: `Hi! I am inquiring about "${activeProductSnippet.name}". Is this available for delivery?`,
                          product: activeProductSnippet,
                        });
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Inquire Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveProductSnippet(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div
                className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 min-h-0 overscroll-contain transition-all"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <MessageSquare className="w-10 h-10 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-700">No messages yet</p>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      Say hello or tap a quick question below to start the conversation!
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === user.uid;
                    const reactionList = m.reactions ? Object.values(m.reactions) : [];

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}
                      >
                        <div className="flex items-end gap-1.5 max-w-[84%] sm:max-w-[75%] min-w-0">
                          {!isMe && (
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden mb-1">
                              {m.senderAvatar ? (
                                <img
                                  src={m.senderAvatar}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                m.senderName?.charAt(0).toUpperCase() || 'U'
                              )}
                            </div>
                          )}

                          <div
                            className={`relative p-3 rounded-2xl text-xs sm:text-sm shadow-2xs break-words overflow-hidden ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-br-xs'
                                : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                            }`}
                          >
                            {m.pinned && (
                              <div
                                className={`text-[10px] font-bold flex items-center gap-1 mb-1 pb-1 border-b ${
                                  isMe
                                    ? 'text-blue-100 border-blue-500/40'
                                    : 'text-blue-600 border-slate-100'
                                }`}
                              >
                                <Pin className="w-3 h-3" /> Pinned
                              </div>
                            )}

                            {m.product && (
                              <div
                                className={`mb-2 p-2.5 rounded-xl border flex items-center gap-2.5 ${
                                  isMe
                                    ? 'bg-blue-700/60 border-blue-400/40 text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                              >
                                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0 overflow-hidden">
                                  {m.product.image ? (
                                    <img
                                      src={m.product.image}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <ShoppingBag className="w-5 h-5" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate">{m.product.name}</p>
                                  {m.product.price > 0 && (
                                    <p className="text-[11px] font-extrabold tabular-nums">
                                      NPR {m.product.price.toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {m.imageUrl && (
                              <div
                                onClick={() =>
                                  setLightboxMedia({
                                    url: m.imageUrl!,
                                    title: m.text || 'Photo preview',
                                  })
                                }
                                className="mb-2 cursor-pointer overflow-hidden rounded-xl border border-black/10 relative group/img bg-slate-100"
                              >
                                <img
                                  src={m.imageUrl}
                                  alt="Shared photo"
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  className="max-h-64 sm:max-h-72 w-full object-cover group-hover/img:scale-102 transition-transform duration-200"
                                />
                                {m.status === 'sending' && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-xs">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Sending...</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {m.linkUrl && (
                              <a
                                href={m.linkUrl}
                                target={m.linkUrl.startsWith('http') ? '_blank' : '_self'}
                                rel="noopener noreferrer"
                                className={`mb-2 p-2.5 rounded-xl flex items-center justify-between gap-2 border transition-opacity hover:opacity-90 ${
                                  isMe
                                    ? 'bg-blue-700/60 border-blue-400/40 text-white'
                                    : 'bg-slate-50 border-slate-200 text-blue-600'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Link2 className="w-4 h-4 shrink-0" />
                                  <span className="text-xs font-bold truncate">{m.linkUrl}</span>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            )}

                            {m.text && (
                              <p className="leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                            )}

                            <div
                              className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                                isMe ? 'text-blue-100' : 'text-slate-400'
                              }`}
                            >
                              <span className="tabular-nums">
                                {new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isMe && (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-100 inline shrink-0" />
                              )}
                            </div>

                            {reactionList.length > 0 && (
                              <div className="absolute -bottom-2.5 right-2 bg-white border border-slate-200 rounded-full px-1.5 py-0.5 text-[10px] shadow-xs flex items-center gap-0.5">
                                {reactionList.slice(0, 3).map((r, i) => (
                                  <span key={i}>{r}</span>
                                ))}
                                {reactionList.length > 3 && (
                                  <span className="text-[9px] font-bold text-slate-500">
                                    +{reactionList.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('tap');
                                setActiveReactionMsgId(activeReactionMsgId === m.id ? null : m.id);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                              title="React"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePinMessage(m)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                              title="Pin Message"
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            {(isMe || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(m.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {activeReactionMsgId === m.id && (
                          <div className="mt-1 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-md flex items-center gap-1.5 z-20 animate-in fade-in zoom-in-95">
                            {REACTION_ICONS.map((em) => (
                              <button
                                key={em}
                                type="button"
                                onClick={() => handleReactMessage(m, em)}
                                className="hover:scale-125 transition-transform text-xs p-1 cursor-pointer"
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      sendMessagePayload({ text: qr });
                    }}
                    className="px-3 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  >
                    {qr}
                  </button>
                ))}
              </div>

              <div className="p-2.5 sm:p-3 bg-white border-t border-slate-200/80 shrink-0 relative z-20">
                {showAttachmentMenu && (
                  <div className="absolute bottom-full left-3 mb-2 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 flex flex-col gap-1 w-48 z-30 animate-in fade-in slide-in-from-bottom-2">
                    <label className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl cursor-pointer transition-colors">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>Send Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachmentMenu(false);
                        setLinkModalOpen(true);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Link2 className="w-4 h-4 text-emerald-600" />
                      <span>Share Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShareLocation}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-rose-600" />
                      <span>Share Location</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachmentMenu(false);
                        setOfferModalOpen(true);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span>Make Price Offer</span>
                    </button>
                  </div>
                )}

                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setShowAttachmentMenu(!showAttachmentMenu);
                    }}
                    className={`p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
                      showAttachmentMenu
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                    title="Attach Photo or Offer"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <label
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors shrink-0"
                    title="Send Photo"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>

                  <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 min-w-0 bg-slate-100 border border-transparent focus:border-blue-500 focus:bg-white rounded-full px-4 py-2 text-xs sm:text-sm outline-hidden transition-all text-slate-900 placeholder:text-slate-400"
                  />

                  <button
                    type="submit"
                    disabled={!text.trim() || sending}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-sm shrink-0 cursor-pointer"
                    title="Send Message"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">Select a Conversation</h2>
              <p className="text-xs text-slate-500 max-w-sm">
                Send photos, links, or price offers directly to verified local stores and community members.
              </p>
              <button
                type="button"
                onClick={() => setNewChatModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Start New Chat
              </button>
            </div>
          )}
        </div>

        {/* RIGHT DRAWER: SHARED MEDIA */}
        {showMediaGallery && selectedChat && activeOther && (
          <div className="w-72 lg:w-80 border-l border-slate-100 bg-white p-4 flex flex-col justify-between shrink-0 min-h-0 z-20">
            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
                <h3 className="text-xs font-extrabold text-slate-900">Shared in Chat</h3>
                <button
                  type="button"
                  onClick={() => setShowMediaGallery(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setMediaGalleryTab('media')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    mediaGalleryTab === 'media' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Photos ({sharedMediaList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMediaGalleryTab('links')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    mediaGalleryTab === 'links' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Links ({sharedLinksList.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {mediaGalleryTab === 'media' ? (
                  sharedMediaList.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {sharedMediaList.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setLightboxMedia({ url: m.imageUrl! })}
                          className="aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-100 cursor-pointer group"
                        >
                          <img
                            src={m.imageUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-8 text-center">No photos shared yet</p>
                  )
                ) : sharedLinksList.length > 0 ? (
                  <div className="space-y-2">
                    {sharedLinksList.map((m) => (
                      <a
                        key={m.id}
                        href={m.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs hover:border-blue-300 transition-colors"
                      >
                        <span className="truncate text-blue-600 font-semibold">{m.linkUrl}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-8 text-center">No links shared yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {newChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>New Conversation</span>
              </h3>
              <button
                type="button"
                onClick={() => setNewChatModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search people or stores..."
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 bg-slate-100 rounded-xl text-xs outline-hidden focus:bg-white border border-transparent focus:border-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 divide-y divide-slate-100">
              <div className="pt-1">
                <p className="text-[11px] font-bold uppercase text-slate-400 mb-1.5">Local Stores</p>
                <div className="space-y-1">
                  {directoryShops
                    .filter(
                      (s) =>
                        !userSearchQuery.trim() ||
                        (s.name || '').toLowerCase().includes(userSearchQuery.toLowerCase())
                    )
                    .slice(0, 5)
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setNewChatModalOpen(false);
                          initConversation(s.ownerId, s.name, s.id, s.ownerEmail);
                        }}
                        className="w-full p-2 rounded-xl hover:bg-blue-50 flex items-center gap-3 text-left transition-colors cursor-pointer"
                      >
                        {s.logoUrl ? (
                          <img
                            src={s.logoUrl}
                            alt=""
                            className="w-9 h-9 rounded-xl object-cover bg-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {s.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{s.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{s.category}</p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[11px] font-bold uppercase text-slate-400 mb-1.5">Members</p>
                <div className="space-y-1">
                  {directoryUsers
                    .filter(
                      (u) =>
                        !userSearchQuery.trim() ||
                        u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                        u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((u) => (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => {
                          setNewChatModalOpen(false);
                          initConversation(u.uid);
                        }}
                        className="w-full p-2 rounded-xl hover:bg-blue-50 flex items-center gap-3 text-left transition-colors cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            u.displayName?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{u.displayName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {offerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSendOffer}
            className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-slate-100"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Make a Price Offer</span>
              </h3>
              <button
                type="button"
                onClick={() => setOfferModalOpen(false)}
                className="p-1 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Offer Amount (NPR) *</label>
              <input
                type="number"
                required
                min={1}
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="e.g. 2500"
                autoFocus
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-blue-500 font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Optional Note</label>
              <input
                type="text"
                value={offerNote}
                onChange={(e) => setOfferNote(e.target.value)}
                placeholder="e.g. Can pick up today with cash"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Send Price Offer
            </button>
          </form>
        </div>
      )}

      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSendShareLink}
            className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-xl border border-slate-100"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-emerald-600" />
                <span>Share Link in Chat</span>
              </h3>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="p-1 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              required
              value={linkUrlInput}
              onChange={(e) => setLinkUrlInput(e.target.value)}
              placeholder="https://... or /shops/..."
              autoFocus
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white"
            />

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Send Link
            </button>
          </form>
        </div>
      )}

      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 select-none"
          onClick={() => setLightboxMedia(null)}
        >
          <div
            className="flex items-center justify-between w-full max-w-4xl text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxMedia(null)}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(lightboxMedia.url);
                  addToast('Image link copied!', 'success');
                }}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                title="Copy Link"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 flex items-center justify-center max-w-4xl max-h-[80vh] w-full p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxMedia.url}
              alt="Full view"
              className="max-h-[78vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
          </div>

          {lightboxMedia.title && (
            <p className="text-xs text-white/80 text-center max-w-md line-clamp-2 pb-2">
              {lightboxMedia.title}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../features/auth/AuthContext';

export function useLiveBadges() {
  const { user } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      setUnreadChats(0);
      return;
    }

    const notifQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubNotif = onSnapshot(
      notifQuery,
      (snapshot) => {
        setUnreadNotifications(snapshot.size);
      },
      () => {}
    );

    const chatQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubChat = onSnapshot(
      chatQuery,
      (snapshot) => {
        let count = 0;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const userUnread = data?.unreadCount?.[user.uid];
          if (typeof userUnread === 'number' && userUnread > 0) {
            count += userUnread;
          }
        });
        setUnreadChats(count);
      },
      () => {}
    );

    return () => {
      unsubNotif();
      unsubChat();
    };
  }, [user?.uid]);

  return {
    unreadNotifications,
    unreadChats,
  };
}

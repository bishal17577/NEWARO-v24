import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signOut as fbSignOut,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile as fbUpdateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../lib/firebase';
import { startCartSync } from '../../lib/cartSync';
import { UserProfile, Shop, UserRole } from '../../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isShopOwner: boolean;
  isSeller: boolean;
  isFreelancer: boolean;
  isBanned: boolean;
  loading: boolean;
  canAccessShop: (shop?: Partial<Shop> | null) => boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    pass: string,
    name: string,
    requestedRole?: UserRole
  ) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  switchRole: (newRole: UserRole) => Promise<void>;
  authorizeAdminWithPasscode: (passcode: string) => Promise<boolean>;
  revokeAdminOverride: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = [
  'bishalxtha17@gmail.com',
  (import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase().trim(),
].filter(Boolean);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('newaro_cached_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('newaro_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [adminOverride, setAdminOverride] = useState<boolean>(() => {
    try {
      return localStorage.getItem('newaro_admin_session') === 'authorized';
    } catch {
      return false;
    }
  });

  const checkIsAdminEmail = (email?: string | null) => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.trim().toLowerCase());
  };

  const persistUser = (u: any | null) => {
    setUser(u);
    try {
      if (u) {
        localStorage.setItem(
          'newaro_cached_user',
          JSON.stringify({
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            emailVerified: u.emailVerified,
          })
        );
      } else {
        localStorage.removeItem('newaro_cached_user');
      }
    } catch {}
  };

  const persistProfile = (p: UserProfile | null) => {
    setProfile(p);
    try {
      if (p) {
        localStorage.setItem('newaro_cached_profile', JSON.stringify(p));
      } else {
        localStorage.removeItem('newaro_cached_profile');
      }
    } catch {}
  };

  const fetchOrCreateProfile = async (firebaseUser: User | any) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const isCurrentAdmin = checkIsAdminEmail(firebaseUser.email);
      const snap = await getDoc(userRef).catch(() => null);

      if (snap && snap.exists()) {
        const data = snap.data() as UserProfile;
        if (isCurrentAdmin && data.role !== 'admin') {
          updateDoc(userRef, { role: 'admin' }).catch(() => {});
          data.role = 'admin';
        }
        persistProfile(data);
      } else {
        const refCode = `NEWARO-${firebaseUser.uid.slice(0, 5).toUpperCase()}`;
        const now = Date.now();
        const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member';
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName,
          photoURL: firebaseUser.photoURL || '',
          role: isCurrentAdmin ? 'admin' : 'user',
          createdAt: now,
          welcomeEmailSentAt: now,
          followersCount: 0,
          followingCount: 0,
          giftCoins: 0,
          referralCode: refCode,
        };
        setDoc(userRef, newProfile).catch(() => {});
        persistProfile(newProfile);
      }
    } catch (err) {
      console.warn('Non-blocking user profile notice:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      startCartSync(currentUser ? currentUser.uid : null);
      if (currentUser) {
        persistUser(currentUser);
        if (!profile || profile.uid !== currentUser.uid) {
          persistProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Member',
            photoURL: currentUser.photoURL || '',
            role: checkIsAdminEmail(currentUser.email) ? 'admin' : 'user',
            giftCoins: 0,
            createdAt: Date.now(),
          });
        }
        fetchOrCreateProfile(currentUser);
      } else {
        // A cached profile is display-only; it must never act as an authenticated Firebase session.
        persistUser(null);
        persistProfile(null);
        setAdminOverride(false);
        try { localStorage.removeItem('newaro_admin_session'); } catch {}
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    if (cred.user) {
      persistUser(cred.user);
      await fetchOrCreateProfile(cred.user);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    if (cred.user) {
      persistUser(cred.user);
      await fetchOrCreateProfile(cred.user);
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    name: string,
    requestedRole: UserRole = 'user'
  ) => {
    const cleanEmail = email.trim();
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    if (cred.user) {
      await fbUpdateProfile(cred.user, { displayName: name });
      sendEmailVerification(cred.user).catch(() => {});
      persistUser({
        ...cred.user,
        displayName: name,
      });

      const isCurrentAdmin = checkIsAdminEmail(cleanEmail);
      const effectiveRole: UserRole = isCurrentAdmin ? 'admin' : requestedRole;
      const refCode = `NEWARO-${cred.user.uid.slice(0, 5).toUpperCase()}`;
      const now = Date.now();
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: name,
        photoURL: '',
        role: effectiveRole,
        isSeller: effectiveRole === 'shop_owner',
        isFreelancer: effectiveRole === 'freelancer',
        createdAt: now,
        welcomeEmailSentAt: now,
        followersCount: 0,
        followingCount: 0,
        giftCoins: 100,
        referralCode: refCode,
      };
      await setDoc(doc(db, 'users', cred.user.uid), newProfile).catch(() => {});
      persistProfile(newProfile);
    }
  };

  const sendPasswordReset = async (email: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) throw new Error('Please enter your email address');
    await sendPasswordResetEmail(auth, cleanEmail);
  };

  const logout = async () => {
    try {
      localStorage.removeItem('newaro_cached_profile');
      localStorage.removeItem('newaro_cached_user');
      localStorage.removeItem('newaro_admin_session');
    } catch {}
    await fbSignOut(auth).catch(() => {});
    setUser(null);
    setProfile(null);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const nextProfile = profile ? { ...profile, ...data } : null;
    if (nextProfile) {
      persistProfile(nextProfile);
    }
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, data, { merge: true }).catch(() => {});
  };

  const switchRole = async (newRole: UserRole) => {
    if (!user) return;
    const isOwner = newRole === 'shop_owner';
    const isFree = newRole === 'freelancer';
    const updates: Partial<UserProfile> = {
      role: newRole,
      isSeller: isOwner || !!profile?.isSeller,
      isFreelancer: isFree || !!profile?.isFreelancer,
    };
    await updateProfileData(updates);
  };

  const authorizeAdminWithPasscode = async (_passcode: string): Promise<boolean> => {
    // Client-side passcodes cannot grant administrator privileges.
    return false;
  };

  const revokeAdminOverride = () => {
    try {
      localStorage.removeItem('newaro_admin_session');
    } catch {}
    setAdminOverride(false);
  };

  const isSuperAdminEmail = (user?.email || '').trim().toLowerCase() === 'bishalxtha17@gmail.com';
  const isAdmin = isSuperAdminEmail;
  const isShopOwner = profile?.role === 'shop_owner' || !!profile?.isSeller;
  const isSeller = isShopOwner;
  const isFreelancer = profile?.role === 'freelancer' || !!profile?.isFreelancer;
  const role: UserRole = isAdmin ? 'admin' : (profile?.role || 'user');
  const isBanned = !!profile?.isBanned && !isAdmin;

  const canAccessShop = (shop?: Partial<Shop> | null): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    if (!shop) return false;
    if (shop.ownerId && shop.ownerId === user.uid) return true;
    if (
      shop.ownerEmail &&
      user.email &&
      shop.ownerEmail.trim().toLowerCase() === user.email.trim().toLowerCase()
    ) {
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
        isShopOwner,
        isSeller,
        isFreelancer,
        isBanned,
        loading,
        canAccessShop,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        logout,
        updateProfileData,
        switchRole,
        authorizeAdminWithPasscode,
        revokeAdminOverride,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

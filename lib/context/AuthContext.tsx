"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firebaseAuth, firestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import type { User, UserRole } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isFirebaseReady: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const DEMO_USER_KEY = "musavir-erp-demo-user";

const demoUsers: Record<string, User> = {
  "ali@musavir.com": {
    id: "demo-musavir",
    ad: "Ali",
    soyad: "Musavir",
    email: "ali@musavir.com",
    rol: "musavir",
    aktif: true,
    createdAt: new Date().toISOString(),
  },
  "selin@musavir.com": {
    id: "demo-personel",
    ad: "Selin",
    soyad: "Kaya",
    email: "selin@musavir.com",
    rol: "personel",
    aktif: true,
    createdAt: new Date().toISOString(),
  },
  "ahmet@akdeniz.com": {
    id: "demo-mukellef",
    ad: "Ahmet",
    soyad: "Yilmaz",
    email: "ahmet@akdeniz.com",
    rol: "mukellef",
    aktif: true,
    createdAt: new Date().toISOString(),
    musteriId: "m1",
  },
};

function inferRole(email: string): UserRole {
  if (email === "ali@musavir.com") return "musavir";
  if (email.endsWith("@musavir.com")) return "personel";
  return "mukellef";
}

function fallbackUserFromEmail(email: string, uid = `demo-${email}`): User {
  const [namePart] = email.split("@");
  const role = inferRole(email);

  return {
    id: uid,
    ad: namePart || "Kullanici",
    soyad: "",
    email,
    rol: role,
    aktif: true,
    createdAt: new Date().toISOString(),
    musteriId: role === "mukellef" ? "m1" : undefined,
  };
}

async function resolveAppUser(firebaseUser: FirebaseUser): Promise<User> {
  if (!firestoreDb) {
    return fallbackUserFromEmail(firebaseUser.email ?? "", firebaseUser.uid);
  }

  const snapshot = await getDoc(doc(firestoreDb, "kullanicilar", firebaseUser.uid));

  if (snapshot.exists()) {
    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as User;
  }

  const fallbackUser = fallbackUserFromEmail(firebaseUser.email ?? "", firebaseUser.uid);
  await setDoc(doc(firestoreDb, "kullanicilar", firebaseUser.uid), fallbackUser, { merge: true });
  return fallbackUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseAuth) {
      const storedUser =
        typeof window !== "undefined" ? window.localStorage.getItem(DEMO_USER_KEY) : null;
      setUser(storedUser ? (JSON.parse(storedUser) as User) : null);
      setLoading(false);
      return;
    }

    return onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setLoading(true);
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        setUser(await resolveAppUser(firebaseUser));
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (firebaseAuth) {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const appUser = await resolveAppUser(credential.user);
      setUser(appUser);
      return appUser;
    }

    const demoUser = demoUsers[email] ?? fallbackUserFromEmail(email);
    window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  }, []);

  const signOut = useCallback(async () => {
    if (firebaseAuth) {
      await firebaseSignOut(firebaseAuth);
    }
    window.localStorage.removeItem(DEMO_USER_KEY);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!firebaseAuth) return;
    await sendPasswordResetEmail(firebaseAuth, email);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isFirebaseReady: isFirebaseConfigured,
      signIn,
      signOut,
      resetPassword,
    }),
    [loading, resetPassword, signIn, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

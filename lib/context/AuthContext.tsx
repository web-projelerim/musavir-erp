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
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firebaseAuth, firestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { withoutUndefined } from "@/lib/firebase/firestore";
import type { KullaniciYetki, Ofis, User, UserRole } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isFirebaseReady: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signInDemo: (email: string) => User;
  signUp: (input: SignUpInput) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const DEMO_USER_KEY = "musavir-erp-demo-user";

interface SignUpInput {
  ad: string;
  soyad: string;
  email: string;
  password: string;
  rol?: UserRole;
  ofisId?: string;
  musteriId?: string;
  davetId?: string;
  yetkiler?: KullaniciYetki[];
}

const demoUsers: Record<string, User> = {
  "ali@musavir.com": {
    id: "demo-musavir",
    ofisId: "ofis-default",
    ad: "Ali",
    soyad: "Musavir",
    email: "ali@musavir.com",
    rol: "musavir",
    aktif: true,
    createdAt: new Date().toISOString(),
  },
  "selin@musavir.com": {
    id: "demo-personel",
    ofisId: "ofis-default",
    ad: "Selin",
    soyad: "Kaya",
    email: "selin@musavir.com",
    rol: "personel",
    aktif: true,
    createdAt: new Date().toISOString(),
  },
  "ahmet@akdeniz.com": {
    id: "demo-mukellef",
    ofisId: "ofis-default",
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
    ofisId: "ofis-default",
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
    const data = snapshot.data() as User;
    return { ...data, id: snapshot.id };
  }

  // No Firestore doc — signUp flow didn't complete. Return an in-memory musavir fallback;
  // signUp's own setDoc is responsible for persisting the real user document.
  const displayName = firebaseUser.displayName ?? "";
  const [ad = "Kullanici", soyad = ""] = displayName.split(" ");
  return {
    id: firebaseUser.uid,
    ofisId: `ofis-${firebaseUser.uid}`,
    ad,
    soyad,
    email: firebaseUser.email ?? "",
    rol: "musavir",
    aktif: true,
    createdAt: new Date().toISOString(),
  };
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

  // Firebase bypass — her zaman localStorage demo kullanıcısını yükler
  const signInDemo = useCallback((email: string) => {
    const demoUser = demoUsers[email] ?? fallbackUserFromEmail(email);
    window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  }, []);

  const signUp = useCallback(async ({
    ad,
    soyad,
    email,
    password,
    rol = "musavir",
    ofisId,
    musteriId,
    davetId,
    yetkiler,
  }: SignUpInput) => {
    const createdAt = new Date().toISOString();

    if (firebaseAuth && firestoreDb) {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateProfile(credential.user, {
        displayName: `${ad} ${soyad}`.trim(),
      });

      // For self-registering müşavirler, generate a unique ofis.
      const resolvedOfisId = rol === "musavir" && !ofisId
        ? `ofis-${credential.user.uid}`
        : (ofisId ?? "ofis-default");

      if (rol === "musavir" && !ofisId) {
        const ofisDoc: Ofis = {
          id: resolvedOfisId,
          unvan: `${ad} ${soyad}`.trim(),
          whatsappDurum: "pasif",
          gibDurum: "pasif",
          createdAt,
        };
        await setDoc(doc(firestoreDb, "ofisler", resolvedOfisId), withoutUndefined(ofisDoc));
      }

      // Firestore undefined değer kabul etmez — sadece tanımlı alanları yaz
      const appUser: User = {
        id: credential.user.uid,
        ofisId: resolvedOfisId,
        ad,
        soyad,
        email,
        rol,
        aktif: true,
        createdAt,
        ...(yetkiler?.length ? { yetkiler } : {}),
        ...(musteriId ? { musteriId } : {}),
        ...(davetId ? { davetId } : {}),
      };

      await setDoc(doc(firestoreDb, "kullanicilar", credential.user.uid), withoutUndefined(appUser));
      setUser(appUser);
      return appUser;
    }

    const demoUser: User = {
      id: `demo-${Date.now()}`,
      ofisId: ofisId ?? "ofis-default",
      ad,
      soyad,
      email,
      rol,
      aktif: true,
      createdAt,
      ...(yetkiler?.length ? { yetkiler } : {}),
      ...(musteriId ? { musteriId } : {}),
      ...(davetId ? { davetId } : {}),
    };
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
      signInDemo,
      signUp,
      signOut,
      resetPassword,
    }),
    [loading, resetPassword, signIn, signInDemo, signOut, signUp, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

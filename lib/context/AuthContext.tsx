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
import { firebaseAuth, firestoreDb } from "@/lib/firebase/client";
import { withoutUndefined } from "@/lib/firebase/firestore";
import type { KullaniciYetki, Ofis, User, UserRole } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (input: SignUpInput) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

/**
 * Firebase yapılandırılmamış (demo mod) olduğunda kullanılan fallback.
 * Yalnızca !firestoreDb durumunda çağrılır — Firestore timeout için KULLANILMAZ.
 */
function demoFallbackUser(email: string, uid: string): User {
  const [namePart] = email.split("@");
  return {
    id: uid,
    ofisId: uid,
    ad: namePart || "Kullanici",
    soyad: "",
    email,
    rol: "musavir",
    aktif: true,
    createdAt: new Date().toISOString(),
  };
}

async function resolveAppUser(firebaseUser: FirebaseUser): Promise<User> {
  // Demo mod: Firebase yapılandırılmamış → tam erişimli fallback (kasıtlı)
  if (!firestoreDb) {
    return demoFallbackUser(firebaseUser.email ?? "", firebaseUser.uid);
  }

  // Firestore yanıt vermezse 6 saniye sonra hata fırlat —
  // timeout durumunda bilinmeyen bir kullanıcıya musavir yetkisi verilmemelidir.
  let snapshot;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("firestore-timeout")), 6000)
    );
    snapshot = await Promise.race([
      getDoc(doc(firestoreDb, "kullanicilar", firebaseUser.uid)),
      timeoutPromise,
    ]);
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === "firestore-timeout";
    throw new Error(
      isTimeout
        ? "Kullanıcı bilgileri yüklenemedi. Lütfen sayfayı yenileyin."
        : "Bağlantı hatası. İnternet bağlantınızı kontrol edin."
    );
  }

  if (snapshot.exists()) {
    const data = snapshot.data() as Omit<User, "id">;
    const appUser: User = {
      ...data,
      id: snapshot.id,
      ofisId: data.ofisId ?? firebaseUser.uid,
    };

    // Güvenlik: aktif değilse oturumu kapat
    if (!appUser.aktif) {
      throw new Error("Hesabınız devre dışı bırakılmıştır. Lütfen müşavirinizle iletişime geçin.");
    }

    // Güvenlik düzeltmesi: rol "mukellef" ama musteriId yoksa bu kullanıcı
    // aslında bir müşavirdir — yanlış rol atanmış. Bellekte ve Firestore'da düzelt.
    if (appUser.rol === "mukellef" && !appUser.musteriId) {
      const corrected: User = { ...appUser, rol: "musavir" };
      setDoc(
        doc(firestoreDb, "kullanicilar", firebaseUser.uid),
        { rol: "musavir" },
        { merge: true }
      ).catch(() => undefined);
      return corrected;
    }

    return appUser;
  }

  // Firestore belgesi yok — signUp akışı henüz tamamlanmamış olabilir.
  const displayName = firebaseUser.displayName ?? "";
  const [ad = "Kullanici", soyad = ""] = displayName.split(" ");
  return {
    id: firebaseUser.uid,
    ofisId: firebaseUser.uid,
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
      console.error("[Auth] Firebase yapılandırılmamış — NEXT_PUBLIC_FIREBASE_* env değişkenlerini kontrol edin");
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
      } catch (err) {
        console.error("[Auth] resolveAppUser hatası:", err);
        await firebaseSignOut(firebaseAuth!).catch(() => undefined);
        setUser(null);
        if (typeof window !== "undefined") {
          const msg = err instanceof Error ? err.message : "Oturum açılamadı.";
          sessionStorage.setItem("auth_error", msg);
        }
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!firebaseAuth) throw new Error("Firebase yapılandırılmamış");
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const appUser = await resolveAppUser(credential.user);
    setUser(appUser);
    return appUser;
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
    if (!firebaseAuth || !firestoreDb) throw new Error("Firebase yapılandırılmamış");
    const createdAt = new Date().toISOString();

    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await updateProfile(credential.user, {
      displayName: `${ad} ${soyad}`.trim(),
    });

    const resolvedOfisId = rol === "musavir" && !ofisId
      ? credential.user.uid
      : (ofisId ?? credential.user.uid);

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
  }, []);

  const signOut = useCallback(async () => {
    if (firebaseAuth) await firebaseSignOut(firebaseAuth);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!firebaseAuth) return;
    await sendPasswordResetEmail(firebaseAuth, email);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, signOut, resetPassword }),
    [loading, resetPassword, signIn, signOut, signUp, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

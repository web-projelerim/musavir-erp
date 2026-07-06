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
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
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
  /** Mevcut şifreyi doğrulayıp yeni şifreye günceller. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Firestore'daki kullanıcı kaydını yeniden okuyup context'i tazeler (örn. tercih değişimi sonrası). */
  refreshUser: () => Promise<void>;
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

/**
 * Kullanıcının rol/ofisId/musteriId bilgisini custom claim'e senkronize eder (B1).
 * Token'da rol claim'i zaten varsa hiçbir şey yapmaz. Yoksa /api/auth/sync-claims
 * çağrılır ve token getIdToken(true) ile tazelenir; böylece güvenlik kuralları
 * bir sonraki istekte Firestore okumadan claim'i kullanır.
 */
async function ensureClaims(firebaseUser: FirebaseUser): Promise<void> {
  const tokenResult = await firebaseUser.getIdTokenResult();
  if (tokenResult.claims.rol) return; // Claim zaten mevcut

  const idToken = await firebaseUser.getIdToken();
  const res = await fetch("/api/auth/sync-claims", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${idToken}`,
    },
    body: "{}",
  });

  if (res.ok) {
    // Yeni claim'lerin token'a yansıması için zorla tazele
    await firebaseUser.getIdToken(true);
  }
}

async function resolveAppUser(firebaseUser: FirebaseUser): Promise<User> {
  // Demo mod: Firebase yapılandırılmamış → tam erişimli fallback.
  // GÜVENLİK: Bu mod yalnızca geliştirme ortamında çalışır. Production build'de
  // Firebase yapılandırması eksikse hata veririz; kimseye otomatik musavir
  // yetkisi verilmez.
  if (!firestoreDb) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Uygulama yapılandırması eksik (NEXT_PUBLIC_FIREBASE_*). Lütfen sistem yöneticisiyle iletişime geçin."
      );
    }
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

    // Güvenlik (B3): Davetle katılan kullanıcılar (davetId taşıyanlar) e-postalarını
    // doğrulamış olmalı. Davet e-postasını bilen biri, adresi sahiplenmeden hesap
    // açıp daveti kullanamamalı. Self-bootstrap müşavirler için zorunlu değildir
    // (kendi verilerinden başkasına erişemezler), ancak onlar da ayarlardan
    // doğrulama yapmaya teşvik edilir.
    if (appUser.davetId && !firebaseUser.emailVerified) {
      throw new Error(
        "E-posta adresinizi doğrulamanız gerekiyor. Gelen kutunuzdaki doğrulama bağlantısına tıklayın, ardından tekrar giriş yapın."
      );
    }

    // GÜVENLİK: rol "mukellef" ama musteriId yoksa bu bozuk/eksik bir kayıttır.
    // Eskiden burada istemci kullanıcıyı otomatik "musavir"e terfi ettiriyordu —
    // bu bir yetki yükseltme (privilege escalation) açığıydı ve kaldırıldı.
    // Rol düzeltmesi yalnızca müşavir tarafından (kullanıcı yönetimi ekranı)
    // veya backend/Admin SDK üzerinden yapılmalıdır.
    if (appUser.rol === "mukellef" && !appUser.musteriId) {
      throw new Error(
        "Hesabınız bir mükellef kaydıyla eşleştirilmemiş. Lütfen müşavirinizle iletişime geçin."
      );
    }

    return appUser;
  }

  // Firestore belgesi yok — signUp akışı yarıda kalmış olabilir.
  // Firestore'a yaz ki güvenlik kuralları (userDoc) düzgün çalışsın.
  const displayName = firebaseUser.displayName ?? "";
  const [ad = "Kullanici", soyad = ""] = displayName.split(" ");
  const fallbackUser: User = {
    id: firebaseUser.uid,
    ofisId: firebaseUser.uid,
    ad,
    soyad,
    email: firebaseUser.email ?? "",
    rol: "musavir",
    aktif: true,
    createdAt: new Date().toISOString(),
  };
  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "kullanicilar", firebaseUser.uid), withoutUndefined(fallbackUser));
    } catch (e) {
      console.error("[Auth] kullanicilar fallback yazılamadı:", e);
    }
    try {
      const ofisSnap = await getDoc(doc(firestoreDb, "ofisler", firebaseUser.uid));
      if (!ofisSnap.exists()) {
        const ofisDoc: Ofis = {
          id: firebaseUser.uid,
          unvan: displayName || "Yeni Ofis",
          whatsappDurum: "pasif",
          gibDurum: "pasif",
          createdAt: fallbackUser.createdAt,
        };
        await setDoc(doc(firestoreDb, "ofisler", firebaseUser.uid), withoutUndefined(ofisDoc));
      }
    } catch (e) {
      console.error("[Auth] ofisler fallback yazılamadı:", e);
    }
  }
  return fallbackUser;
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
        // Önce kullanıcıyı çöz ve UI'ı aç — giriş kritik yolu buna bağlıdır.
        setUser(await resolveAppUser(firebaseUser));
        // B1: Claim senkronizasyonu (sync-claims fetch + zorunlu token tazeleme)
        // kritik yolu BLOKLAMAZ. Güvenlik kuralları claim yoksa kullanıcı
        // dokümanına düşer (currentRole/currentOfisId fallback), bu yüzden oturum
        // claim olmadan da doğru çalışır. Arka planda tazeleyip sonraki isteklerde
        // hızlı yola (Firestore okumasız) geçeriz. Bu, doğru şifreyle girişin
        // dashboard'a düşmeden önce token refresh'i beklemesini önler.
        void ensureClaims(firebaseUser).catch((e) =>
          console.warn("[Auth] claim senkronizasyonu atlandı:", e)
        );
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

    // E-posta doğrulama linki gönder (best-effort — başarısız olursa kayıt yine tamamlanır,
    // kullanıcı ayarlardan tekrar isteyebilir).
    try {
      await sendEmailVerification(credential.user);
    } catch (e) {
      console.warn("[Auth] Doğrulama e-postası gönderilemedi:", e);
    }

    const resolvedOfisId = rol === "musavir" && !ofisId
      ? credential.user.uid
      : (ofisId ?? credential.user.uid);

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
    // Davetli kullanıcı (davetId taşıyan) e-postasını doğrulamadan uygulamaya
    // giremez. Oturumu açmıyoruz; hesabı oluşturup çıkış yapıyoruz. Kullanıcı
    // e-postasını doğrulayıp giriş yapınca resolveAppUser onu içeri alır.
    if (davetId) {
      await firebaseSignOut(firebaseAuth);
      return appUser;
    }

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

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!firebaseAuth) throw new Error("Firebase yapılandırılmamış");
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error("Oturum açık değil. Lütfen yeniden giriş yapın.");
    }
    // Mevcut şifreyle yeniden doğrulama — güvenlik gereği
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = firebaseAuth?.currentUser;
    if (!currentUser) return;
    try {
      setUser(await resolveAppUser(currentUser));
    } catch (err) {
      console.warn("[Auth] refreshUser hatası:", err);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, signOut, resetPassword, changePassword, refreshUser }),
    [changePassword, loading, refreshUser, resetPassword, signIn, signOut, signUp, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

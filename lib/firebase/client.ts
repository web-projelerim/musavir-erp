import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
];

export const isFirebaseConfigured = requiredConfig.every(Boolean);

let app: FirebaseApp | null = null;

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
}

export const firebaseApp = app;
export const firebaseAuth: Auth | null = app ? getAuth(app) : null;
export const firestoreDb: Firestore | null = app ? getFirestore(app) : null;
export const firebaseStorage: FirebaseStorage | null = app ? getStorage(app) : null;

/**
 * Firebase App Check — bot/kötüye kullanım koruması.
 * NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY tanımlıysa reCAPTCHA v3 sağlayıcısıyla
 * etkinleştirilir. Yalnızca tarayıcıda ve site key varsa çalışır; aksi halde
 * sessizce atlanır (App Check zorunlu değilse uygulama çalışmaya devam eder).
 *
 * Not: App Check'in gerçek koruma sağlaması için Firebase Console'da
 * "enforce" edilmesi gerekir. Geliştirmede FIREBASE_APPCHECK_DEBUG_TOKEN
 * kullanılabilir.
 */
if (app && typeof window !== "undefined") {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY;
  if (siteKey) {
    // Dinamik import: App Check paketi yalnızca gerektiğinde yüklenir
    import("firebase/app-check")
      .then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
        try {
          initializeAppCheck(app!, {
            provider: new ReCaptchaV3Provider(siteKey),
            isTokenAutoRefreshEnabled: true,
          });
        } catch (err) {
          console.warn("[AppCheck] başlatılamadı:", err);
        }
      })
      .catch((err) => console.warn("[AppCheck] modül yüklenemedi:", err));
  }
}

/** Mevcut kullanıcının Firebase ID token'ını döner. Demo modunda null. */
export async function getIdToken(): Promise<string | null> {
  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken();
  } catch {
    return null;
  }
}

/** API fetch çağrıları için Authorization header'lı headers objesi döner. */
export async function authHeaders(): Promise<HeadersInit> {
  const token = await getIdToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

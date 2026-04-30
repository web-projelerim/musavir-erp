/**
 * Tüm uygulama genelinde hata mesajlarını kullanıcı dostu Türkçeye çevirir.
 * Teknik terimler (Firebase, Firestore, permission-denied vb.) kullanıcıya ASLA gösterilmez.
 */

// ─── Auth hataları ────────────────────────────────────────────────────────────

const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  "auth/invalid-credential":
    "E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.",
  "auth/user-not-found":
    "Bu e-posta adresiyle kayıtlı bir hesap bulunamadı. Kayıt olmak ister misiniz?",
  "auth/wrong-password":
    "Şifre hatalı. Lütfen tekrar deneyin veya \"Şifremi Unuttum\" seçeneğini kullanın.",
  "auth/invalid-email":
    "Geçersiz e-posta adresi formatı. Lütfen doğru bir e-posta adresi girin.",
  "auth/user-disabled":
    "Bu hesap devre dışı bırakılmış. Lütfen yöneticinizle iletişime geçin.",
  "auth/too-many-requests":
    "Çok fazla başarısız giriş denemesi yapıldı. Güvenlik için hesap geçici olarak kilitlendi. Birkaç dakika sonra tekrar deneyin.",
  "auth/network-request-failed":
    "İnternet bağlantısı kurulamadı. Bağlantınızı kontrol edip tekrar deneyin.",
  "auth/operation-not-allowed":
    "Bu giriş yöntemi şu an aktif değil. Lütfen yöneticinizle iletişime geçin.",
  "auth/account-exists-with-different-credential":
    "Bu e-posta adresi farklı bir giriş yöntemiyle kayıtlı. Farklı bir yöntemle giriş yapın.",
  "auth/requires-recent-login":
    "Bu işlem için yeniden giriş yapmanız gerekiyor. Lütfen çıkış yapıp tekrar giriş yapın.",
  "auth/popup-closed-by-user":
    "Giriş penceresi kapatıldı. Lütfen tekrar deneyin.",
  "auth/expired-action-code":
    "Bu bağlantının süresi dolmuş. Yeni bir şifre sıfırlama bağlantısı talep edin.",
  "auth/invalid-action-code":
    "Bu bağlantı geçersiz veya daha önce kullanılmış. Yeni bir bağlantı talep edin.",
  "auth/missing-email":
    "E-posta adresi girilmedi. Lütfen e-posta adresinizi girin.",
  "auth/email-already-in-use":
    "Bu e-posta adresi zaten kullanımda. Giriş yapmayı deneyin veya farklı bir e-posta kullanın.",
  "auth/weak-password":
    "Şifre çok zayıf. En az 6 karakter, harf ve rakam içermeli.",
  "auth/missing-continue-uri":
    "Şifre sıfırlama işlemi tamamlanamadı. Lütfen tekrar deneyin.",
  "auth/invalid-continue-uri":
    "Geçersiz bağlantı. Lütfen yöneticinizle iletişime geçin.",
  "auth/internal-error":
    "Beklenmedik bir sorun oluştu. Lütfen sayfayı yenileyip tekrar deneyin.",
  "auth/timeout":
    "İşlem zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.",
};

export function parseFirebaseAuthError(error: unknown): string {
  if (!error) return "Bilinmeyen bir hata oluştu.";
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: string }).code;
    if (FIREBASE_AUTH_MESSAGES[code]) return FIREBASE_AUTH_MESSAGES[code];
  }
  return "Beklenmedik bir sorun oluştu. Lütfen tekrar deneyin.";
}

export function parseFirebaseSignUpError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "auth/email-already-in-use"
  ) {
    return "Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin ya da \"Şifremi Unuttum\" ile şifrenizi sıfırlayın.";
  }
  return parseFirebaseAuthError(error);
}

export function parseFirebaseResetError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "auth/user-not-found"
  ) {
    return "Bu e-posta adresiyle kayıtlı bir hesap bulunamadı. Adresi kontrol edin.";
  }
  return parseFirebaseAuthError(error);
}

// ─── Veritabanı / Sunucu hataları ────────────────────────────────────────────

const FIRESTORE_ERROR_MESSAGES: Record<string, string> = {
  "permission-denied":
    "Bu işlem için yetkiniz yok. Yöneticinizle iletişime geçin.",
  "unavailable":
    "Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edip tekrar deneyin.",
  "quota-exceeded":
    "Sistem şu an yoğun. Birkaç dakika sonra tekrar deneyin.",
  "resource-exhausted":
    "Sistem şu an yoğun. Birkaç dakika sonra tekrar deneyin.",
  "not-found":
    "Kayıt bulunamadı. Sayfayı yenileyip tekrar deneyin.",
  "already-exists":
    "Bu kayıt zaten mevcut.",
  "deadline-exceeded":
    "İşlem zaman aşımına uğradı. Tekrar deneyin.",
  "cancelled":
    "İşlem iptal edildi. Tekrar deneyin.",
  "internal":
    "Beklenmedik bir sorun oluştu. Lütfen tekrar deneyin.",
  "unauthenticated":
    "Oturumunuz sona ermiş. Lütfen yeniden giriş yapın.",
  "failed-precondition":
    "İşlem şu an yapılamıyor. Sayfayı yenileyip tekrar deneyin.",
  "aborted":
    "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
  "out-of-range":
    "Geçersiz veri. Girdiğiniz bilgileri kontrol edin.",
  "data-loss":
    "Beklenmedik bir sorun oluştu. Lütfen tekrar deneyin.",
  "unknown":
    "Beklenmedik bir sorun oluştu. Lütfen tekrar deneyin.",
};

/**
 * Firestore / sunucu hatalarını kullanıcı dostu Türkçeye çevirir.
 * Teknik terim veya kod içermez.
 */
export function parseFirestoreError(error: unknown): string {
  if (!error) return "Beklenmedik bir sorun oluştu. Lütfen tekrar deneyin.";

  if (typeof error === "object" && error !== null && "code" in error) {
    const raw = (error as { code: string }).code;
    // Firestore hata kodları "firestore/permission-denied" veya "permission-denied" formatında gelebilir
    const code = raw.includes("/") ? raw.split("/").pop()! : raw;
    if (FIRESTORE_ERROR_MESSAGES[code]) return FIRESTORE_ERROR_MESSAGES[code];
  }

  // Ağ hatası tespiti (fetch/network layer)
  if (isNetworkError(error)) {
    return "İnternet bağlantınızı kontrol edip tekrar deneyin.";
  }

  return "Beklenmedik bir sorun oluştu. Lütfen tekrar deneyin.";
}

// ─── Dosya yükleme hataları ───────────────────────────────────────────────────

const STORAGE_ERROR_MESSAGES: Record<string, string> = {
  "storage/unauthorized":
    "Bu dosyayı yükleme yetkiniz yok. Yöneticinizle iletişime geçin.",
  "storage/canceled":
    "Yükleme iptal edildi.",
  "storage/unknown":
    "Dosya yüklenirken bir sorun oluştu. Tekrar deneyin.",
  "storage/quota-exceeded":
    "Depolama alanı doldu. Yöneticinizle iletişime geçin.",
  "storage/invalid-checksum":
    "Dosya bozuk görünüyor. Farklı bir dosya seçip tekrar deneyin.",
  "storage/retry-limit-exceeded":
    "Yükleme birkaç kez denendi ancak başarılı olmadı. İnternet bağlantınızı kontrol edip tekrar deneyin.",
  "storage/invalid-format":
    "Desteklenmeyen dosya formatı.",
  "storage/object-not-found":
    "Dosya bulunamadı. Sayfayı yenileyip tekrar deneyin.",
};

/**
 * Dosya yükleme hatalarını kullanıcı dostu Türkçeye çevirir.
 */
export function parseStorageError(error: unknown): string {
  if (!error) return "Dosya yüklenirken bir sorun oluştu. Tekrar deneyin.";

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: string }).code;
    if (STORAGE_ERROR_MESSAGES[code]) return STORAGE_ERROR_MESSAGES[code];
  }

  if (isNetworkError(error)) {
    return "İnternet bağlantınızı kontrol edip tekrar deneyin.";
  }

  return "Dosya yüklenirken bir sorun oluştu. Tekrar deneyin.";
}

// ─── GİB API hataları ─────────────────────────────────────────────────────────

/**
 * GİB senkronizasyon hatalarını kullanıcı dostu Türkçeye çevirir.
 * HTTP status kodları ve ağ hatalarını kapsar.
 */
export function parseGibSyncError(error: unknown): string {
  if (!error) return "GİB sistemine bağlanılamadı. Tekrar deneyin.";

  const msg = error instanceof Error ? error.message.toLowerCase() : "";

  if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("invalid credential")) {
    return "GİB sistemine giriş yapılamadı. Kimlik bilgilerinizi kontrol edin.";
  }
  if (msg.includes("429") || msg.includes("too many")) {
    return "GİB sistemleri şu an yoğun. Birkaç dakika sonra tekrar deneyin.";
  }
  if (msg.includes("503") || msg.includes("502") || msg.includes("service unavailable")) {
    return "GİB sistemleri geçici olarak kullanım dışı. Lütfen daha sonra tekrar deneyin.";
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return "GİB sistemine bağlantı zaman aşımına uğradı. Tekrar deneyin.";
  }

  if (isNetworkError(error)) {
    return "İnternet bağlantınızı kontrol edip tekrar deneyin.";
  }

  return parseFirestoreError(error);
}

// ─── Yardımcı ─────────────────────────────────────────────────────────────────

/** Ağ/bağlantı kaynaklı hata olup olmadığını tespit eder. */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("internet") ||
    msg.includes("offline") ||
    msg.includes("net::err") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound")
  );
}

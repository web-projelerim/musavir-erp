import type { User } from "@/lib/types";
import { hasPermission } from "@/lib/utils/permissions";

/**
 * VKN (10 hane) / TCKN (11 hane) maskeleme.
 *
 * Numaranın yalnızca son 4 hanesini gösterir, kalanı • ile maskeler.
 * Örn: "12345678901" → "•••••••8901", "1234567890" → "••••••7890".
 *
 * Rakam dışı içerik veya boş değer olduğu gibi döner (zaten hassas değil).
 */
export function maskVknTckn(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return value; // maskelenecek kadar uzun değil
  const gorunen = digits.slice(-4);
  return "•".repeat(digits.length - 4) + gorunen;
}

/**
 * Kullanıcı VKN/TCKN'yi açık görebilir mi?
 *
 * - musavir: her zaman evet
 * - mukellef: kendi verisi olduğu için evet (kendi panelinde)
 * - personel: yalnızca "vkn_goruntule" yetkisi varsa evet
 */
export function canViewVknTckn(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.rol === "musavir") return true;
  if (user.rol === "mukellef") return true;
  return hasPermission(user, "vkn_goruntule");
}

/**
 * Kullanıcının yetkisine göre VKN/TCKN'yi açık veya maskeli döndürür.
 * UI'da doğrudan bu fonksiyon çağrılır.
 */
export function displayVknTckn(
  value: string | null | undefined,
  user: User | null | undefined
): string {
  if (!value) return "";
  return canViewVknTckn(user) ? value : maskVknTckn(value);
}

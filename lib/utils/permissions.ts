import type { User, KullaniciYetki } from "@/lib/types";

/**
 * Kullanıcının belirtilen yetkiye sahip olup olmadığını kontrol eder.
 *
 * - musavir: her zaman true (tam yetki)
 * - mukellef: her zaman false (sadece kendi panelinde işlem yapar)
 * - personel: user.yetkiler dizisinde ilgili yetki varsa true
 */
export function hasPermission(user: User | null | undefined, yetki: KullaniciYetki): boolean {
  if (!user) return false;
  if (user.rol === "musavir") return true;
  if (user.rol === "mukellef") return false;
  // personel
  return user.yetkiler?.includes(yetki) ?? false;
}

/**
 * Kullanıcı sadece musavir rolündeyse true döner.
 * Ayarlar gibi tam kısıtlı sayfalar için kullanılır.
 */
export function isMusavir(user: User | null | undefined): boolean {
  return user?.rol === "musavir";
}

/**
 * Kullanıcı personel veya müşavir rolündeyse (ofis çalışanı) true döner.
 */
export function isStaff(user: User | null | undefined): boolean {
  return user?.rol === "musavir" || user?.rol === "personel";
}

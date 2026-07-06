import type { User, KullaniciYetki } from "@/lib/types";

/**
 * Kullanıcının belirtilen yetkiye sahip olup olmadığını kontrol eder.
 *
 * - musavir: her zaman true (tam yetki)
 * - mukellef: her zaman false (sadece kendi panelinde işlem yapar)
 *
 * Not: `yetki` parametresi geriye dönük uyumluluk için korunur; personel rolü
 * kaldırıldığından yetki bazlı kısıtlama artık yoktur.
 */
export function hasPermission(user: User | null | undefined, yetki: KullaniciYetki): boolean {
  void yetki;
  return user?.rol === "musavir";
}

/**
 * Kullanıcı sadece musavir rolündeyse true döner.
 * Ayarlar gibi tam kısıtlı sayfalar için kullanılır.
 */
export function isMusavir(user: User | null | undefined): boolean {
  return user?.rol === "musavir";
}

/**
 * Kullanıcı ofis çalışanı (müşavir) rolündeyse true döner.
 */
export function isStaff(user: User | null | undefined): boolean {
  return user?.rol === "musavir";
}

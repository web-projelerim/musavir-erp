import { MaintenanceScreen } from "@/components/ui/MaintenanceScreen";

/**
 * Bulunamayan (404) tüm rotalar için de aynı bakım ekranı gösterilir —
 * kullanıcıya ham hata kodu yerine tek tip "bakımdayız" mesajı çıkar.
 */
export default function NotFound() {
  return <MaintenanceScreen />;
}

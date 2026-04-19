import { AlertTriangle, TrendingUp, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/Card";
import { RiskBadge, Badge } from "@/components/ui/Badge";
import { RiskMetre } from "@/components/ui/RiskMetre";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell
} from "@/components/ui/Table";
import { MOCK_MUSTERILER, MOCK_TEBLIGATLAR, MOCK_BEYANNAMELER, MOCK_TAHSILATLAR } from "@/lib/data/mock";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface RiskSinyali {
  label: string;
  aciklama: string;
  puan: number;
  renk: string;
}

function hesaplaRiskSinyalleri(musteriId: string): RiskSinyali[] {
  const sinyaller: RiskSinyali[] = [];
  const musteri = MOCK_MUSTERILER.find((m) => m.id === musteriId)!;

  if (MOCK_TEBLIGATLAR.some((t) => t.musteriId === musteriId && t.durum === "yeni")) {
    sinyaller.push({
      label: "İşlenmemiş tebligat",
      aciklama: "GİB kaynaklı yeni tebligat mevcut",
      puan: 25,
      renk: "text-red-600 bg-red-50",
    });
  }
  if (MOCK_BEYANNAMELER.some((b) => b.musteriId === musteriId && b.durum === "gecikti")) {
    sinyaller.push({
      label: "Gecikmiş beyanname",
      aciklama: "Son tarihi geçmiş beyanname bulunuyor",
      puan: 30,
      renk: "text-red-600 bg-red-50",
    });
  }
  if (musteri.tahsilatDurumu === "gecikti") {
    sinyaller.push({
      label: "Müşavir ücreti gecikmiş",
      aciklama: "Ödeme süresi geçmiş",
      puan: 15,
      renk: "text-amber-600 bg-amber-50",
    });
  }
  if (musteri.gecikmisPesinat) {
    sinyaller.push({
      label: "Gecikmeli peşinat vergisi",
      aciklama: "Peşin vergi ödemesi gecikmiş",
      puan: 20,
      renk: "text-amber-600 bg-amber-50",
    });
  }

  return sinyaller;
}

export default function RiskPage() {
  const kritikMusteriler = MOCK_MUSTERILER.filter((m) => m.riskSeviyesi === "kritik");
  const yuksekMusteriler = MOCK_MUSTERILER.filter((m) => m.riskSeviyesi === "yuksek");
  const ortaMusteriler = MOCK_MUSTERILER.filter((m) => m.riskSeviyesi === "orta");
  const dusukMusteriler = MOCK_MUSTERILER.filter((m) => m.riskSeviyesi === "dusuk");

  const riskliMusteriler = [...MOCK_MUSTERILER]
    .sort((a, b) => b.riskSkoru - a.riskSkoru);

  return (
    <div>
      <PageHeader
        title="Risk Merkezi"
        subtitle="Müşteri bazlı risk skorları ve uyarı sinyalleri"
      />

      {/* Risk özet metrikleri */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Kritik Risk"
          value={kritikMusteriler.length}
          subtitle="Acil müdahale"
          variant="danger"
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        />
        <MetricCard
          title="Yüksek Risk"
          value={yuksekMusteriler.length}
          subtitle="Yakın takip"
          variant="warning"
        />
        <MetricCard
          title="Orta Risk"
          value={ortaMusteriler.length}
          subtitle="Düzenli kontrol"
        />
        <MetricCard
          title="Düşük Risk"
          value={dusukMusteriler.length}
          subtitle="Normal durum"
          variant="success"
        />
      </div>

      {/* Risk skor açıklama */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Risk Skoru Nasıl Hesaplanır?</p>
            <p className="text-xs text-blue-600 mt-1">
              Risk skoru; işlenmemiş tebligatlar (+25), gecikmiş beyannameler (+30), geciken müşavir ücreti (+15), gecikmeli peşinat vergisi (+20), tekrar eden görev gecikmeleri (+10) ve KDV2 uyumsuzlukları (+15) gibi sinyallerden kural bazlı olarak hesaplanır. Skor 0-100 arasında gösterilir.
            </p>
          </div>
        </div>
      </div>

      {/* Risk tablosu */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Risk Sıralaması</h3>
          <p className="text-xs text-slate-500 mt-0.5">Tüm müşteriler risk skoruna göre sıralı</p>
        </div>
        <Table>
          <TableHead>
            <tr>
              <TableHeadCell>Sıra</TableHeadCell>
              <TableHeadCell>Firma</TableHeadCell>
              <TableHeadCell>Risk Skoru</TableHeadCell>
              <TableHeadCell>Seviye</TableHeadCell>
              <TableHeadCell>Risk Sinyalleri</TableHeadCell>
              <TableHeadCell>Sorumlu</TableHeadCell>
              <TableHeadCell></TableHeadCell>
            </tr>
          </TableHead>
          <tbody className="divide-y divide-slate-100">
            {riskliMusteriler.map((m, idx) => {
              const sinyaller = hesaplaRiskSinyalleri(m.id);
              return (
                <tr key={m.id} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold tabular-nums ${
                      idx === 0 ? "text-red-600" :
                      idx === 1 ? "text-orange-600" :
                      idx === 2 ? "text-amber-600" :
                      "text-slate-400"
                    }`}>
                      #{idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{m.firmaAdi}</p>
                      <p className="text-xs text-slate-400 font-mono">{m.vknTckn}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-[120px]">
                      <RiskMetre skor={m.riskSkoru} seviye={m.riskSeviyesi} showLabel size="sm" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge seviye={m.riskSeviyesi} />
                  </td>
                  <td className="px-4 py-3">
                    {sinyaller.length === 0 ? (
                      <span className="text-xs text-emerald-600 font-medium">✓ Sinyal yok</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {sinyaller.map((s, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.renk}`}>
                            {s.label} +{s.puan}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600">{m.sorumluPersonel}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/musteriler/${m.id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Detay <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

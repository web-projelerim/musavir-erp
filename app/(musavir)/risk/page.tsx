"use client";

import { AlertTriangle, ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import { StatsDrawer } from "@/components/layout/StatsDrawer";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskBadge } from "@/components/ui/Badge";
import { RiskMetre } from "@/components/ui/RiskMetre";
import { Table, TableHead, TableHeadCell } from "@/components/ui/Table";
import { MobileCard, MobileField, MobileList } from "@/components/ui/MobileList";
import { useAppData } from "@/lib/hooks/useAppData";
import { hesaplaRiskListesi } from "@/lib/domain/risk";
import type { RiskSeviyesi } from "@/lib/types";

const RISK_SEVIYELERI: RiskSeviyesi[] = ["kritik", "yuksek", "orta", "dusuk"];

export default function RiskPage() {
  const { musteriler, tebligatlar, beyannameler, gorevler, tahsilatlar, kdv2 } = useAppData();
  const riskListesi = hesaplaRiskListesi({ musteriler, tebligatlar, beyannameler, gorevler, tahsilatlar, kdv2 });

  const sayac = (seviye: RiskSeviyesi) => riskListesi.filter((risk) => risk.seviye === seviye).length;
  const metrics = [
    {
      title: "Kritik Risk",
      value: sayac("kritik"),
      subtitle: "Acil mudahale",
      variant: "danger" as const,
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    },
    {
      title: "Yuksek Risk",
      value: sayac("yuksek"),
      subtitle: "Yakin takip",
      variant: "warning" as const,
    },
    {
      title: "Orta Risk",
      value: sayac("orta"),
      subtitle: "Duzenli kontrol",
    },
    {
      title: "Dusuk Risk",
      value: sayac("dusuk"),
      subtitle: "Normal durum",
      variant: "success" as const,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Risk Merkezi"
        subtitle="Musteri bazli risk skorlar ve uyari sinyalleri"
      />

      <StatsDrawer
        title="Risk İstatistikleri"
        subtitle="Müşteri risk seviyesi dağılımı"
        metrics={metrics}
      />

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Risk Skoru Nasil Hesaplanir?</p>
            <p className="text-xs text-blue-600 mt-1">
              Risk skoru; islenmemis tebligat, gecikmis beyanname, gecikmis tahsilat,
              gecikmeli pesinat vergisi, gecikmis gorev ve kritik gorev sinyallerinden
              kural bazli hesaplanir. Skor 0-100 araliginda tek domain servisinden gelir.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Risk Siralamasi</h3>
          <p className="text-xs text-slate-500 mt-0.5">Tum musteriler hesaplanan risk skoruna gore sirali</p>
        </div>
        <MobileList empty={riskListesi.length === 0}>
          {riskListesi.map((risk, idx) => {
            const m = risk.musteri;
            return (
              <MobileCard key={m.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-bold tabular-nums ${
                      idx === 0 ? "text-red-600" :
                      idx === 1 ? "text-orange-600" :
                      idx === 2 ? "text-amber-600" :
                      "text-slate-400"
                    }`}>
                      #{idx + 1}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{m.firmaAdi}</p>
                    <p className="mt-1 text-xs font-mono text-slate-400">{m.vknTckn}</p>
                  </div>
                  <RiskBadge seviye={risk.seviye} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <MobileField label="Risk Skoru">
                    <RiskMetre skor={risk.skor} seviye={risk.seviye} showLabel size="sm" />
                  </MobileField>
                  <MobileField label="Sorumlu">
                    {m.sorumluPersonel}
                  </MobileField>
                </div>
                <div className="mt-3">
                  <MobileField label="Risk Sinyalleri">
                    {risk.sinyaller.length === 0 ? (
                      <span className="font-medium text-emerald-600">Sinyal yok</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {risk.sinyaller.slice(0, 3).map((sinyal) => (
                          <span key={sinyal.tip} className={`text-xs px-2 py-0.5 rounded-full font-medium ${sinyal.renk}`}>
                            {sinyal.label} +{sinyal.puan}
                          </span>
                        ))}
                        {risk.sinyaller.length > 3 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                            +{risk.sinyaller.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </MobileField>
                </div>
                <Link
                  href={`/musteriler/${m.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Detay <ChevronRight className="w-3 h-3" />
                </Link>
              </MobileCard>
            );
          })}
        </MobileList>
        <Table className="hidden md:block">
          <TableHead>
            <tr>
              <TableHeadCell>Sira</TableHeadCell>
              <TableHeadCell>Firma</TableHeadCell>
              <TableHeadCell>Risk Skoru</TableHeadCell>
              <TableHeadCell>Seviye</TableHeadCell>
              <TableHeadCell>Risk Sinyalleri</TableHeadCell>
              <TableHeadCell>Sorumlu</TableHeadCell>
              <TableHeadCell></TableHeadCell>
            </tr>
          </TableHead>
          <tbody className="divide-y divide-slate-100">
            {riskListesi.map((risk, idx) => {
              const m = risk.musteri;
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
                      <RiskMetre skor={risk.skor} seviye={risk.seviye} showLabel size="sm" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge seviye={risk.seviye} />
                  </td>
                  <td className="px-4 py-3">
                    {risk.sinyaller.length === 0 ? (
                      <span className="text-xs text-emerald-600 font-medium">Sinyal yok</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {risk.sinyaller.map((sinyal) => (
                          <span key={sinyal.tip} className={`text-xs px-2 py-0.5 rounded-full font-medium ${sinyal.renk}`}>
                            {sinyal.label} +{sinyal.puan}
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

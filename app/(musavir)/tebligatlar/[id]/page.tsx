"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ExternalLink, Download } from "lucide-react";
import { useAppData } from "@/lib/hooks/useAppData";
import { PageLoading } from "@/components/ui/PageLoading";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { authHeaders } from "@/lib/firebase/client";
import { formatTarih } from "@/lib/utils/format";

interface Props {
  params: { id: string };
}

function isKarsitInceleme(tebligat: { tur?: string; baslik?: string }): boolean {
  const norm = (s?: string) => s?.toLocaleLowerCase("tr-TR") ?? "";
  return (
    norm(tebligat.tur).includes("karşıt") ||
    norm(tebligat.tur).includes("karsit") ||
    norm(tebligat.baslik).includes("karşıt") ||
    norm(tebligat.baslik).includes("karsit") ||
    norm(tebligat.baslik).includes("inceleme tutanağı") ||
    norm(tebligat.baslik).includes("inceleme tutanagi")
  );
}

export default function TebligatGoruntulePage({ params }: Props) {
  const { tebligatlar, loading } = useAppData();
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);

  const tebligat = tebligatlar.find((t) => t.id === params.id);

  useEffect(() => {
    if (!tebligat) return;
    if (!tebligat.pdfUrl) {
      setPdfError("Tebligat için PDF bağlantısı kayıtlı değil.");
      return;
    }
    setPdfYukleniyor(true);
    void (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`/api/tebligat/pdf?id=${encodeURIComponent(tebligat.id)}`, { headers });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error ?? `PDF alınamadı (HTTP ${res.status})`);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
      } catch (err) {
        setPdfError(err instanceof Error ? err.message : "PDF yüklenemedi");
      } finally {
        setPdfYukleniyor(false);
      }
    })();

    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tebligat?.id]);

  if (loading && !tebligat) return <PageLoading />;
  if (!tebligat) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-8">
        <Link href="/tebligatlar" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Tebligat Listesi
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Tebligat bulunamadı</h1>
      </div>
    );
  }

  const karsit = isKarsitInceleme(tebligat);

  return (
    <div>
      <Link href="/tebligatlar" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-3">
        <ArrowLeft className="w-3.5 h-3.5" />
        Tebligat Listesi
      </Link>

      <div className={`rounded-xl border p-5 mb-4 ${karsit ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {karsit && <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />}
              <h1 className={`text-lg font-bold ${karsit ? "text-red-900" : "text-slate-900"}`}>
                {tebligat.baslik}
              </h1>
              {karsit && <Badge variant="danger">KARŞIT İNCELEME</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
              <span><strong>Mükellef:</strong> {tebligat.musteriAdi}</span>
              <span><strong>Tarih:</strong> {formatTarih(tebligat.tarih)}</span>
              <span><strong>Tür:</strong> {tebligat.tur}</span>
              <span><strong>Durum:</strong> {tebligat.durum}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {tebligat.pdfUrl && (
              <Button variant="outline" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}
                onClick={() => window.open(tebligat.pdfUrl, "_blank", "noopener,noreferrer")}>
                GİB&apos;de Aç
              </Button>
            )}
            {pdfBlobUrl && (
              <a href={pdfBlobUrl} download={`tebligat-${tebligat.id}.pdf`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <Download className="w-3.5 h-3.5" />
                İndir
              </a>
            )}
          </div>
        </div>
        {tebligat.notlar && (
          <p className="mt-3 text-sm text-slate-700 border-t border-slate-100 pt-3">{tebligat.notlar}</p>
        )}
      </div>

      {/* PDF Viewer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        {pdfYukleniyor && (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-600">PDF yükleniyor...</p>
          </div>
        )}
        {pdfError && !pdfYukleniyor && (
          <div className="p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <p className="mt-3 text-sm font-semibold text-slate-800">PDF görüntülenemiyor</p>
            <p className="mt-1 text-xs text-slate-500">{pdfError}</p>
            {tebligat.pdfUrl && (
              <Button variant="outline" size="sm" className="mt-4"
                onClick={() => window.open(tebligat.pdfUrl, "_blank", "noopener,noreferrer")}>
                GİB sitesinde aç
              </Button>
            )}
          </div>
        )}
        {pdfBlobUrl && !pdfYukleniyor && !pdfError && (
          <iframe
            src={pdfBlobUrl}
            title={`Tebligat ${tebligat.id}`}
            className="w-full"
            style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}
          />
        )}
      </div>
    </div>
  );
}

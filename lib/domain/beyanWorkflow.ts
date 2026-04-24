import type { Beyanname, BeyannameDurum, BeyannameYasamDongusuDurum } from "@/lib/types";

export const BEYAN_WORKFLOW_ORDER: BeyannameYasamDongusuDurum[] = [
  "planlandi",
  "evrak_bekliyor",
  "hazirlaniyor",
  "ic_kontrol",
  "musavir_onayi",
  "gonderildi",
  "tahakkuk_olustu",
  "odeme_bekliyor",
  "kapandi",
];

export function mapLegacyDurumToWorkflow(durum: BeyannameDurum): BeyannameYasamDongusuDurum {
  if (durum === "verildi") return "gonderildi";
  if (durum === "gecikti") return "evrak_bekliyor";
  if (durum === "iptal") return "iptal";
  return "planlandi";
}

export function beyanWorkflowLabel(durum: BeyannameYasamDongusuDurum) {
  const map: Record<BeyannameYasamDongusuDurum, string> = {
    planlandi: "Planlandi",
    evrak_bekliyor: "Evrak Bekliyor",
    hazirlaniyor: "Hazirlaniyor",
    ic_kontrol: "Ic Kontrol",
    musavir_onayi: "Musavir Onayi",
    gonderildi: "Gonderildi",
    tahakkuk_olustu: "Tahakkuk Olustu",
    odeme_bekliyor: "Odeme Bekliyor",
    kapandi: "Kapandi",
    duzeltme_gerekli: "Duzeltme Gerekli",
    iptal: "Iptal",
  };
  return map[durum];
}

export function beyanWorkflowVariant(durum: BeyannameYasamDongusuDurum) {
  if (durum === "kapandi") return "success" as const;
  if (durum === "gonderildi" || durum === "tahakkuk_olustu") return "info" as const;
  if (durum === "odeme_bekliyor" || durum === "ic_kontrol" || durum === "musavir_onayi") {
    return "warning" as const;
  }
  if (durum === "duzeltme_gerekli" || durum === "iptal") return "danger" as const;
  return "neutral" as const;
}

export function workflowToBeyanDurum(workflow: BeyannameYasamDongusuDurum): BeyannameDurum {
  if (workflow === "kapandi" || workflow === "gonderildi" || workflow === "tahakkuk_olustu" || workflow === "odeme_bekliyor") {
    return "verildi";
  }
  if (workflow === "duzeltme_gerekli") return "gecikti";
  if (workflow === "iptal") return "iptal";
  return "bekliyor";
}

export function nextWorkflowStep(current: BeyannameYasamDongusuDurum): BeyannameYasamDongusuDurum | null {
  if (current === "kapandi" || current === "iptal" || current === "duzeltme_gerekli") return null;
  const index = BEYAN_WORKFLOW_ORDER.indexOf(current);
  if (index === -1) return "evrak_bekliyor";
  return BEYAN_WORKFLOW_ORDER[index + 1] ?? null;
}

export function workflowActionLabel(current: BeyannameYasamDongusuDurum) {
  const next = nextWorkflowStep(current);
  if (!next) return null;
  return beyanWorkflowLabel(next);
}

export function buildBeyanWorkflowPatch(current: Beyanname, next: BeyannameYasamDongusuDurum) {
  const patch: Partial<Beyanname> = {
    yasamDongusuDurum: next,
    durum: workflowToBeyanDurum(next),
  };

  if (next === "gonderildi" && !current.verilmeTarihi) {
    patch.verilmeTarihi = new Date().toISOString();
  }

  if (next === "tahakkuk_olustu" && !current.tahakkukFisNo) {
    patch.tahakkukFisNo = `TF-${current.id.toUpperCase()}-${new Date().getFullYear()}`;
    patch.tahakkukFisTarihi = new Date().toISOString();
  }

  if (next === "odeme_bekliyor" && !current.odemeSonTarihi) {
    const due = new Date();
    due.setDate(due.getDate() + 7);
    patch.odemeSonTarihi = due.toISOString();
  }

  return patch;
}

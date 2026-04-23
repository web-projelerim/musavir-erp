import type { Beyanname, Tebligat } from "@/lib/types";

export interface GibBorc {
  musteriId: string;
  musteriAdi: string;
  donem: string;
  tutar: number;
  sonOdemeTarihi: string;
}

export interface GibMukellefDurumu {
  musteriId: string;
  aktif: boolean;
  vergiDairesi?: string;
  mesaj?: string;
}

export interface GibProvider {
  getTebligatlar(musteriId?: string): Promise<Tebligat[]>;
  getBeyannameler(musteriId?: string): Promise<Beyanname[]>;
  getBorclar(musteriId?: string): Promise<GibBorc[]>;
  getMukellefDurumu(musteriId: string): Promise<GibMukellefDurumu>;
  downloadPdf(ref: string): Promise<Blob>;
}

export class ManualGibProvider implements GibProvider {
  async getTebligatlar(): Promise<Tebligat[]> {
    return [];
  }

  async getBeyannameler(): Promise<Beyanname[]> {
    return [];
  }

  async getBorclar(): Promise<GibBorc[]> {
    return [];
  }

  async getMukellefDurumu(musteriId: string): Promise<GibMukellefDurumu> {
    return {
      musteriId,
      aktif: true,
      mesaj: "GIB erisim bilgileri tanimlanana kadar manual/mock mod aktif.",
    };
  }

  async downloadPdf(): Promise<Blob> {
    throw new Error("GIB PDF indirme icin gercek provider yapilandirilmalidir.");
  }
}

export function createGibProvider(): GibProvider {
  return new ManualGibProvider();
}

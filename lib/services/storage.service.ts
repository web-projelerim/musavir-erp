import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll,
} from "firebase/storage";
import { storage } from "@/lib/firebase/config";

export async function dosyaYukle(
  path: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const storageRef = ref(storage, path);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      "state_changed",
      (snap) => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        onProgress?.(Math.round(pct));
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

export async function tebligatPdfYukle(
  tebligatId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  return dosyaYukle(`tebligatlar/${tebligatId}/tebligat.pdf`, file, onProgress);
}

export async function raporPdfYukle(
  raporId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  return dosyaYukle(`raporlar/${raporId}/rapor.pdf`, file, onProgress);
}

export async function musteriBelgesiYukle(
  musteriId: string,
  dosyaAdi: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  return dosyaYukle(`belgeler/${musteriId}/${dosyaAdi}`, file, onProgress);
}

export async function musteriBelgeleriniListele(musteriId: string): Promise<string[]> {
  const listRef = ref(storage, `belgeler/${musteriId}`);
  const result = await listAll(listRef);
  return Promise.all(result.items.map((item) => getDownloadURL(item)));
}

export async function dosyaSil(path: string): Promise<void> {
  await deleteObject(ref(storage, path));
}

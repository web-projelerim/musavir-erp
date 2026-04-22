import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { firebaseStorage } from "@/lib/firebase/client";

function requireStorage() {
  if (!firebaseStorage) {
    throw new Error("Firebase Storage yapilandirmasi bulunamadi.");
  }
  return firebaseStorage;
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^\w.-]/g, "")
    .toLowerCase();
}

export async function uploadBelgeFile(musteriId: string, file: File) {
  const storage = requireStorage();
  const safeName = sanitizeFileName(file.name) || "belge";
  const storagePath = `belgeler/${musteriId}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, storagePath);

  await uploadBytes(fileRef, file, {
    contentType: file.type || "application/octet-stream",
  });

  const url = await getDownloadURL(fileRef);

  return {
    url,
    storagePath,
  };
}

export async function uploadRaporPdf(musteriId: string, raporId: string, blob: Blob) {
  const storage = requireStorage();
  const storagePath = `raporlar/${musteriId}/${raporId}.pdf`;
  const fileRef = ref(storage, storagePath);

  await uploadBytes(fileRef, blob, {
    contentType: "application/pdf",
  });

  const url = await getDownloadURL(fileRef);

  return {
    url,
    storagePath,
  };
}

export async function deleteStorageFile(storagePath: string) {
  const storage = requireStorage();
  await deleteObject(ref(storage, storagePath));
}

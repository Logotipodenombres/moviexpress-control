import { db } from '../lib/supabase';
export async function uploadPhoto(file: File, org: string, entity: string, id: string) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Selecciona una imagen JPG, PNG o WebP.');
  if (file.size > 10 * 1024 * 1024)
    throw new Error('La fotografía original debe pesar menos de 10 MB.');
  const bitmap = await createImageBitmap(file);
  if (bitmap.width * bitmap.height > 60000000) {
    bitmap.close();
    throw new Error('La resolución de la fotografía es demasiado grande.');
  }
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la fotografía.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.82),
  );
  if (!blob || blob.size > 5 * 1024 * 1024)
    throw new Error('La imagen comprimida supera el máximo de 5 MB.');
  const path = `${org}/${entity}/${id}/${crypto.randomUUID()}.jpg`;
  const { error } = await db()
    .storage.from('fleet-photos')
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '0', upsert: false });
  if (error) throw error;
  return path;
}
export async function signedPhoto(path: string) {
  const { data, error } = await db().storage.from('fleet-photos').createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

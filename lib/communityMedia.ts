/**
 * Fotos de la comunidad → bucket público `community-media/<user_id>/…`
 * (migración 20261105020000). En web se reduce a 1600 px JPEG antes de subir:
 * una foto de teléfono pesa 4–8 MB y el bucket acepta 5 MB.
 */
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const MAX_SIDE = 1600;

export type PickedPhoto = { blob: Blob; previewUrl: string };

/** Abre el selector de imágenes. null si la persona cancela. */
export async function pickPhoto(): Promise<PickedPhoto | null> {
  if (Platform.OS === 'web') {
    const file = await new Promise<File | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.oncancel = () => resolve(null);
      input.click();
    });
    if (!file) return null;
    const blob = await shrink(file);
    return { blob, previewUrl: URL.createObjectURL(blob) };
  }
  // Nativo: import dinámico para no meter el picker al bundle web.
  const DocumentPicker = await import('expo-document-picker');
  const res = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const uri = res.assets[0].uri;
  const blob = await (await fetch(uri)).blob();
  return { blob, previewUrl: uri };
}

/** Sube la foto y devuelve su URL pública. */
export async function uploadPhoto(userId: string, blob: Blob): Promise<string> {
  const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('community-media').upload(path, blob, { contentType: type, upsert: false });
  if (error) throw error;
  return supabase.storage.from('community-media').getPublicUrl(path).data.publicUrl;
}

async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return out ?? file;
  } catch {
    return file; // ponytail: formato que el navegador no decodifica (HEIC en Chrome) → sube el original; el bucket rechaza lo que no sea imagen
  }
}

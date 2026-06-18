/**
 * medicalExams — IO PHI-safe para exámenes médicos del usuario (Cluster B).
 *
 * Reglas duras:
 *  - El archivo SIEMPRE va a `medical-exams/<user_id>/<exam_id>.<ext>`. El RLS
 *    de Storage usa la primera carpeta del path como gate; cualquier otro
 *    layout invalida la seguridad.
 *  - Bucket privado (público=false). Acceso por SIGNED URL temporal (5 min) —
 *    nunca URL pública.
 *  - El usuario puede listar/borrar SOLO sus propios exámenes (RLS owner-only).
 *  - El admin solo ve metadatos Y SOLO SI el usuario aceptó
 *    `consents.share_exams_with_coach` (gate en RLS, no en cliente).
 *  - Mime types aceptados: PDF, JPEG, PNG. Tamaño máx 20 MB (UX, no seguridad).
 *  - Subida es web-first (input File). En nativo: requiere expo-document-picker
 *    (handoff — pendiente de instalar).
 */

import { supabase } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa: any = supabase;

const BUCKET = 'medical-exams';
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED_MIMES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export interface MedicalExamRecord {
  id: string;
  user_id: string;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  exam_type: string | null;
  exam_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface UploadExamInput {
  /** Archivo Web (File/Blob) — la UI nativa pasa por una ruta distinta. */
  file: { name?: string; type?: string; size?: number; arrayBuffer: () => Promise<ArrayBuffer> };
  examType?: string;
  examDate?: string | null;
  notes?: string | null;
}

export interface UploadResult {
  ok: boolean;
  exam?: MedicalExamRecord;
  error?: string;
}

function extFromMime(mime: string): string {
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  return 'bin';
}

/** Sube un examen del usuario autenticado. Idempotente: si falla el insert tras
 *  subir el archivo, intenta limpiar el objeto huérfano. */
export async function uploadExam(input: UploadExamInput): Promise<UploadResult> {
  const { data: auth } = await supa.auth.getUser();
  const userId = (auth as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return { ok: false, error: 'Necesitas estar autenticado.' };

  const { file, examType, examDate, notes } = input;
  const mime = (file.type ?? '').toLowerCase();
  if (!ACCEPTED_MIMES.includes(mime as (typeof ACCEPTED_MIMES)[number])) {
    return { ok: false, error: 'Formato no aceptado. Sube PDF, JPG o PNG.' };
  }
  const size = file.size ?? 0;
  if (size > MAX_BYTES) {
    return { ok: false, error: 'El archivo excede 20 MB. Comprime y vuelve a intentar.' };
  }

  const examId =
    (globalThis.crypto?.randomUUID?.() as string | undefined) ??
    (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));

  const ext = extFromMime(mime);
  const path = `${userId}/${examId}.${ext}`;

  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch (e) {
    logSilentError('medicalExams.read', e);
    return { ok: false, error: 'No pude leer el archivo. Reinicia y prueba otra vez.' };
  }

  // 1. Sube el archivo al bucket privado.
  try {
    const { error: upErr } = await supa.storage.from(BUCKET).upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) {
      logSilentError('medicalExams.storage.upload', upErr);
      return { ok: false, error: 'No se pudo subir el archivo. Inténtalo de nuevo.' };
    }
  } catch (e) {
    logSilentError('medicalExams.storage.upload', e);
    return { ok: false, error: 'No se pudo subir el archivo. Inténtalo de nuevo.' };
  }

  // 2. Registra el metadato. Si falla, intenta borrar el objeto para no dejar huérfano.
  try {
    const { data, error } = await supa
      .from('medical_exams')
      .insert({
        id: examId,
        user_id: userId,
        storage_path: path,
        file_name: file.name ?? `examen.${ext}`,
        file_size: size || null,
        mime_type: mime,
        exam_type: examType ?? null,
        exam_date: examDate ?? null,
        notes: notes ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return { ok: true, exam: data as MedicalExamRecord };
  } catch (e) {
    logSilentError('medicalExams.insert', e);
    try { await supa.storage.from(BUCKET).remove([path]); } catch { /* cleanup */ }
    return { ok: false, error: 'No se pudo registrar el examen. El archivo se eliminó para no dejarlo huérfano.' };
  }
}

export async function listMyExams(): Promise<MedicalExamRecord[]> {
  const { data: auth } = await supa.auth.getUser();
  const userId = (auth as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return [];
  try {
    const { data } = await supa
      .from('medical_exams')
      .select('*')
      .eq('user_id', userId)
      .order('exam_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    return (data ?? []) as MedicalExamRecord[];
  } catch (e) {
    logSilentError('medicalExams.list', e);
    return [];
  }
}

/** Devuelve una URL firmada de 5 min para ver/descargar el examen. RLS hace el gate. */
export async function getExamSignedUrl(exam: MedicalExamRecord): Promise<string | null> {
  try {
    const { data, error } = await supa.storage
      .from(BUCKET)
      .createSignedUrl(exam.storage_path, 300);
    if (error || !data?.signedUrl) {
      logSilentError('medicalExams.signedUrl', error);
      return null;
    }
    return data.signedUrl as string;
  } catch (e) {
    logSilentError('medicalExams.signedUrl', e);
    return null;
  }
}

export async function deleteExam(exam: MedicalExamRecord): Promise<boolean> {
  // 1. borra el archivo (RLS del bucket valida que el path empieza con su user_id)
  try {
    await supa.storage.from(BUCKET).remove([exam.storage_path]);
  } catch (e) {
    logSilentError('medicalExams.storage.remove', e);
    // continúa con el delete de metadato igual — el RLS lo bloquea si no es owner
  }
  // 2. borra el metadato
  try {
    const { error } = await supa.from('medical_exams').delete().eq('id', exam.id);
    if (error) throw error;
    return true;
  } catch (e) {
    logSilentError('medicalExams.delete', e);
    return false;
  }
}

// ─── Lab values (entrada manual) ───────────────────────────────────────────────
// Permite al usuario teclear un valor sin subir archivo, para alimentar al
// internista. La clasificación educativa la hace `lib/internistLogic.ts` en
// el cliente — no se almacena la banda, solo el valor.

export interface RecordLabValueInput {
  markerKey: string;
  value: number;
  unit: string;
  measuredAt?: string | null;
  examId?: string | null;
}

export async function recordLabValue(input: RecordLabValueInput): Promise<boolean> {
  const { data: auth } = await supa.auth.getUser();
  const userId = (auth as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return false;
  try {
    const { error } = await supa.from('medical_lab_values').insert({
      user_id: userId,
      exam_id: input.examId ?? null,
      marker_key: input.markerKey,
      value: input.value,
      unit: input.unit,
      measured_at: input.measuredAt ?? null,
      source: 'manual',
    });
    if (error) throw error;
    return true;
  } catch (e) {
    logSilentError('medicalExams.recordLab', e);
    return false;
  }
}

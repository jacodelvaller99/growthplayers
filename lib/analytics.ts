/**
 * LifeFlow Analytics — Behavioral Tracker
 *
 * Singleton that batches events and flushes them to Supabase user_events.
 * Respects ml_consent: when false, track() is a no-op.
 * Designed for zero-latency UX: all writes happen in the background.
 */

import { supabase, intel } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType =
  | 'screen_view'
  | 'lesson_start'
  | 'lesson_complete'
  | 'lesson_abandon'
  | 'binaural_start'
  | 'binaural_complete'
  | 'breathing_complete'
  | 'meditation_complete'
  | 'chat_sent'
  | 'chat_response_received'
  | 'checkin_submit'
  | 'journal_write'
  | 'app_open'
  | 'app_background'
  | 'button_tap'
  | 'module_view'
  | 'paywall_hit'
  | 'subscription_start';

interface QueuedEvent {
  event_type: EventType;
  screen?: string;
  metadata: Record<string, unknown>;
  session_id: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Analytics Singleton ──────────────────────────────────────────────────────

class PolarisAnalytics {
  private sessionId: string = generateUUID();
  private userId: string | null = null;
  private mlConsent: boolean = true;
  private queue: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly FLUSH_INTERVAL_MS = 10_000; // 10 seconds
  private readonly FLUSH_THRESHOLD = 5;        // flush after 5 events

  // ── Identity ────────────────────────────────────────────────────────────────

  setUser(userId: string, mlConsent = true) {
    this.userId = userId;
    this.mlConsent = mlConsent;
    // Flush any queued events with real userId
    if (this.queue.length > 0) this.flush();
  }

  setConsent(consent: boolean) {
    this.mlConsent = consent;
    if (!consent) this.queue = []; // discard queued events
  }

  resetSession() {
    this.sessionId = generateUUID();
  }

  // ── Core track ──────────────────────────────────────────────────────────────

  track(eventType: EventType, metadata: Record<string, unknown> = {}, screen?: string) {
    if (!this.mlConsent || !this.userId) return;

    this.queue.push({
      event_type: eventType,
      screen,
      metadata,
      session_id: this.sessionId,
      created_at: new Date().toISOString(),
    });

    if (this.queue.length >= this.FLUSH_THRESHOLD) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  private flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.queue.length === 0 || !this.userId) return;

    const batch = this.queue.splice(0, this.queue.length);
    const userId = this.userId;

    // Fire-and-forget: do NOT await, never block the UI
    Promise.resolve().then(async () => {
      try {
        const rows = batch.map((e) => ({ ...e, user_id: userId }));
        await intel.events().insert(rows);

        // Trigger intelligence recalculation in the background
        // (edge function is idempotent, no need to await)
        supabase.functions
          .invoke('calculate-intelligence', {
            body: { user_id: userId, trigger: 'event_batch' },
          })
          .catch(() => { /* silent — edge function may not be deployed yet */ });
      } catch {
        // Silent failure — analytics must never crash the app
      }
    });
  }

  // ── Typed event methods ──────────────────────────────────────────────────────

  screenView(screen: string, metadata?: Record<string, unknown>) {
    this.track('screen_view', metadata ?? {}, screen);
  }

  lessonStart(lessonId: string, moduleId: string) {
    this.track('lesson_start', { lesson_id: lessonId, module_id: moduleId });
  }

  lessonComplete(lessonId: string, durationMs: number) {
    this.track('lesson_complete', { lesson_id: lessonId, duration_ms: durationMs });
  }

  lessonAbandon(lessonId: string, progressPct: number, durationMs: number) {
    this.track('lesson_abandon', {
      lesson_id: lessonId,
      progress_pct: progressPct,
      duration_ms: durationMs,
    });
  }

  binauralStart(presetId: string, durationTargetSec: number, frequencyHz?: number) {
    this.track('binaural_start', {
      preset_id: presetId,
      duration_target_sec: durationTargetSec,
      frequency_hz: frequencyHz,
    });
  }

  binauralComplete(presetId: string, durationActualSec: number) {
    this.track('binaural_complete', {
      preset_id: presetId,
      duration_actual_sec: durationActualSec,
    });
  }

  breathingComplete(technique: string, cycles: number, durationMs: number) {
    this.track('breathing_complete', { technique, cycles, duration_ms: durationMs });
  }

  meditationComplete(sessionName: string, durationMs: number) {
    this.track('meditation_complete', { session_name: sessionName, duration_ms: durationMs });
  }

  chatMessage(messageLength: number, responseTimeMs?: number) {
    this.track('chat_sent', { message_length: messageLength, response_time_ms: responseTimeMs });
  }

  checkinSubmit(energy: number, clarity: number, stress: number, sleep: number) {
    const score = Math.round((energy + clarity + (10 - stress) + sleep) / 4 * 100);
    this.track('checkin_submit', { energy, clarity, stress, sleep, sovereign_score: score });
  }

  journalWrite(wordCount: number, entryType: string) {
    this.track('journal_write', { word_count: wordCount, entry_type: entryType });
  }

  appOpen(source: 'direct' | 'notification' | 'link' = 'direct') {
    this.resetSession();
    this.track('app_open', { source });
  }

  appBackground(sessionDurationMs: number) {
    this.track('app_background', { session_duration_ms: sessionDurationMs });
    this.flush(); // Always flush on background to preserve data
  }

  buttonTap(buttonId: string, screen: string) {
    this.track('button_tap', { button_id: buttonId }, screen);
  }

  moduleView(moduleId: string, progress: number) {
    this.track('module_view', { module_id: moduleId, progress });
  }

  paywallHit(screen: string, messageCount: number) {
    this.track('paywall_hit', { screen, message_count: messageCount });
  }
}

// ─── Export singleton ─────────────────────────────────────────────────────────

export const analytics = new PolarisAnalytics();

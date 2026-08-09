/**
 * tourStore — estado del tour guiado (Zustand v5, mismo patrón que
 * wellnessStore). Vive fuera de React para que el botón flotante y el
 * overlay lean el mismo estado sin prop-drilling a través de _layout.tsx.
 */
import { create } from 'zustand';
import { TOUR_STEPS } from '@/data/tour';
import { clampIndex } from '@/lib/tourLogic';
import { readLocal, writeLocal } from '@/storage/local';

export const TOUR_VOICE_KEY = 'guia-voz:v1';

interface TourStore {
  active: boolean;
  stepIndex: number;
  /** Toggle de voz — default ON (pidió el dueño que la venda, no que se
   *  esconda), persistido entre sesiones. */
  voiceEnabled: boolean;
  start: () => void;
  stop: () => void;
  goTo: (index: number) => void;
  setVoiceEnabled: (on: boolean) => void;
  /** Rehidrata el toggle de voz desde disco — se llama una vez al montar el
   *  botón flotante, sin bloquear el arranque del store. */
  hydrateVoicePref: () => void;
}

export const useTourStore = create<TourStore>((set) => ({
  active: false,
  stepIndex: 0,
  voiceEnabled: true,

  start: () => set({ active: true, stepIndex: 0 }),
  stop: () => set({ active: false }),
  goTo: (index) => set({ stepIndex: clampIndex(index, TOUR_STEPS.length) }),

  setVoiceEnabled: (on) => {
    set({ voiceEnabled: on });
    void writeLocal(TOUR_VOICE_KEY, on);
  },

  hydrateVoicePref: () => {
    readLocal<boolean>(TOUR_VOICE_KEY)
      .then((v) => { if (v !== null) set({ voiceEnabled: v }); })
      .catch(() => {});
  },
}));

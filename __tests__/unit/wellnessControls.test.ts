/**
 * Registro de controles de la sesión de bienestar en curso.
 *
 * POR QUÉ ESTE TEST: el botón STOP del mini-player no paraba nada cuando la
 * sesión la había lanzado Meditación o Binaurales — esas pantallas guardan su
 * handle en refs de componente y el mini-player llamaba a `stopBinauralGlobal`,
 * que solo ve el singleton del engine. El usuario pulsaba stop, el mini-player
 * desaparecía, y el audio seguía sonando sin ninguna UI para pararlo.
 *
 * Lo que se fija aquí es el contrato del registro, que es donde vive la cura:
 * quien para desde fuera alcanza al audio de verdad, y solo puede haber una
 * sesión registrada a la vez.
 */
import {
  pauseWellnessSession,
  registerSessionControls,
  resumeWellnessSession,
  stopWellnessSession,
} from '@/hooks/useBinauralEngine';
import { useWellnessStore } from '@/store/wellnessStore';

function makeControls() {
  return { stop: jest.fn(), pause: jest.fn(), resume: jest.fn() };
}

beforeEach(() => {
  // Deja el slot vacío entre tests sin exponer un reset solo-para-tests.
  stopWellnessSession();
  jest.clearAllMocks();
});

describe('registro de controles de sesión', () => {
  it('stopWellnessSession alcanza al audio de la pantalla que lo registró', () => {
    const c = makeControls();
    registerSessionControls(c);

    stopWellnessSession();

    expect(c.stop).toHaveBeenCalledTimes(1);
  });

  it('pausar y reanudar desde fuera operan los controles reales', () => {
    const c = makeControls();
    registerSessionControls(c);

    pauseWellnessSession();
    expect(c.pause).toHaveBeenCalledTimes(1);

    resumeWellnessSession();
    expect(c.resume).toHaveBeenCalledTimes(1);
  });

  it('tras parar, el slot queda vacío — parar dos veces no reabre el audio', () => {
    const c = makeControls();
    registerSessionControls(c);

    stopWellnessSession();
    stopWellnessSession();

    expect(c.stop).toHaveBeenCalledTimes(1);
  });

  it('arrancar una segunda sesión desbanca a la primera', () => {
    // El invariante que se rompía al navegar: lanzar Sueño con una meditación
    // sonando dejaba las dos sonando a la vez.
    const primera = makeControls();
    const segunda = makeControls();
    registerSessionControls(primera);
    registerSessionControls(segunda);

    stopWellnessSession();

    expect(segunda.stop).toHaveBeenCalledTimes(1);
    expect(primera.stop).not.toHaveBeenCalled();
  });

  it('la baja devuelta desregistra, y no pisa a quien vino después', () => {
    const primera = makeControls();
    const baja = registerSessionControls(primera);
    const segunda = makeControls();
    registerSessionControls(segunda);

    // Baja tardía de la primera (su pantalla se desmonta después de que otra
    // sesión ya empezó): no debe dejar el slot vacío.
    baja();
    stopWellnessSession();

    expect(segunda.stop).toHaveBeenCalledTimes(1);
  });

  it('sin nadie registrado, parar no revienta y limpia el store igual', () => {
    useWellnessStore.getState().startSession({ type: 'meditation', sessionName: 'huérfana' });

    expect(() => stopWellnessSession()).not.toThrow();
    expect(useWellnessStore.getState().player.isPlaying).toBe(false);
  });

  it('parar limpia el estado del store aunque el control no lo haga', () => {
    useWellnessStore.getState().startSession({ type: 'binaural', sessionName: 'x' });
    registerSessionControls({ stop: () => {} }); // control mínimo: solo audio

    stopWellnessSession();

    expect(useWellnessStore.getState().player.isPlaying).toBe(false);
    expect(useWellnessStore.getState().player.type).toBeNull();
  });

  it('pause y resume son opcionales — un control que solo sabe parar no rompe', () => {
    registerSessionControls({ stop: jest.fn() });

    expect(() => pauseWellnessSession()).not.toThrow();
    expect(() => resumeWellnessSession()).not.toThrow();
  });
});

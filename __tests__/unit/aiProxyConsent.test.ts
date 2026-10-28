// El cerrojo del permiso vive en el único punto por el que pasa toda la IA.
// Si alguien lo quita, o añade un camino de IA que lo esquive, esto rompe.
import { AiConsentRequiredError, resetAiConsent, setAiConsentGranted } from '@/lib/aiConsent';
import { proxyChatFetch, proxyTranscribeFetch } from '@/lib/aiProxy';

jest.mock('@/app/config/env', () => ({ ENV: { aiProxyUrl: 'https://proxy.test/ai-proxy' } }));
jest.mock('@/storage/local', () => ({ readLocal: jest.fn(), writeLocal: jest.fn() }));
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 't' } } }) } },
}));

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({ ok: true, text: async () => 'ok' });
  (global as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  resetAiConsent();
});

describe('cerrojo de IA en el proxy', () => {
  it('sin permiso, el chat no hace ninguna petición', async () => {
    await expect(proxyChatFetch('anthropic', [])).rejects.toBeInstanceOf(AiConsentRequiredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sin permiso, la transcripción tampoco', async () => {
    await expect(proxyTranscribeFetch(new FormData())).rejects.toBeInstanceOf(AiConsentRequiredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con permiso, sale la petición con el token del usuario', async () => {
    setAiConsentGranted(true);
    await proxyChatFetch('anthropic', []);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer t');
  });
});

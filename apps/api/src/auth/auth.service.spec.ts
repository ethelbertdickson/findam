import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService, isAllowedDesktopRedirectUri } from './auth.service';

const verifier = 'a'.repeat(43);
const base = {
  code: 'authorization-code',
  codeVerifier: verifier,
  redirectUri: 'http://127.0.0.1:45678/oauth2/callback/',
  clientId: 'desktop-client-id.apps.googleusercontent.com',
};

function createService() {
  const config = {
    get: jest.fn((key: string) => ({
      'google.desktopClientId': base.clientId,
      'google.desktopClientSecret': 'server-only-secret',
    } as Record<string, string>)[key]),
  };
  return new AuthService({} as never, {} as never, {} as never, config as never);
}

describe('ProjectorPro desktop Google OAuth', () => {
  afterEach(() => jest.restoreAllMocks());

  it('accepts only loopback callback URIs', () => {
    expect(isAllowedDesktopRedirectUri(base.redirectUri)).toBe(true);
    expect(isAllowedDesktopRedirectUri('https://example.com/oauth2/callback/')).toBe(false);
    expect(isAllowedDesktopRedirectUri('http://127.0.0.1:45678/other')).toBe(false);
  });

  it('rejects an unrecognised client before contacting Google', async () => {
    const service = createService();
    const fetchSpy = jest.spyOn(global, 'fetch');
    await expect(service.googleDesktop({ ...base, clientId: 'wrong-client-id.apps.googleusercontent.com' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects non-loopback redirects before contacting Google', async () => {
    const service = createService();
    const fetchSpy = jest.spyOn(global, 'fetch');
    await expect(service.googleDesktop({ ...base, redirectUri: 'https://example.com/oauth2/callback/' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('exchanges the code and passes the returned ID token to existing Google auth', async () => {
    const service = createService();
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ id_token: 'google-id-token' }) } as Response);
    const google = jest.spyOn(service, 'google').mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', user: {} as never });

    await expect(service.googleDesktop(base)).resolves.toEqual(expect.objectContaining({ accessToken: 'access' }));
    expect(google).toHaveBeenCalledWith('google-id-token');
  });

  it('does not expose values when Google rejects the authorization code', async () => {
    const service = createService();
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, json: async () => ({ error: 'invalid_grant' }) } as Response);
    await expect(service.googleDesktop(base)).rejects.toThrow('Invalid or expired Google authorization code');
  });
});

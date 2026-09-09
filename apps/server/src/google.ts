import { OAuth2Client } from 'google-auth-library';

// config-exempt: identity protocol and network bounds, not gameplay/economy tuning.
const MAX_TOKEN_BYTES = 16384, CERT_TIMEOUT_MS = 5000;
export type GoogleIdentity = { subject: string };

/** Server-only verifier. The caller must issue a session-bound nonce, then consume
 * it atomically with login. Verifying a token alone never grants a game session. */
export function googleVerifier(clientId: string | undefined, client = new OAuth2Client({
  transporterOptions: { timeout: CERT_TIMEOUT_MS, retryConfig: { retry: 0 } },
})) {
  if (clientId === undefined || clientId === '') return undefined;
  if (!/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)) throw Error('auth:invalidGoogleClientId');
  return async (credential: unknown, expectedNonce: string): Promise<GoogleIdentity> => {
    try {
      if (typeof credential !== 'string' || credential.length > MAX_TOKEN_BYTES ||
          !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(credential) ||
          !/^[a-f0-9]{64}$/.test(expectedNonce)) throw Error(); // config-exempt: 256-bit server nonce encoding
      const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
      const payload = ticket.getPayload();
      if (!payload || typeof payload.sub !== 'string' || !/^[\x21-\x7e]{1,255}$/.test(payload.sub) || // config-exempt: OIDC subject maximum length
          payload.nonce !== expectedNonce || payload.azp !== undefined && payload.azp !== clientId ||
          !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) ||
          payload.iat < 0 || payload.exp <= payload.iat || payload.exp * 1000 <= Date.now()) throw Error(); // config-exempt: JWT NumericDate seconds to milliseconds
      // Google's immutable sub owns the account; email/profile claims are not identity keys.
      return { subject: payload.sub };
    } catch {
      // SDK errors can include the credential/payload. Never leak them into HTTP or logs.
      throw Error('auth:googleVerificationFailed');
    }
  };
}

import axios from 'axios';

const DEFAULT_SAFETY_WINDOW_MS = 60_000;

export function createTokenManager({
  tokenUrl,
  clientId,
  clientSecret,
  safetyWindowMs = DEFAULT_SAFETY_WINDOW_MS,
  httpClient = axios,
}) {
  if (!tokenUrl) {
    throw new Error('Missing tokenUrl for token manager');
  }

  if (!clientId) {
    throw new Error('Missing clientId for token manager');
  }

  if (!clientSecret) {
    throw new Error('Missing clientSecret for token manager');
  }

  let accessToken = null;
  let expiresAt = 0;
  let refreshPromise = null;

  const isTokenValid = () => {
    if (!accessToken) {
      return false;
    }

    return Date.now() + safetyWindowMs < expiresAt;
  };

  const fetchToken = async () => {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await httpClient.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token: newToken, expires_in: expiresIn } = response.data ?? {};

    if (!newToken) {
      throw new Error('Unable to retrieve access token');
    }

    const expiresInMs = Number(expiresIn) * 1000;
    const computedExpiry =
      Number.isFinite(expiresInMs) && expiresInMs > 0 ? Date.now() + expiresInMs : Date.now() + safetyWindowMs;

    accessToken = newToken;
    expiresAt = computedExpiry;

    return accessToken;
  };

  const getAccessToken = async () => {
    if (isTokenValid()) {
      return accessToken;
    }

    if (!refreshPromise) {
      refreshPromise = fetchToken();
    }

    try {
      await refreshPromise;
    } finally {
      refreshPromise = null;
    }

    return accessToken;
  };

  const invalidate = () => {
    accessToken = null;
    expiresAt = 0;
  };

  return {
    getAccessToken,
    invalidate,
  };
}

import axios from 'axios';

const setAuthHeader = (headers, token) => {
  if (!headers) {
    return { Authorization: `Bearer ${token}` };
  }

  if (typeof headers.set === 'function') {
    headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
};

export function createAuthorizedClient({ tokenManager, axiosConfig = {} }) {
  if (!tokenManager) {
    throw new Error('tokenManager instance is required');
  }

  const client = axios.create(axiosConfig);

  client.interceptors.request.use(async (config) => {
    const token = await tokenManager.getAccessToken();
    config.headers = setAuthHeader(config.headers, token);
    return config;
  });

  return client;
}

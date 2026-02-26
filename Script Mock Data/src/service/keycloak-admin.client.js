import { createAuthorizedClient } from './http-client.js';

export function createKeycloakAdminClient({ baseURL, tokenManager, realm }) {
  if (!baseURL) throw new Error('Missing KEYCLOAK_BASE_URL configuration');
  if (!realm) throw new Error('Missing KEYCLOAK_REALM configuration');
  if (!tokenManager) throw new Error('tokenManager is required for KeycloakAdminClient');

  const client = createAuthorizedClient({
    tokenManager,
    axiosConfig: {
      baseURL,
      headers: { Accept: 'application/json' },
    },
  });

  const base = `/admin/realms/${encodeURIComponent(realm)}`;

  const createUser = async (user) => {
    const resp = await client.post(`${base}/users`, user, { validateStatus: () => true });
    if (resp.status >= 200 && resp.status < 300) return resp;
    const msg = resp.data?.errorMessage || resp.statusText || 'Keycloak createUser failed';
    const err = new Error(msg);
    err.response = resp;
    throw err;
  };

  const findUserByUsername = async (username) => {
    const resp = await client.get(`${base}/users`, { params: { username } });
    return Array.isArray(resp.data) ? resp.data[0] : null;
  };

  const getRealmRole = async (roleName) => {
    const resp = await client.get(`${base}/roles/${encodeURIComponent(roleName)}`);
    return resp.data;
  };

  const assignRealmRolesToUser = async (userId, roles) => {
    await client.post(`${base}/users/${encodeURIComponent(userId)}/role-mappings/realm`, roles);
  };

  const getAllUsers = async () => {
    // Paginated fetch of all users
    const pageSize = 500; // max users per request
    let first = 0;
    const keycloakUsers = [];
    const base = `/admin/realms/${encodeURIComponent(realm)}`;

    while (true) {
      const resp = await client.get(`${base}/users`, {
        params: {
          first, // offset
          max: pageSize,
        },
      });

      const batch = Array.isArray(resp.data) ? resp.data : [];
      keycloakUsers.push(...batch);

      if (batch.length < pageSize) {
        break;
      }

      first += pageSize;
    }

    return keycloakUsers;
  };

  return { createUser, findUserByUsername, getRealmRole, assignRealmRolesToUser, getAllUsers, client };
}

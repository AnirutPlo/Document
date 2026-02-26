import FormData from 'form-data';
import { createAuthorizedClient } from './http-client.js';

export function createEmrApiClient({ baseURL, tokenManager }) {
  if (!baseURL) {
    throw new Error('Missing EMR_API_URL configuration');
  }

  if (!tokenManager) {
    throw new Error('tokenManager is required for EmrApiClient');
  }

  const client = createAuthorizedClient({
    tokenManager,
    axiosConfig: {
      baseURL,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  });

  const createVisit = async (patientId, visitData) => {
    if (!patientId) {
      throw new Error('patientId is required');
    }
    if (!visitData || typeof visitData !== 'object') {
      throw new Error('visitData object is required');
    }

    const response = await client.post(`/patients/${patientId}/visits`, visitData);
    return response.data;
  };

  return {
    createVisit,
    client,
  };
}

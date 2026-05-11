import FormData from 'form-data';
import { createAuthorizedClient } from './http-client.js';

export function createDemographicApiClient({ baseURL, tokenManager }) {
  if (!baseURL) {
    throw new Error('Missing DEMOGRAPHIC_API_URL configuration');
  }

  if (!tokenManager) {
    throw new Error('tokenManager is required for DemographicApiClient');
  }

  const client = createAuthorizedClient({
    tokenManager,
    axiosConfig: {
      baseURL,
      headers: {
        Accept: 'application/json',
      },
    },
  });

  const createPatient = async (patientData) => {
    if (!patientData || typeof patientData !== 'object') {
      throw new Error('patientData object is required');
    }

    const form = new FormData();
    form.append('data', JSON.stringify(patientData));

    const response = await client.post('/patients', form, {
      headers: form.getHeaders(),
    });

    return response.data;
  };

  return {
    createPatient,
    client,
  };
}

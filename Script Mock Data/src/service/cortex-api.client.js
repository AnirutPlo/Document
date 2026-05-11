import fs from 'node:fs';
import FormData from 'form-data';
import { createAuthorizedClient } from './http-client.js';

export function createCortexApiClient({ baseURL, tokenManager }) {
  if (!baseURL) {
    throw new Error('Missing CORTEX_API_URL configuration');
  }

  if (!tokenManager) {
    throw new Error('tokenManager is required for CortexApiClient');
  }

  const client = createAuthorizedClient({
    tokenManager,
    axiosConfig: {
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  });

  const importCsv = async (path, csvFilePath) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(csvFilePath));

    const response = await client.post(path, form, {
      headers: form.getHeaders(),
    });

    return response.data;
  };

  return {
    importCsv,
    client,
  };
}

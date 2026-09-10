import { apiClient } from './api';
export async function createService(input: Record<string, unknown>) { const { data } = await apiClient.post('/services', input); return data; }

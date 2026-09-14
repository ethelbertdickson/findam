import { apiClient } from './api';
export async function createService(input: Record<string, unknown>) { const { data } = await apiClient.post('/services', input); return data; }
export async function fetchMyServices() { const { data } = await apiClient.get('/services/mine'); return data as Array<{ id: string; title: string; description: string; category: string; status: string }>; }

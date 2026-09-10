import { apiClient } from './api';
import type { ProfessionalCategory } from '../types';

export type UserRequestType = 'PROPERTY' | 'CO_RENTING' | 'LAND' | 'HOUSEHOLD' | 'PROFESSIONAL' | 'SERVICE';
export interface UserRequest { id: string; type: UserRequestType; title: string; description: string; status: string; city?: { name: string } | null; serviceCategory?: ProfessionalCategory | null; }
export async function createRequest(input: Record<string, unknown>) { const { data } = await apiClient.post<UserRequest>('/requests', input); return data; }
export async function fetchRequests(params: Record<string, unknown> = {}) { const { data } = await apiClient.get<UserRequest[]>('/requests', { params }); return data; }

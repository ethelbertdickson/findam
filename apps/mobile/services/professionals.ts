import { apiClient } from "./api";
import type { ProfessionalCategory, ProfessionalProfile } from "../types";

export interface ProfessionalFilters {
  q?: string;
  category?: ProfessionalCategory;
  countryId?: string;
  stateId?: string;
  cityId?: string;
}

export async function fetchProfessionals(filters: ProfessionalFilters = {}) {
  const { data } = await apiClient.get<ProfessionalProfile[]>("/professionals", { params: filters });
  return data;
}

export async function fetchProfessional(id: string) {
  const { data } = await apiClient.get<ProfessionalProfile>(`/professionals/${id}`);
  return data;
}

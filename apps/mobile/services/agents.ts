import { apiClient } from "./api";
import type { Agent, AgentRating, Listing } from "../types";
import type { ListingPage } from "./listings";

export async function fetchAgent(id: string) {
  const { data } = await apiClient.get<Agent>(`/agents/${id}`);
  return data;
}
export async function fetchMyAgentProfile() {
  const { data } = await apiClient.get<Agent | null>("/agents/me/profile");
  return data;
}
export async function fetchAgentListings(id: string) {
  const { data } = await apiClient.get<ListingPage>(`/agents/${id}/listings`);
  return data;
}
export async function fetchAgentRatings(id: string) {
  const { data } = await apiClient.get<{ items: AgentRating[] }>(
    `/agents/${id}/ratings`,
  );
  return data;
}
export async function rateAgent(
  id: string,
  input: Omit<AgentRating, "id" | "createdAt" | "author">,
) {
  const { data } = await apiClient.post(`/agents/${id}/ratings`, input);
  return data;
}
export async function saveAgentProfile(input: {
  agencyName?: string;
  whatsapp?: string;
  bio?: string;
  areasCovered?: string[];
}) {
  const { data } = await apiClient.post<Agent>("/agents/me", input);
  return data;
}

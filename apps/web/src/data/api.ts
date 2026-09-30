const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type SeasonCapabilities = {
  year: number;
  features: Record<string, boolean>;
};

export function loadSeasonCapabilities(year: number) {
  return getJson<SeasonCapabilities>(`/seasons/${year}/capabilities`);
}

export function loadSeasonEvents(year: number) {
  return getJson(`/seasons/${year}/events`);
}

export function loadRaceResults(year: number, round: number) {
  return getJson(`/seasons/${year}/events/${round}/results`);
}

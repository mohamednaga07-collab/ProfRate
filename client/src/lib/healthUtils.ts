import { apiRequest } from "./queryClient";

export async function fetchSystemHealth(): Promise<number> {
  // Call backend endpoint for health
  try {
    const res = await apiRequest("GET", "/api/health");
    const data = await res.json();
    // Expect { percent: number } in response
    return typeof data.percent === "number" ? data.percent : 0;
  } catch {
    return 0;
  }
}

import { QueryClient, QueryFunction } from "@tanstack/react-query";

let csrfToken: string | null = null;

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch("/api/auth/csrf-token");
    if (res.ok) {
      const data = await res.json();
      csrfToken = data.csrfToken;
      return csrfToken;
    }
  } catch (e) {
    console.error("Failed to fetch CSRF token", e);
  }
  return null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    let parsedJson: any = undefined;
    let textBody: string | undefined = undefined;
    try {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        parsedJson = await res.json();
        errorMessage = parsedJson.error ? `${parsedJson.message}: ${parsedJson.error}` : (parsedJson.message || errorMessage);
      } else {
        textBody = await res.text();
        errorMessage = textBody || errorMessage;
      }
    } catch (e) {
      // If parsing fails, fall back to statusText
    }

    const err: any = new Error(errorMessage);
    // Attach useful details so callers can make smarter UI decisions
    err.status = res.status;
    err.responseJson = parsedJson;
    err.responseText = textBody;
    throw err;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  retryCount = 0
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    const token = await getCsrfToken();
    if (token) {
      headers["X-CSRF-Token"] = token;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // If CSRF token is invalid/expired, the server returns 403.
  // We should fetch a fresh token and retry the request exactly once.
  if (!res.ok && res.status === 403 && retryCount === 0) {
    csrfToken = null; // Clear cached token
    return apiRequest(method, url, data, 1); // Retry with a fresh token
  }

  await throwIfResNotOk(res);
  return res;
}

// Prefetch CSRF token to reduce latency on first POST
export async function prefetchCsrfToken() {
  try {
    await getCsrfToken();
  } catch {
    // ignore
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Always refetch auth queries on page load
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

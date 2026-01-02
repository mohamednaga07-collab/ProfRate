import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnMount: "stale", // Refetch on mount if stale
    staleTime: 0, // Always considered stale
    gcTime: 0, // Don't cache in garbage collection
  });

  // Only authenticated if we have a real user from the server
  const isAuthenticated = !!user;

  const logout = async () => {
    try {
      await fetch("/api/auth/logout-custom", { method: "POST" });
    } catch (e) {
      // ignore errors
    }
    window.location.href = "/";
  };

  return {
    user: user ?? undefined,
    isLoading,
    isAuthenticated,
    logout,
  };
}

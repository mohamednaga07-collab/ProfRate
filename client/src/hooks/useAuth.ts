import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnMount: true,
    staleTime: 60000, // Consider data fresh for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Only authenticated if we have a real user from the server
  const isAuthenticated = !!user;

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      // Always redirect to home, even if the request fails
      window.location.href = "/";
    }
  };

  return {
    user: user ?? undefined,
    isLoading,
    isAuthenticated,
    logout,
  };
}

import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

export function useAuth() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnMount: true,
    staleTime: 60000,
    gcTime: 300000,
  });

  const isAuthenticated = !!user;

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      // Clear user data in cache to trigger instant UI update
      queryClient.setQueryData(["/api/auth/user"], null);
      // SPA navigation instead of hard reload
      setLocation("/");
    }
  };

  return {
    user: user ?? undefined,
    isLoading,
    isAuthenticated,
    logout,
  };
}

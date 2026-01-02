import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, BarChart3, Home, Star, LogOut, User, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function Header() {
  const { user, isAuthenticated, isLoading, logout, devMode } = useAuth();
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/doctors?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleLogout = () => {
    if (devMode) {
      logout();
    } else {
      window.location.href = "/api/logout";
    }
  };

  const userInitials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "U";

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "teacher":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <GraduationCap className="h-7 w-7 text-primary" />
          <span className="font-bold text-xl hidden sm:inline">ProfRate</span>
        </Link>

        {isAuthenticated && (
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search professors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4"
                data-testid="input-search"
              />
            </div>
          </form>
        )}

        <nav className="flex items-center gap-2">
          {isAuthenticated && (
            <>
              <Button
                asChild
                variant={location === "/" ? "secondary" : "ghost"}
                className="hidden sm:inline-flex"
                data-testid="link-home"
              >
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Link>
              </Button>
              <Button
                asChild
                variant={location === "/doctors" ? "secondary" : "ghost"}
                className="hidden sm:inline-flex"
                data-testid="link-doctors"
              >
                <Link href="/doctors">
                  <Star className="h-4 w-4 mr-2" />
                  Rate
                </Link>
              </Button>
              <Button
                asChild
                variant={location === "/compare" ? "secondary" : "ghost"}
                className="hidden sm:inline-flex"
                data-testid="link-compare"
              >
                <Link href="/compare">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Compare
                </Link>
              </Button>
            </>
          )}

          <LanguageSwitcher />
          <ThemeToggle />

          {isLoading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full p-0"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.profileImageUrl ?? undefined} alt={user.firstName ?? "User"} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    <Badge variant={getRoleBadgeVariant(user.role)} className="w-fit mt-2">
                      {user.role}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="sm:hidden">
                  <Link href="/">
                    <Home className="h-4 w-4 mr-2" />
                    Home
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="sm:hidden">
                  <Link href="/doctors">
                    <Star className="h-4 w-4 mr-2" />
                    Rate Professors
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="sm:hidden">
                  <Link href="/compare">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Compare
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="sm:hidden" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => {
              if (devMode) {
                // Check if already on landing page
                if (location === '/') {
                  // Already on landing page - just show the form and scroll
                  localStorage.setItem('showRoleSelect', '1');
                  
                  // Multiple scroll attempts to ensure it works
                  setTimeout(() => {
                    const authForm = document.getElementById('auth-form-container');
                    if (authForm) {
                      // Method 1: scrollIntoView
                      authForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      
                      // Method 2: Direct window scroll as backup
                      setTimeout(() => {
                        const rect = authForm.getBoundingClientRect();
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        window.scrollTo({
                          top: scrollTop + rect.top - 150,
                          behavior: 'smooth'
                        });
                      }, 100);
                    }
                  }, 50);
                } else {
                  // Not on landing page - navigate first
                  localStorage.setItem('showRoleSelect', '1');
                  navigate('/');
                  
                  // Scroll after navigation completes
                  setTimeout(() => {
                    const authForm = document.getElementById('auth-form-container');
                    if (authForm) {
                      authForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 400);
                }
              } else {
                // In production, use server-side auth
                window.location.href = '/api/login';
              }
            }} data-testid="button-login">
              Log in
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { RoleBasedProfileMenu } from "./RoleBasedProfileMenu";
import { ProfilePictureUpload } from "./ProfilePictureUpload";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, BarChart3, Home, Star, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function Header() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/doctors?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleLogout = () => {
    logout();
  };

  const isLanding = location === "/";
  const headerOpacity = isLanding && !isScrolled ? "bg-transparent border-transparent" : "bg-background/98 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 border-b shadow-sm";

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${headerOpacity}`}>
      <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <GraduationCap className="h-7 w-7 text-primary" />
          <span className="font-bold text-xl hidden sm:inline">{t("brand.name")}</span>
        </Link>

        {isAuthenticated && (
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("doctors.searchPlaceholder")}
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
                  {t("nav.home")}
                </Link>
              </Button>
              {user?.role === "student" && (
                <Button
                  asChild
                  variant={location === "/doctors" ? "secondary" : "ghost"}
                  className="hidden sm:inline-flex"
                  data-testid="link-doctors"
                >
                  <Link href="/doctors">
                    <Star className="h-4 w-4 mr-2" />
                    {t("nav.rate")}
                  </Link>
                </Button>
              )}
              <Button
                asChild
                variant={location === "/compare" ? "secondary" : "ghost"}
                className="hidden sm:inline-flex"
                data-testid="link-compare"
              >
                <Link href="/compare">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {t("nav.compare")}
                </Link>
              </Button>
            </>
          )}

          <div className="flex items-center gap-2 border-l pl-2 ml-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          {isLoading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated && user ? (
            <RoleBasedProfileMenu
              user={user}
              onLogout={handleLogout}
              trigger={
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full p-0"
                  data-testid="button-user-menu"
                >
                  <ProfilePictureUpload 
                    user={user} 
                    size="sm" 
                    showEditButton={false}
                  />
                </Button>
              }
            />
          ) : (
            <Button onClick={() => {
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
            }} data-testid="button-login">
              {t("auth.login")}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

import { useLocation } from "wouter";
import { Settings, BarChart3, Users, Trophy, FileText, Clock, MessageCircle, Zap, Crown, BookOpen, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { User } from "@shared/schema";
import { ProfilePictureUpload } from "./ProfilePictureUpload";

interface RoleBasedProfileMenuProps {
  user: User;
  onLogout: () => void;
  trigger: React.ReactNode;
  align?: "start" | "center" | "end";
}

const roleColors = {
  admin: { bg: "from-red-500 to-red-600", accent: "text-red-500", badge: "destructive" as const },
  teacher: { bg: "from-blue-500 to-blue-600", accent: "text-blue-500", badge: "secondary" as const },
  student: { bg: "from-green-500 to-green-600", accent: "text-green-500", badge: "default" as const },
};

export function RoleBasedProfileMenu({
  user,
  onLogout,
  trigger,
  align = "end",
}: RoleBasedProfileMenuProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const userRole = (user.role as keyof typeof roleColors) || "student";
  const roleColor = roleColors[userRole];

  // Fetch admin stats for real user count
  const { data: adminStats } = useQuery<{ totalUsers: number; totalDoctors: number; totalReviews: number }>({
    queryKey: ["/api/admin/stats"],
    enabled: userRole === "admin",
    refetchInterval: userRole === "admin" ? 2000 : false, // Poll every 2s for live updates
  });

  // Health indicator state
  const [health, setHealth] = useState<'healthy' | 'degraded' | 'down'>('healthy');
  const [healthPercent, setHealthPercent] = useState(100);
  const [healthPulse, setHealthPulse] = useState(false);
  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/health");
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          // Map backend "ok" status to frontend "healthy" state
          const backendStatus = data.status === "ok" ? "healthy" : data.status;
          setHealth(backendStatus || 'healthy');
          setHealthPercent(typeof data.percent === 'number' ? data.percent : 100);
        } else {
          setHealth('degraded');
          setHealthPercent(60);
        }
      } catch {
        // If fetch fails completely, it's down
        setHealth('down');
        setHealthPercent(0);
      }
      setHealthPulse(true);
      setTimeout(() => setHealthPulse(false), 600);
    };
    checkHealth();
    const interval = setInterval(checkHealth, 3000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Role-specific menu items with handlers
  const getMenuItems = () => {
    const handleItemClick = (action: string) => {
      switch (action) {
        // Admin actions
        case "manage-users":
          navigate("/admin/users");
          toast({ title: t("admin.nav.manageUsers"), description: t("admin.nav.manageUsersDesc") });
          break;
        case "analytics":
          navigate("/admin/analytics");
          toast({ title: t("admin.nav.analytics"), description: t("admin.nav.analyticsDesc") });
          break;
        case "settings":
          navigate("/admin/settings");
          toast({ title: t("admin.nav.settings"), description: t("admin.nav.settingsDesc") });
          break;
        case "admin-panel":
          navigate("/admin");
          toast({ title: t("admin.nav.panel"), description: t("admin.nav.panelDesc") });
          break;
        case "profile-settings":
          navigate("/profile/settings");
          toast({ title: t("profile.settings"), description: t("profile.settingsDesc") });
          break;
        // Teacher actions
        case "my-courses":
          navigate("/teacher-dashboard");
          break;
        case "performance":
          navigate("/teacher-dashboard");
          toast({ title: t("teacher.nav.performance"), description: t("teacher.nav.performanceDesc") });
          break;
        case "feedback":
          toast({ title: t("teacher.nav.feedback"), description: t("teacher.nav.soon") });
          break;
        case "portfolio":
          toast({ title: t("teacher.nav.portfolio"), description: t("teacher.nav.soon") });
          break;
        // Student actions
        case "achievements":
          toast({ title: t("student.nav.achievements"), description: t("student.nav.soon") });
          break;
        case "ratings":
          navigate("/doctors");
          toast({ title: t("student.nav.ratings"), description: t("student.nav.ratingsDesc") });
          break;
        case "stats":
          toast({ title: t("student.nav.stats"), description: t("student.nav.soon") });
          break;
        case "recommendations":
          navigate("/doctors");
          toast({ title: t("student.nav.recommendations"), description: t("student.nav.soon") });
          break;
      }
      setIsOpen(false);
    };

    switch (userRole) {
      case "admin":
        return [
          { icon: BarChart3, label: t("admin.nav.analytics"), action: "analytics" },
          { icon: Settings, label: t("admin.nav.settings"), action: "settings" },
          { icon: Crown, label: t("admin.nav.panel"), action: "admin-panel" },
          { icon: BookOpen, label: t("profile.settings"), action: "profile-settings" },
        ];
      case "teacher":
        return [
          { icon: BookOpen, label: t("teacher.nav.courses"), action: "my-courses" },
          { icon: BarChart3, label: t("teacher.nav.performance"), action: "performance" },
          { icon: MessageCircle, label: t("teacher.nav.feedback"), action: "feedback" },
          { icon: FileText, label: t("teacher.nav.portfolio"), action: "portfolio" },
        ];
      case "student":
      default:
        return [
          { icon: Trophy, label: t("student.nav.achievements"), action: "achievements" },
          { icon: Clock, label: t("student.nav.ratings"), action: "ratings" },
          { icon: BarChart3, label: t("student.nav.stats"), action: "stats" },
          { icon: Zap, label: t("student.nav.recommendations"), action: "recommendations" },
        ];
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-80 p-0 overflow-hidden bg-gradient-to-b from-background to-background/95">
          {/* Header with Role Gradient */}
          <motion.div
            className={`relative bg-gradient-to-r ${roleColor.bg} p-6 text-white overflow-hidden`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar with Upload - Using new ProfilePictureUpload component */}
                <ProfilePictureUpload user={user} size="lg" />

                {/* User Info */}
                <div className="flex-1">
                  <p className="font-semibold text-lg leading-tight">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-white/80 text-sm">{user.email}</p>
                  <div className="mt-2">
                    <Badge variant={roleColor.badge} className="text-white font-semibold">
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <DropdownMenuSeparator className="m-0" />

          {/* Role-specific content area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="p-4"
          >
            {/* Role stats/badges section */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {userRole === "student" && (
                <>
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg p-2 border border-green-500/20 text-center">
                    <p className="text-xs text-muted-foreground">{t("profile.stats.ratings")}</p>
                    <p className="font-bold text-green-600">12</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-2 border border-blue-500/20 text-center">
                    <p className="text-xs text-muted-foreground">{t("profile.stats.streak")}</p>
                    <p className="font-bold text-blue-600">3 {t("common.days")}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg p-2 border border-purple-500/20 text-center">
                    <p className="text-xs text-muted-foreground">{t("profile.stats.points")}</p>
                    <p className="font-bold text-purple-600">450</p>
                  </div>
                </>
              )}
              {userRole === "teacher" && (
                <>
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-2 border border-blue-500/20 text-center">
                    <p className="text-xs text-muted-foreground">{t("profile.stats.rating")}</p>
                    <p className="font-bold text-blue-600">4.8</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg p-2 border border-purple-500/20 text-center">
                    <p className="text-xs text-muted-foreground">{t("profile.stats.students")}</p>
                    <p className="font-bold text-purple-600">240</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-lg p-2 border border-orange-500/20 text-center">
                    <p className="text-xs text-muted-foreground">{t("profile.stats.reviews")}</p>
                    <p className="font-bold text-orange-600">85</p>
                  </div>
                </>
              )}
              {userRole === "admin" && (
                <>
                  <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-lg p-2 border border-red-500/20 flex flex-col items-center">
                    <p className="text-xs text-muted-foreground">{t("admin.nav.manageUsers")}</p>
                    <motion.p className="font-bold text-red-600" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.4 }}>
                      <AnimatePresence mode="sync" initial={false}>
                        <motion.span key={adminStats?.totalUsers} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                          {adminStats?.totalUsers || 0}
                        </motion.span>
                      </AnimatePresence>
                    </motion.p>
                    {/* Manage button removed */}
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-lg p-2 border border-yellow-500/20 flex flex-col items-center">
                    <p className="text-xs text-muted-foreground">{t("admin.nav.manageDoctors")}</p>
                    <motion.p className="font-bold text-yellow-600" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.4 }}>
                      <AnimatePresence mode="sync" initial={false}>
                        <motion.span key={adminStats?.totalDoctors} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                          {adminStats?.totalDoctors || 0}
                        </motion.span>
                      </AnimatePresence>
                    </motion.p>
                    {/* Manage button removed */}
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-2 border border-blue-500/20 flex flex-col items-center">
                    <p className="text-xs text-muted-foreground">{t("admin.nav.manageReviews")}</p>
                    <motion.p className="font-bold text-blue-600" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.4 }}>
                      <AnimatePresence mode="sync" initial={false}>
                        <motion.span key={adminStats?.totalReviews} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                          {adminStats?.totalReviews || 0}
                        </motion.span>
                      </AnimatePresence>
                    </motion.p>
                    {/* Manage button removed */}
                  </div>
                  {/* Health indicator with percentage and bar */}
                  <div className="col-span-3 flex flex-col items-center justify-center mt-2">
                    <motion.div
                      className={`flex items-center gap-2 px-3 py-1 rounded-full border ${health === 'healthy' ? 'border-green-500 bg-green-500/10' : health === 'degraded' ? 'border-yellow-500 bg-yellow-500/10' : 'border-red-500 bg-red-500/10'}`}
                      animate={{ scale: healthPulse ? 1.1 : 1, boxShadow: healthPulse ? '0 0 8px 2px #22c55e' : 'none' }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className={`inline-block w-3 h-3 rounded-full ${health === 'healthy' ? 'bg-green-500' : health === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`}></span>
                      <span className="text-xs font-semibold">
                        {health === 'healthy' ? t("admin.stats.healthHealthy") : health === 'degraded' ? t("admin.stats.healthDegraded") : t("admin.stats.healthDown")}
                      </span>
                      <motion.span className="ml-2 text-xs font-bold" animate={{ color: health === 'healthy' ? '#22c55e' : health === 'degraded' ? '#eab308' : '#ef4444' }}>
                        {healthPercent}%
                      </motion.span>
                      <button className="ml-2 text-xs underline" onClick={() => window.location.reload()}>{t("common.refresh")}</button>
                    </motion.div>
                    <div className="w-40 h-2 mt-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-2 rounded-full ${health === 'healthy' ? 'bg-green-500' : health === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${healthPercent}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          <DropdownMenuSeparator className="m-0" />

          {/* Role-specific menu items */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="py-2"
          >
            {getMenuItems().map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.2 + index * 0.05 }}
              >
                <DropdownMenuItem asChild>
                  <button 
                    onClick={() => {
                      const handleItemClick = (action: string) => {
                        switch (action) {
                          // Admin actions
                          case "manage-users":
                            navigate("/admin");
                            break;
                          case "analytics":
                            navigate("/admin");
                            toast({ title: "Analytics", description: "View admin analytics dashboard" });
                            break;
                          case "settings":
                            toast({ title: "System Settings", description: "System settings coming soon!" });
                            break;
                          case "admin-panel":
                            navigate("/admin");
                            break;
                          // Teacher actions
                          case "my-courses":
                            navigate("/teacher-dashboard");
                            break;
                          case "performance":
                            navigate("/teacher-dashboard");
                            toast({ title: "Performance Stats", description: "View your teaching performance" });
                            break;
                          case "feedback":
                            toast({ title: "Student Feedback", description: "Student feedback coming soon!" });
                            break;
                          case "portfolio":
                            toast({ title: "Teaching Portfolio", description: "Your teaching portfolio coming soon!" });
                            break;
                          // Student actions
                          case "achievements":
                            toast({ title: "My Achievements", description: "Your achievements and badges coming soon!" });
                            break;
                          case "ratings":
                            navigate("/doctors");
                            toast({ title: "Recent Ratings", description: "View your rating history" });
                            break;
                          case "stats":
                            toast({ title: "Learning Stats", description: "Your learning statistics coming soon!" });
                            break;
                          case "recommendations":
                            navigate("/doctors");
                            toast({ title: "Recommendations", description: "Personalized recommendations coming soon!" });
                            break;
                        }
                        setIsOpen(false);
                      };
                      handleItemClick((item as any).action);
                    }}
                    className="w-full flex items-center gap-3 cursor-pointer text-foreground hover:bg-primary/10 px-4 py-2 transition-colors"
                  >
                    <item.icon className={`h-4 w-4 ${roleColor.accent}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </DropdownMenuItem>
              </motion.div>
            ))}
          </motion.div>

          <DropdownMenuSeparator className="m-0" />

          {/* Settings and Logout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="py-2"
          >
            <DropdownMenuItem
              onClick={() => {
                navigate("/profile/settings");
                setIsOpen(false);
              }}
              className="cursor-pointer text-foreground hover:bg-primary/10 px-4 py-2 transition-colors"
            >
              <Settings className="h-4 w-4 mr-3" />
              <span className="text-sm font-medium">{t("profile.settings", { defaultValue: "Profile Settings" })}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onLogout}
              className="cursor-pointer text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-4 py-2 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" />
              <span className="text-sm font-medium">{t("auth.logout")}</span>
            </DropdownMenuItem>
          </motion.div>
        </DropdownMenuContent>
      </DropdownMenu>
  );
}

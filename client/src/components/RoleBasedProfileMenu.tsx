import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { Upload, Settings, BarChart3, Users, Trophy, FileText, Clock, MessageCircle, Zap, Crown, BookOpen, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";

interface RoleBasedProfileMenuProps {
  user: User;
  onLogout: () => void;
  onProfilePictureChange?: (file: File) => Promise<void>;
  isLoadingProfilePicture?: boolean;
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
  onProfilePictureChange,
  isLoadingProfilePicture = false,
  trigger,
  align = "end",
}: RoleBasedProfileMenuProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const userRole = (user.role as keyof typeof roleColors) || "student";
  const roleColor = roleColors[userRole];
  const userInitials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U";

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target?.result as string;
        
        try {
          const response = await apiRequest("POST", "/api/auth/upload-profile-picture", {
            imageData,
          });
          const result = await response.json();
          
          if (result.user) {
            // Update query cache with new user data
            queryClient.setQueryData(["/api/auth/user"], result.user);
            
            toast({
              title: "Success!",
              description: "Profile picture updated successfully",
            });
          }
        } catch (error: any) {
          toast({
            title: "Upload failed",
            description: error.message || "Failed to update profile picture",
            variant: "destructive",
          });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Role-specific menu items
  const getMenuItems = () => {
    switch (userRole) {
      case "admin":
        return [
          { icon: Users, label: "Manage Users", href: "#" },
          { icon: BarChart3, label: "Dashboard Analytics", href: "#" },
          { icon: Settings, label: "System Settings", href: "#" },
          { icon: Crown, label: "Admin Panel", href: "#" },
        ];
      case "teacher":
        return [
          { icon: BookOpen, label: "My Courses", href: "#" },
          { icon: BarChart3, label: "Performance Stats", href: "#" },
          { icon: MessageCircle, label: "Student Feedback", href: "#" },
          { icon: FileText, label: "Teaching Portfolio", href: "#" },
        ];
      case "student":
      default:
        return [
          { icon: Trophy, label: "My Achievements", href: "#" },
          { icon: Clock, label: "Recent Ratings", href: "#" },
          { icon: BarChart3, label: "Learning Stats", href: "#" },
          { icon: Zap, label: "Recommendations", href: "#" },
        ];
    }
  };

  return (
    <>
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
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
                {/* Avatar with Upload */}
                <motion.div
                  className="relative group cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleProfilePictureClick}
                >
                  <Avatar className="h-16 w-16 border-4 border-white/30 group-hover:border-white transition-colors">
                    <AvatarImage src={user.profileImageUrl ?? undefined} alt={user.firstName ?? "User"} />
                    <AvatarFallback className={`text-white font-bold text-lg bg-gradient-to-br ${roleColor.bg}`}>
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    whileHover={{ opacity: 1 }}
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-white" />
                    )}
                  </motion.div>
                </motion.div>

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
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg p-2 border border-green-500/20">
                    <p className="text-xs text-muted-foreground">Ratings</p>
                    <p className="font-bold text-green-600">12</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-2 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground">Streak</p>
                    <p className="font-bold text-blue-600">3 days</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg p-2 border border-purple-500/20">
                    <p className="text-xs text-muted-foreground">Points</p>
                    <p className="font-bold text-purple-600">450</p>
                  </div>
                </>
              )}
              {userRole === "teacher" && (
                <>
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-2 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <p className="font-bold text-blue-600">4.8</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg p-2 border border-purple-500/20">
                    <p className="text-xs text-muted-foreground">Students</p>
                    <p className="font-bold text-purple-600">240</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-lg p-2 border border-orange-500/20">
                    <p className="text-xs text-muted-foreground">Reviews</p>
                    <p className="font-bold text-orange-600">85</p>
                  </div>
                </>
              )}
              {userRole === "admin" && (
                <>
                  <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-lg p-2 border border-red-500/20">
                    <p className="text-xs text-muted-foreground">Users</p>
                    <p className="font-bold text-red-600">1.2K</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-lg p-2 border border-yellow-500/20">
                    <p className="text-xs text-muted-foreground">Activity</p>
                    <p className="font-bold text-yellow-600">98%</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-2 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground">System</p>
                    <p className="font-bold text-blue-600">🟢</p>
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
                  <button className="w-full flex items-center gap-3 cursor-pointer text-foreground hover:bg-primary/10 px-4 py-2 transition-colors">
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
            <DropdownMenuItem asChild>
              <button className="w-full flex items-center gap-3 cursor-pointer text-foreground hover:bg-primary/10 px-4 py-2 transition-colors">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Profile Settings</span>
              </button>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onLogout}
              className="cursor-pointer text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-4 py-2 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" />
              <span className="text-sm font-medium">Logout</span>
            </DropdownMenuItem>
          </motion.div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

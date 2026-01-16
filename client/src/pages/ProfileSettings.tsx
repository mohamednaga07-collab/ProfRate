import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, Shield, Camera, Lock, BookOpen, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";

// Role-based theme configuration
const roleThemes = {
  admin: {
    gradient: "from-red-500 via-pink-500 to-purple-600",
    accent: "text-red-500",
    badgeVariant: "destructive" as const,
    icon: Shield,
  },
  teacher: {
    gradient: "from-blue-500 via-indigo-500 to-purple-600",
    accent: "text-blue-500",
    badgeVariant: "default" as const,
    icon: BookOpen,
  },
  student: {
    gradient: "from-green-500 via-emerald-500 to-teal-600",
    accent: "text-green-500",
    badgeVariant: "secondary" as const,
    icon: Star,
  },
};

// Animation variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const headerVariants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } },
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: (index: number) => ({ 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.3, delay: 0.2 + index * 0.1 } 
  }),
};

export default function ProfileSettings() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change Username State
  const [newUsername, setNewUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingUsername, setIsChangingUsername] = useState(false);

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Faster compression & smaller file
      };
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: t("profile.upload.error.type"),
        description: t("profile.upload.error.typeDesc"),
        variant: "destructive",
      });
      return;
    }

    // Backend handles up to 15-20MB, but we'll compress for speed
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: t("profile.upload.error.size"),
        description: t("profile.upload.error.sizeDesc"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);

      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          let imageData = reader.result as string;

          // Compress if not a GIF
          if (file.type !== 'image/gif') {
            imageData = await compressImage(imageData);
          }

          // Optimistic Update: Update global user cache IMMEDIATELY
          // This syncs Header, Sidebar, and Profile Page instantly
          queryClient.setQueryData(["/api/auth/user"], (oldUser: any) => {
            if (!oldUser) return oldUser;
            return {
              ...oldUser,
              profileImageUrl: imageData, // Use base64 immediately
              updatedAt: new Date().toISOString() // Force re-render of URLs checking timestamps
            };
          });

          await apiRequest("POST", "/api/auth/upload-profile-picture", {
            imageData,
          });

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });

          toast({
            title: t("profile.upload.success"),
            description: t("profile.upload.successDesc"),
          });
        } catch (error: any) {
          console.error("Upload failed", error);
          toast({
            title: t("profile.upload.error.failed"),
            description: error.message || t("profile.upload.error.failedDesc"),
            variant: "destructive",
          });
        } finally {
          setIsUploading(false);
          if (event.target) event.target.value = '';
        }
      };

      reader.onerror = () => {
        setIsUploading(false);
        toast({
          title: t("profile.upload.error.read"),
          variant: "destructive",
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !confirmPassword) return;

    if (newUsername.length < 3) {
      toast({
        title: t("profile.username.error.short"),
        description: t("profile.username.error.shortDesc", { defaultValue: "Username must be at least 3 characters." }),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsChangingUsername(true);
      const res: any = await apiRequest("POST", "/api/auth/change-username", {
         newUsername,
         currentPassword: confirmPassword
      });
      const data = await res.json();
      
      if (res.ok) {
        queryClient.setQueryData(["/api/auth/user"], data.user);
        toast({
          title: t("profile.username.success", { defaultValue: "Username Updated" }),
          description: t("profile.username.successDesc", { defaultValue: "Your username has been changed successfully." }),
        });
        setNewUsername("");
        setConfirmPassword("");
      } else {
        throw new Error(data.message || "Failed to update username");
      }
    } catch (error: any) {
       toast({
        title: t("profile.username.error", { defaultValue: "Error" }),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChangingUsername(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Get role theme (default to student if role not found)
  const userRole = (user.role || "student") as keyof typeof roleThemes;
  const theme = roleThemes[userRole];
  const RoleIcon = theme.icon;

  return (
    <motion.div 
      className="min-h-screen bg-background"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Animated Gradient Header Banner */}
        <motion.div
          variants={headerVariants}
          initial="initial"
          animate="animate"
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${theme.gradient} p-8 mb-8 shadow-2xl`}
        >
          <div className="absolute inset-0 bg-black/10" />
          
          {/* Background decoration circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
          
          <div className="relative z-10">
            {/* Avatar overlapping banner */}
            <div className="absolute -bottom-8 left-8">
              <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                <Avatar className="h-32 w-32 border-4 border-background shadow-2xl transition-transform hover:scale-105">
                  <AvatarImage 
                    src={user.profileImageUrl?.includes("...") 
                      ? `/api/profile-image/user/${user.id}?v=${user.updatedAt ? new Date(user.updatedAt).getTime() : '1'}` 
                      : user.profileImageUrl ?? undefined} 
                    alt={user.username || "User"} 
                    className="object-cover" 
                  />
                  <AvatarFallback className="text-4xl bg-primary/10 text-primary font-bold">
                    {(user.username || "U").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-8 w-8 text-white" />
                </div>
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center z-10">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <input
                type="file"
                title="Profile picture upload"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
            </div>

            {/* User Info - Right side */}
            <div className="ml-48 flex items-center justify-between">
              <div>
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <h1 className="text-3xl font-bold text-white">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user.username}
                  </h1>
                  <Badge variant={theme.badgeVariant} className="text-white font-semibold">
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </Badge>
                </motion.div>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-white/80 mt-1"
                >
                  @{user.username}
                </motion.p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Spacer for overlapping avatar */}
        <div className="h-8" />

        {/* Personal Information Card */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="initial"
          animate="animate"
        >
          <Card className="mb-6 border-0 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <User className={`h-5 w-5 ${theme.accent}`} />
                {t("profile.personalInfo")}
              </CardTitle>
              <CardDescription>{t("profile.personalInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className={`flex items-center gap-2 font-semibold ${theme.accent}`}>
                    <User className="h-4 w-4" />
                    {t("auth.username")}
                  </Label>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="font-medium">{user.username}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className={`flex items-center gap-2 font-semibold ${theme.accent}`}>
                    <Mail className="h-4 w-4" />
                    {t("profile.email")}
                  </Label>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="font-medium truncate">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className={`flex items-center gap-2 font-semibold ${theme.accent}`}>
                    <RoleIcon className="h-4 w-4" />
                    {t("profile.role")}
                  </Label>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <Badge variant={theme.badgeVariant} className="font-semibold">
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Change Username Card */}
        <motion.div
          custom={1}
          variants={cardVariants}
          initial="initial"
          animate="animate"
        >
          <Card className="mb-6 border-0 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <User className={`h-5 w-5 ${theme.accent}`} />
                {t("profile.changeUsername.title", { defaultValue: "Change Username" })}
              </CardTitle>
              <CardDescription>
                {t("profile.changeUsername.desc", { defaultValue: "Update your display name. Requires password verification." })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleChangeUsername} className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="new-username" className="font-semibold">
                     {t("profile.changeUsername.newLabel", "New Username")}
                   </Label>
                   <div className="relative">
                     <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                     <Input 
                        id="new-username"
                        value={newUsername} 
                        onChange={(e) => setNewUsername(e.target.value)} 
                        placeholder={t("profile.changeUsername.newPlaceholder", { defaultValue: "Enter new username" })}
                        className="pl-10 bg-background"
                     />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="confirm-pass" className="font-semibold">
                     {t("profile.changeUsername.passwordLabel", { defaultValue: "Verify with Password" })}
                   </Label>
                   <div className="relative">
                     <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                     <Input 
                        id="confirm-pass"
                        type="password"
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder={t("profile.changeUsername.passwordPlaceholder", { defaultValue: "Enter current password" })}
                        className="pl-10 bg-background"
                     />
                   </div>
                 </div>
                 <Button 
                   type="submit" 
                   disabled={isChangingUsername || !newUsername || !confirmPassword}
                   className={`w-full bg-gradient-to-r ${theme.gradient} hover:opacity-90 transition-opacity`}
                 >
                   {isChangingUsername ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("common.saving", { defaultValue: "Saving..." })}
                      </>
                   ) : (
                      t("profile.changeUsername.submit", { defaultValue: "Update Username" })
                   )}
                 </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </motion.div>
  );
}

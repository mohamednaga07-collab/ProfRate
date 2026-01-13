import { useState, useRef } from "react";
import { Camera, Loader2, X, ZoomIn } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";

interface ProfilePictureUploadProps {
  user: User;
  onUploadComplete?: () => void;
  size?: "sm" | "md" | "lg";
  showEditButton?: boolean;
}

export function ProfilePictureUpload({ 
  user, 
  onUploadComplete,
  size = "md",
  showEditButton = true 
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [showFullSize, setShowFullSize] = useState(false); // Show full-size image modal
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16"
  };

  const userInitials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U";

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
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Support up to 20MB for optimization
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum size is 20MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    console.log(`🖼️ Starting upload for ${file.type}...`);

    try {
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          let imageData = reader.result as string;
          
          // Only compress static images. GIFs are kept raw to preserve animation.
          if (file.type !== 'image/gif') {
            console.log('🖼️ Optimizing static image...');
            imageData = await compressImage(imageData);
          } else {
            console.log('🖼️ GIF detected: skipping compression.');
          }

          const csrfToken = await getCsrfToken();
          
          const response = await fetch("/api/auth/upload-profile-picture", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
            credentials: "include",
            body: JSON.stringify({ imageData }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Upload failed");
          }

          // Invalidate queries to reflect new image
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
          queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
          
          toast({
            title: "Success!",
            description: "Profile picture updated",
          });

          if (onUploadComplete) onUploadComplete();

        } catch (error: any) {
          console.error('🖼️ Upload error:', error);
          toast({
            title: "Upload failed",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setUploading(false);
          if (e.target) e.target.value = '';
        }
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('🖼️ Upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Upload failed",
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
        disabled={uploading}
        aria-label="Upload profile picture"
      />
      
      <Avatar 
        className={`${sizeClasses[size]} cursor-pointer transition-all hover:opacity-80 relative overflow-hidden`}
        onClick={() => {
          // If has profile image and edit button shown, open fullscreen or edit
          if (user.profileImageUrl) {
            if (showEditButton) {
              // Show fullscreen viewer when clicked
              setShowFullSize(true);
            }
          } else if (showEditButton) {
            // If no image and edit button shown, trigger upload
            fileInputRef.current?.click();
          }
        }}
      >
        {/* Only show fallback when there's no profile image */}
        {!user.profileImageUrl && (
          <AvatarFallback className="font-semibold z-0">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              userInitials
            )}
          </AvatarFallback>
        )}

        {/* Image layer with smooth crossfade animation */}
        <AnimatePresence mode="sync">
          {user.profileImageUrl && (
            <motion.div
              key={user.profileImageUrl.includes("...") ? `fallback-${user.id}-${user.updatedAt}` : user.profileImageUrl}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.2,
                ease: "easeInOut",
              }}
              className="absolute inset-0 z-10 w-full h-full"
              style={{ 
                willChange: "opacity",
                backfaceVisibility: "hidden",
              }}
            >
              <AvatarImage 
                src={user.profileImageUrl?.includes("...") 
                  ? `/api/profile-image/user/${user.id}?v=${user.updatedAt ? new Date(user.updatedAt).getTime() : '1'}` 
                  : user.profileImageUrl ?? undefined} 
                alt={user.firstName ?? "User"}
                className="w-full h-full object-cover" 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Avatar>

      {showEditButton && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50 z-20"
          title={t("components.profileUpload.clickToUpload", { defaultValue: "Click to upload a new profile picture" })}
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Camera className="h-3 w-3" />
          )}
        </button>
      )}

      {/* Full-size image viewer modal */}
      <Dialog open={showFullSize} onOpenChange={setShowFullSize}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] p-0 border-0 bg-transparent shadow-none [&>button:not(.custom-close)]:hidden overflow-visible flex items-center justify-center">
          <div className="relative flex items-center justify-center p-0 m-0 overflow-hidden rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <DialogClose className="custom-close absolute start-3 top-3 z-[110] rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-all shadow-xl hover:scale-110">
              <X className="h-5 w-5" />
            </DialogClose>
            
            {user.profileImageUrl ? (
              <img 
                src={user.profileImageUrl?.includes("...") 
                  ? `/api/profile-image/user/${user.id}?v=${user.updatedAt ? new Date(user.updatedAt).getTime() : '1'}` 
                  : user.profileImageUrl ?? ""}
                alt="Profile View"
                className="max-w-full max-h-[90vh] object-contain block m-0 p-0"
              />
            ) : (
              <div className="bg-background text-center text-muted-foreground p-12 rounded-xl">
                <ZoomIn className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>{t("components.profileUpload.noPicture")}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper to get CSRF token
async function getCsrfToken(): Promise<string> {
  try {
    const res = await fetch("/api/auth/csrf-token");
    if (res.ok) {
      const data = await res.json();
      return data.csrfToken;
    }
  } catch (e) {
    console.error("Failed to fetch CSRF token", e);
  }
  return "";
}

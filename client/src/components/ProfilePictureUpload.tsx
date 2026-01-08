import { useState, useRef } from "react";
import { Camera, Loader2, X, ZoomIn } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
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
  const [imageKey, setImageKey] = useState(0); // Force re-render
  const [showFullSize, setShowFullSize] = useState(false); // Show full-size image modal
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16"
  };

  const userInitials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U";

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

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum size is 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    console.log('🖼️ Starting profile picture upload...');

    try {
      // Convert to base64
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const imageData = reader.result as string;
          console.log('🖼️ Image converted to base64, length:', imageData.length);

          // Get CSRF token
          const csrfToken = await getCsrfToken();
          console.log('🖼️ CSRF token obtained:', csrfToken ? 'yes' : 'no');

          // Upload to server
          console.log('🖼️ Sending upload request...');
          const response = await fetch("/api/auth/upload-profile-picture", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
            credentials: "include",
            body: JSON.stringify({ imageData }),
          });

          console.log('🖼️ Response status:', response.status, response.statusText);

          if (!response.ok) {
            const error = await response.json();
            console.error('🖼️ Upload error:', error);
            throw new Error(error.message || "Upload failed");
          }

          const result = await response.json();
          console.log('🖼️ Upload successful:', result);

          // Force image refresh
          setImageKey(prev => prev + 1);

          // Invalidate user query to update profile picture everywhere
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          
          toast({
            title: "Success!",
            description: "Profile picture updated",
          });

          // Callback for parent to refresh
          if (onUploadComplete) {
            onUploadComplete();
          }

          setUploading(false);

        } catch (error: any) {
          console.error('🖼️ Upload error:', error);
          toast({
            title: "Upload failed",
            description: error.message,
            variant: "destructive",
          });
          setUploading(false);
        }
      };

      reader.onerror = () => {
        console.error('🖼️ FileReader error');
        toast({
          title: "Error",
          description: "Failed to read file",
          variant: "destructive",
        });
        setUploading(false);
      };

      console.log('🖼️ Reading file as data URL...');
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
        className={`${sizeClasses[size]} cursor-pointer transition-all hover:opacity-80`}
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
        <AvatarImage 
          key={imageKey} // Force re-render when key changes
          src={user.profileImageUrl ?? undefined} 
          alt={user.firstName ?? "User"} 
        />
        <AvatarFallback className="font-semibold">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            userInitials
          )}
        </AvatarFallback>
      </Avatar>

      {showEditButton && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          title="Click to upload a new profile picture"
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
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 border bg-background">
          <DialogClose className="absolute right-4 top-4 z-50 rounded-md border border-input bg-background p-1.5 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <X className="h-5 w-5" />
          </DialogClose>
          
          <div className="flex items-center justify-center h-full w-full p-4">
            {user.profileImageUrl ? (
              <img 
                src={user.profileImageUrl}
                alt={`${user.firstName ?? "User"}'s profile picture`}
                className="max-w-full max-h-[80vh] rounded-lg object-contain"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <ZoomIn className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No profile picture</p>
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

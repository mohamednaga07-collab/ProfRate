import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Megaphone, Shield, Send, MessageCircle } from "lucide-react";

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-set the receiver ID (e.g. a specific teacher's user ID for DMs) */
  receiverId?: string;
  receiverName?: string;
  targetDoctorId?: number;
  /**
   * Force a specific message type and skip the type picker.
   * - "direct"           → anonymous student DM to a specific teacher
   * - "broadcast"        → admin-only broadcast to all users
   * - "feedback"         → student anonymous feedback sent to admins
   * - "support_request"  → teacher request sent to admins
   * - "broadcast_class"  → teacher announcement sent to all students
   */
  forcedType?: "direct" | "broadcast" | "feedback" | "support_request" | "broadcast_class";
  forceAnonymous?: boolean;
}

interface MessageType {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const MESSAGE_TYPES: Record<string, MessageType[]> = {
  admin: [
    {
      key: "broadcast",
      label: "Platform Announcement",
      description: "Send a maintenance notice or update to all users",
      icon: <Megaphone className="h-5 w-5 text-purple-500" />,
    },
  ],
  teacher: [
    {
      key: "broadcast_class",
      label: "Class Announcement",
      description: "Broadcast a message visible to all your students",
      icon: <Megaphone className="h-5 w-5 text-blue-500" />,
    },
    {
      key: "support_request",
      label: "Contact Admin",
      description: "Send a support request or question to the platform admins",
      icon: <Shield className="h-5 w-5 text-green-500" />,
    },
  ],
  student: [
    {
      key: "feedback",
      label: "Platform Feedback",
      description: "Send anonymous feedback to the admins",
      icon: <MessageCircle className="h-5 w-5 text-amber-500" />,
    },
  ],
};

export function SendMessageDialog({
  open,
  onOpenChange,
  receiverId,
  receiverName,
  targetDoctorId,
  forcedType,
  forceAnonymous = false,
}: SendMessageDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const role = user?.role ?? "student";
  const availableTypes = forcedType
    ? [] // Bypassed — uses forcedType directly
    : MESSAGE_TYPES[role] ?? [];

  const [selectedType, setSelectedType] = useState<string>(
    forcedType ?? availableTypes[0]?.key ?? "feedback"
  );

  const activeType = forcedType ?? selectedType;

  const sendMutation = useMutation({
    mutationFn: async () => {
      const csrfRes = await fetch("/api/auth/csrf-token");
      const { token } = await csrfRes.json();
      const body: any = {
        receiverId: receiverId ?? null,
        targetDoctorId: targetDoctorId ?? null,
        title,
        content,
        type: activeType,
        isAnonymous: forceAnonymous || activeType === "direct",
      };
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Message sent!", description: "Your message was delivered successfully." });
      setTitle("");
      setContent("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: () => {
      toast({ title: "Send failed", description: "Failed to send. Please try again.", variant: "destructive" });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({ title: "Missing fields", description: "Please fill in both subject and message.", variant: "destructive" });
      return;
    }
    sendMutation.mutate();
  };

  // The label to show above the form when a forcedType is used
  const forcedTypeInfo = forcedType
    ? (Object.values(MESSAGE_TYPES).flat().find(t => t.key === forcedType) ?? {
        label: forceAnonymous ? "Anonymous Message" : "Message",
        description: receiverName
          ? `This message will be sent anonymously to ${receiverName}. They will not know who you are.`
          : "Send a message.",
        icon: <Send className="h-5 w-5 text-primary" />,
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {forcedTypeInfo?.icon ?? <Send className="h-5 w-5 text-primary" />}
            {forcedTypeInfo?.label ?? "Compose Message"}
          </DialogTitle>
          <DialogDescription>
            {forcedTypeInfo?.description ?? "Choose what kind of message you'd like to send."}
          </DialogDescription>
        </DialogHeader>

        {/* Type picker — only shown when no forcedType */}
        {!forcedType && availableTypes.length > 1 && (
          <div className="grid gap-2 pb-1">
            {availableTypes.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedType(t.key)}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                  selectedType === t.key
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">{t.icon}</div>
                <div>
                  <p className="text-sm font-medium leading-none mb-1">{t.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="msg-title">Subject</Label>
            <Input
              id="msg-title"
              placeholder="Enter a subject..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="msg-content">Message</Label>
            <Textarea
              id="msg-content"
              placeholder="Write your message here..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              required
            />
          </div>
          {(forceAnonymous || activeType === "direct") && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-1 px-2 rounded bg-muted/50">
              🔒 Your identity is kept completely anonymous.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={sendMutation.isPending} className="gap-2">
              <Send className="h-4 w-4" />
              {sendMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

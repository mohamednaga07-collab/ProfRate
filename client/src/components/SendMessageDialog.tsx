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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-set the receiver ID if sending a DM to a specific teacher/user */
  receiverId?: string;
  receiverName?: string;
  /** Force the message type */
  forcedType?: "direct" | "broadcast" | "feedback" | "support_request" | "broadcast_class";
  /** Require anonymous flag */
  forceAnonymous?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  direct: "Direct Message",
  broadcast: "Broadcast to Everyone",
  feedback: "Feedback to Admin",
  support_request: "Support Request to Admin",
  broadcast_class: "Announcement to Students",
};

export function SendMessageDialog({
  open,
  onOpenChange,
  receiverId,
  receiverName,
  forcedType,
  forceAnonymous = false,
}: SendMessageDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<string>(forcedType || "direct");

  const sendMutation = useMutation({
    mutationFn: async () => {
      const csrfRes = await fetch("/api/auth/csrf-token");
      const { token } = await csrfRes.json();
      const body: any = {
        receiverId: receiverId || null,
        title,
        content,
        type,
        isAnonymous: forceAnonymous,
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
      toast({ title: "Send failed", description: "Failed to send message. Please try again.", variant: "destructive" });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({ title: "Missing fields", description: "Please enter both a title and a message.", variant: "destructive" });
      return;
    }
    sendMutation.mutate();
  };

  // Decide which types are available based on role
  const availableTypes: string[] = forcedType
    ? [forcedType]
    : user?.role === "admin"
    ? ["broadcast", "direct"]
    : user?.role === "teacher"
    ? ["broadcast_class", "support_request", "direct"]
    : ["feedback", "direct"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {forceAnonymous ? "Send Anonymous Message" : "Compose Message"}
          </DialogTitle>
          <DialogDescription>
            {forceAnonymous
              ? `This message will be sent anonymously to ${receiverName || "the teacher"}. They will not know who you are.`
              : receiverName
              ? `Sending to: ${receiverName}`
              : "Send a message or notification."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSend} className="space-y-4">
          {!forcedType && availableTypes.length > 1 && (
            <div className="space-y-1">
              <Label>Message Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map(t => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="msg-title">Subject</Label>
            <Input
              id="msg-title"
              placeholder="Enter a title..."
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
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={sendMutation.isPending}>
              {sendMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

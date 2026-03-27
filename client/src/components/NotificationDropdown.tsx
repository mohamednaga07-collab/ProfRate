import { useState } from "react";
import { Bell, Check, CheckCheck, AlertCircle, Megaphone, MessageCircle, Shield, Trash2, Mail } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  maintenance: {
    icon: <AlertCircle className="h-4 w-4" />,
    label: "Maintenance",
    color: "text-orange-500",
    bg: "bg-orange-500/10 border-orange-500/20",
  },
  broadcast: {
    icon: <Megaphone className="h-4 w-4" />,
    label: "Announcement",
    color: "text-purple-500",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  broadcast_class: {
    icon: <Megaphone className="h-4 w-4" />,
    label: "Class Announcement",
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  feedback: {
    icon: <MessageCircle className="h-4 w-4" />,
    label: "Feedback",
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  support_request: {
    icon: <Shield className="h-4 w-4" />,
    label: "Support Request",
    color: "text-green-500",
    bg: "bg-green-500/10 border-green-500/20",
  },
  direct: {
    icon: <Mail className="h-4 w-4" />,
    label: "Private Message",
    color: "text-sky-500",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
};

function NotificationItem({
  notif,
  onRead,
  onDelete,
}: {
  notif: any;
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.broadcast;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative flex gap-3 p-3 rounded-xl border transition-all duration-200",
        notif.isRead
          ? "bg-card/30 border-border/40"
          : "bg-card border-border/70 shadow-sm"
      )}
    >
      {/* Unread dot */}
      {!notif.isRead && (
        <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
      )}

      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 h-9 w-9 rounded-xl border flex items-center justify-center mt-0.5",
          config.bg,
          config.color
        )}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 mb-1 font-medium border", config.bg, config.color)}
            >
              {config.label}
            </Badge>
            <p className={cn("text-sm font-semibold leading-tight truncate", !notif.isRead && "text-foreground")}>
              {notif.title}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
          {notif.content}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-muted-foreground/70">
            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
          </span>
          {notif.isAnonymous && (
            <span className="text-[10px] text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded">
              🔒 Anonymous
            </span>
          )}
        </div>
      </div>

      {/* Action buttons — show on hover */}
      <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notif.isRead && (
          <button
            onClick={() => onRead(notif.id)}
            title="Mark as read"
            className="h-6 w-6 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors"
          >
            <Check className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={() => onDelete(notif.id)}
          title="Delete"
          className="h-6 w-6 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}

export function NotificationDropdown() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 30_000, // poll every 30s
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const csrfRes = await fetch("/api/auth/csrf-token");
      const { token } = await csrfRes.json();
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "X-CSRF-Token": token },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const csrfRes = await fetch("/api/auth/csrf-token");
      const { token } = await csrfRes.json();
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": token },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const csrfRes = await fetch("/api/auth/csrf-token");
      const { token } = await csrfRes.json();
      const unread = notifications.filter((n: any) => !n.isRead);
      await Promise.all(
        unread.map(n =>
          fetch(`/api/notifications/${n.id}/read`, {
            method: "PATCH",
            headers: { "X-CSRF-Token": token },
          })
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  if (!user) return null;

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;
  const hasUnread = unreadCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label="Open notifications"
        >
          <Bell className={cn("h-5 w-5 transition-all", hasUnread && "text-primary")} />
          <AnimatePresence>
            {hasUnread && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white border-2 border-background"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-96 p-0 shadow-2xl border-border/60 bg-background/95 backdrop-blur-xl rounded-2xl overflow-hidden"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Notifications</span>
            {hasUnread && (
              <Badge className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground gap-1.5 hover:text-foreground"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Bell className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">You're all caught up</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">No new notifications</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[440px]">
            <div className="p-3 space-y-2">
              <AnimatePresence initial={false}>
                {notifications.map((notif: any) => (
                  <NotificationItem
                    key={notif.id}
                    notif={notif}
                    onRead={(id) => markReadMutation.mutate(id)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator className="opacity-40" />
            <div className="px-4 py-2 bg-muted/20">
              <p className="text-[11px] text-muted-foreground/60 text-center">
                {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
                {hasUnread ? ` · ${unreadCount} unread` : ""}
              </p>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

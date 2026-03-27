import { Bell, Mail, MessageSquare, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

export function NotificationDropdown() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch(type) {
      case 'maintenance': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'feedback': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'support_request': return <Mail className="h-4 w-4 text-green-500" />;
      case 'broadcast': return <Bell className="h-4 w-4 text-purple-500" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white border-2 border-background">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.map((notif) => (
              <DropdownMenuItem 
                key={notif.id} 
                className={`p-3 flex gap-3 items-start ${!notif.isRead ? 'bg-primary/5 cursor-pointer hover:bg-primary/10' : 'cursor-default'}`}
                onClick={(e) => {
                  if (notif.isRead) {
                    e.preventDefault(); // keep dropdown open if already read
                    return;
                  }
                  markReadMutation.mutate(notif.id);
                }}
              >
                <div className="mt-1 flex-shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium leading-none ${!notif.isRead ? 'text-primary' : ''}`}>
                      {notif.title}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {notif.content}
                  </p>
                  {notif.isAnonymous && <Badge variant="secondary" className="text-[10px] mt-1">Anonymous Sender</Badge>}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

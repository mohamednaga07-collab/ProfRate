import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Activity, BookOpen, Star, User, Shield, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

interface ActivityLog {
  id: number;
  userId: string;
  username: string;
  role: string;
  action: string;
  type: string;
  ipAddress: string | null;
  timestamp: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  login: <Shield className="h-4 w-4 text-green-500" />,
  review: <Star className="h-4 w-4 text-amber-500" />,
  doctor: <BookOpen className="h-4 w-4 text-blue-500" />,
  admin: <Shield className="h-4 w-4 text-red-500" />,
  admin_action: <Shield className="h-4 w-4 text-red-500" />,
};

const typeLabel = (t: any): Record<string, string> => ({
  login: t("admin.activity.types.login"),
  review: t("admin.activity.types.review"),
  doctor: t("admin.activity.types.doctor"),
  admin: t("admin.activity.types.admin"),
  admin_action: t("admin.activity.types.admin"),
});

export default function AdminActivityLog() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: logs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity"],
    queryFn: async () => {
      const res = await fetch("/api/admin/activity?limit=100");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const totalLogins = logs.filter(l => l.type === "login").length;
  const totalReviews = logs.filter(l => l.type === "review").length;
  const totalAdmin = logs.filter(l => l.type === "admin_action" || l.type === "admin").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-red-500/5">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-200 dark:border-red-800">
              <Activity className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{t("admin.activity.title")}</h1>
              <p className="text-muted-foreground">{t("admin.activity.subtitle")}</p>
            </div>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: t("admin.activity.labels.logins"), value: totalLogins, color: "text-green-600 dark:text-green-400" },
            { label: t("admin.activity.labels.ratings"), value: totalReviews, color: "text-amber-600 dark:text-amber-400" },
            { label: t("admin.activity.labels.adminActions"), value: totalAdmin, color: "text-red-600 dark:text-red-400" },
          ].map((s, i) => (
            <Card key={i} className="bg-card/80 backdrop-blur">
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Log Table */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-card/80 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" /> {t("admin.activity.recentEvents")}
              </CardTitle>
              <CardDescription>{t("admin.activity.showingLatest", { count: logs.length })}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">{t("admin.activity.noActivity")}</p>
              ) : (
                <div className="divide-y">
                  {logs.map((log, i) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.02 * Math.min(i, 20) }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {typeIcon[log.type] ?? <Activity className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{log.username}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{t(`roles.${log.role}`)}</span>
                          <span className="text-xs text-muted-foreground truncate">{t(`admin.activity.actions.${log.action}`, { defaultValue: log.action })}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

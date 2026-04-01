import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trophy, Lock, Zap, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  category: string;
}

interface AchievementData {
  badges: Badge[];
  stats: {
    totalBadges: number;
    earnedBadges: number;
    loginCount: number;
    reviewCount: number;
    totalActions: number;
    points: number;
  };
  ratingsHistory?: {
    id: number;
    doctorId: number;
    doctorName: string;
    department: string;
    reviewedAt: string;
    lastEditedAt: string | null;
    nextAllowedAt: string;
  }[];
}

const categoryColors: Record<string, string> = {
  milestone: "from-yellow-500/20 to-amber-500/10 border-yellow-300 dark:border-yellow-700",
  engagement: "from-blue-500/20 to-blue-600/10 border-blue-300 dark:border-blue-700",
  contribution: "from-purple-500/20 to-purple-600/10 border-purple-300 dark:border-purple-700",
  community: "from-green-500/20 to-green-600/10 border-green-300 dark:border-green-700",
};

export default function StudentAchievements() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/student/achievements"],
    queryFn: async () => {
      const res = await fetch("/api/student/achievements");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<AchievementData>;
    },
  });

  const badges = data?.badges ?? [];
  const stats = data?.stats;
  const earnedPct = stats ? Math.round((stats.earnedBadges / stats.totalBadges) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-200 dark:border-amber-800">
              <Trophy className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{t("student.achievements.title")}</h1>
              <p className="text-muted-foreground">{t("student.achievements.subtitle")}</p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Summary Strip */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              {[
                { label: t("student.achievements.stats.points"), value: stats?.points ?? 0, icon: <Zap className="h-5 w-5 text-yellow-500" />, color: "text-yellow-600 dark:text-yellow-400" },
                { label: t("student.achievements.stats.earned"), value: `${stats?.earnedBadges ?? 0}/${stats?.totalBadges ?? 0}`, icon: <Trophy className="h-5 w-5 text-amber-500" />, color: "text-amber-600 dark:text-amber-400" },
                { label: t("student.achievements.stats.reviews"), value: stats?.reviewCount ?? 0, icon: <Star className="h-5 w-5 text-purple-500" />, color: "text-purple-600 dark:text-purple-400" },
                { label: t("student.achievements.stats.logins"), value: stats?.loginCount ?? 0, icon: <Zap className="h-5 w-5 text-blue-500" />, color: "text-blue-600 dark:text-blue-400" },
              ].map((s, i) => (
                <Card key={i} className="bg-card/80 backdrop-blur">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      {s.icon}
                    </div>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* Progress Bar */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t("student.achievements.progress")}</span>
                <span className="text-sm text-muted-foreground">{t("student.achievements.complete", { percent: earnedPct })}</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${earnedPct}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
            </motion.div>

            {/* Badges Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((badge, i) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                >
                  <Card className={`relative overflow-hidden border transition-all duration-300 ${
                    badge.earned
                      ? `bg-gradient-to-br ${categoryColors[badge.category] ?? ""} shadow-sm`
                      : "bg-muted/20 border-border opacity-60 grayscale"
                  }`}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`text-4xl leading-none transition-transform ${badge.earned ? "scale-110" : ""}`}>
                          {badge.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-bold text-base ${badge.earned ? "text-foreground" : "text-muted-foreground"}`}>
                              {badge.title}
                            </h3>
                            {!badge.earned && <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                          </div>
                          <p className="text-sm text-muted-foreground leading-snug">{badge.description}</p>
                          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium capitalize
                            ${badge.earned ? "bg-white/30 text-foreground" : "bg-muted text-muted-foreground"}`}>
                            {t(`student.achievements.categories.${badge.category}`, { defaultValue: badge.category })}
                          </span>
                        </div>
                      </div>
                      {badge.earned && (
                        <div className="absolute top-3 right-3">
                          <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            
            {/* Rating Activity Section */}
            {data?.ratingsHistory && data.ratingsHistory.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-12">
                <div className="flex items-center gap-3 mb-6">
                  <Star className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Your Rating Track Record</h2>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  {data.ratingsHistory.map((rating) => {
                    const nextAllowed = new Date(rating.nextAllowedAt);
                    const now = new Date();
                    const isCooldown = now < nextAllowed;
                    
                    let cooldownText = "";
                    if (isCooldown) {
                      const diffHours = Math.floor((nextAllowed.getTime() - now.getTime()) / (1000 * 60 * 60));
                      const diffMins = Math.floor(((nextAllowed.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
                      cooldownText = `${diffHours}h ${diffMins}m until next edit allowed`;
                    }
                    
                    return (
                      <Card key={rating.id} className="bg-card/50 overflow-hidden border-border/50">
                        <CardContent className="p-4 flex justify-between items-center sm:items-start flex-col sm:flex-row gap-4">
                          <div>
                            <h3 className="font-semibold">{rating.doctorName}</h3>
                            <p className="text-xs text-muted-foreground">{rating.department}</p>
                            <p className="text-xs text-muted-foreground mt-1">Reviewed on {new Date(rating.reviewedAt).toLocaleDateString()}</p>
                          </div>
                          
                          <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center shrink-0 ${isCooldown ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                            {isCooldown ? (
                              <>
                                <Lock className="h-3 w-3 mr-1.5" />
                                {cooldownText}
                              </>
                            ) : (
                              <>
                                <Zap className="h-3 w-3 mr-1.5" />
                                Ready to Update
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

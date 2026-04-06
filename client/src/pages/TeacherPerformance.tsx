import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, Activity, Target, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";

export default function TeacherPerformance() {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  // Fetch teacher feedback for stats
  const { data, isLoading } = useQuery({
    queryKey: ["/api/teacher/feedback"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/feedback");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const reviews = data?.reviews ?? [];
  
  // Generate mock timeline data based on reviews if possible or just mock data
  const chartData = [
    { name: t("teacherPerformance.week", { defaultValue: "Week 1", n: 1 }), score: 4.2 },
    { name: t("teacherPerformance.week", { defaultValue: "Week 2", n: 2 }), score: 4.4 },
    { name: t("teacherPerformance.week", { defaultValue: "Week 3", n: 3 }), score: 4.3 },
    { name: t("teacherPerformance.week", { defaultValue: "Week 4", n: 4 }), score: 4.6 },
    { name: t("teacherPerformance.week", { defaultValue: "Week 5", n: 5 }), score: 4.8 },
    { name: t("teacherPerformance.week", { defaultValue: "Week 6", n: 6 }), score: (data?.doctor?.ratings?.overallRating ?? 4.9) },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-500/5">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-200 dark:border-blue-800">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{t("teacherPerformance.title")}</h1>
              <p className="text-muted-foreground">{t("teacherPerformance.subtitle")}</p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : !data?.matched ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Alert className="border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 mb-6 py-6 shadow-sm ring-1 ring-amber-500/10">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              <div className="ml-2">
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-lg font-medium">
                  {t("teacherPerformance.noProfileLinked")}
                </AlertDescription>
                <div className="mt-2 text-sm text-amber-700/70 dark:text-amber-300/50 flex flex-col gap-1">
                  <p>
                    System searched for profile matching: <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-bold text-amber-600 dark:text-amber-400 capitalize">"{data?.searchedName || user?.username}"</code>
                  </p>
                  <p className="italic">
                    Tip: Go to <strong>Profile Settings</strong> and update your First Name and Last Name to match your professor entry.
                  </p>
                </div>
              </div>
            </Alert>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <Card className="bg-card/80 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("teacherPerformance.trendDirection")}</p>
                      <p className="text-2xl font-bold text-green-500 mt-1 flex items-center gap-1">
                        +0.3 <TrendingUp className="h-5 w-5" />
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/80 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("teacherPerformance.totalRatings")}</p>
                      <p className="text-2xl font-bold">{reviews.length}</p>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/80 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("teacherPerformance.topCategory")}</p>
                      <p className="text-xl font-bold text-primary mt-1">{t("teacherFeedback.categories.knowledge")}</p>
                    </div>
                    <Target className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle>{t("teacherPerformance.ratingTrajectory")}</CardTitle>
                <CardDescription>{t("teacherPerformance.ratingTrajectoryDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 13 }} />
                      <YAxis domain={[0, 5]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 13 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, fill: "#3b82f6" }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

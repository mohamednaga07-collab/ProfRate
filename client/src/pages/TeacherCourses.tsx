import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BookOpen, Users, Star, TrendingUp, BarChart3, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StarRating } from "@/components/StarRating";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

interface DoctorRatings {
  avgTeachingQuality: number;
  avgAvailability: number;
  avgCommunication: number;
  avgKnowledge: number;
  avgFairness: number;
  avgEngagement: number;
  avgHelpfulness: number;
  avgCourseOrganization: number;
  overallRating: number;
  totalReviews: number;
}

interface DoctorWithRatings {
  id: number;
  name: string;
  department: string;
  title: string;
  ratings: DoctorRatings | null;
}

export default function TeacherCourses() {
  const { user } = useAuth();

  const { data: doctors = [], isLoading } = useQuery<DoctorWithRatings[]>({
    queryKey: ["/api/doctors"],
    queryFn: async () => {
      const res = await fetch("/api/doctors");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim().toLowerCase();
  const normalize = (name: string) => name.replace(/^Dr\.?\s+/i, "").trim().toLowerCase();
  const matched = fullName ? doctors.filter(d => normalize(d.name) === fullName) : [];
  const hasProfile = matched.length > 0;
  const doc = matched[0];

  const radarData = doc?.ratings ? [
    { category: "Teaching", value: (doc.ratings.avgTeachingQuality || 0) * 2 },
    { category: "Availability", value: (doc.ratings.avgAvailability || 0) * 2 },
    { category: "Communication", value: (doc.ratings.avgCommunication || 0) * 2 },
    { category: "Knowledge", value: (doc.ratings.avgKnowledge || 0) * 2 },
    { category: "Fairness", value: (doc.ratings.avgFairness || 0) * 2 },
    { category: "Engagement", value: doc.ratings.avgEngagement || 0 },
    { category: "Helpfulness", value: doc.ratings.avgHelpfulness || 0 },
    { category: "Organization", value: doc.ratings.avgCourseOrganization || 0 },
  ].filter(d => d.value > 0) : []; // Hide 0-value new categories if legacy only

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-500/5">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-200 dark:border-blue-800">
              <BookOpen className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">My Courses & Profile</h1>
              <p className="text-muted-foreground">Your public professor profile and student engagement overview</p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : !hasProfile ? (
          <Alert className="border-amber-400/40 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>No doctor profile found</strong> — your account ({user?.firstName} {user?.lastName}) is not yet linked to a professor entry. Ask an admin to create one matching your full name.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Profile Card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="h-16 w-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-blue-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{doc.name}</h2>
                      <p className="text-muted-foreground">{doc.title} · {doc.department}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StarRating rating={doc.ratings?.overallRating ?? 0} size="sm" />
                        <span className="text-sm text-muted-foreground">({doc.ratings?.totalReviews ?? 0} reviews)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stat Tiles */}
            {doc.ratings && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Overall Rating", value: doc.ratings.overallRating.toFixed(1), icon: <Star className="h-4 w-4 text-amber-500" />, color: "text-amber-600 dark:text-amber-400" },
                  { label: "Total Reviews", value: doc.ratings.totalReviews, icon: <Users className="h-4 w-4 text-blue-500" />, color: "text-blue-600 dark:text-blue-400" },
                  { label: "Best Score", value: Math.max((doc.ratings.avgTeachingQuality||0)*2, doc.ratings.avgEngagement||0, (doc.ratings.avgCommunication||0)*2).toFixed(1), icon: <TrendingUp className="h-4 w-4 text-green-500" />, color: "text-green-600 dark:text-green-400" },
                  { label: "Availability", value: `${((doc.ratings.avgAvailability||0) * 20).toFixed(0)}%`, icon: <BarChart3 className="h-4 w-4 text-purple-500" />, color: "text-purple-600 dark:text-purple-400" },
                ].map((s, i) => (
                  <Card key={i} className="bg-card/80 backdrop-blur">
                    <CardContent className="pt-4 pb-4">
                      <div className="mb-1">{s.icon}</div>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}

            {/* Radar Chart */}
            {radarData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="bg-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Skill Radar</CardTitle>
                    <CardDescription>How students rate you across {radarData.length} dimensions (0-10 scale)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--muted))" />
                        <PolarAngleAxis dataKey="category" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 13 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} />
                        <Radar name="Ratings" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.55} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Per-Category Breakdown */}
            {doc.ratings && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card className="bg-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle>Category Breakdown</CardTitle>
                    <CardDescription>Your average score per rating dimension (scaled to 10)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: "Teaching Quality", value: (doc.ratings.avgTeachingQuality||0)*2, color: "bg-blue-500" },
                      { label: "Availability", value: (doc.ratings.avgAvailability||0)*2, color: "bg-purple-500" },
                      { label: "Communication", value: (doc.ratings.avgCommunication||0)*2, color: "bg-pink-500" },
                      { label: "Knowledge", value: (doc.ratings.avgKnowledge||0)*2, color: "bg-amber-500" },
                      { label: "Fairness", value: (doc.ratings.avgFairness||0)*2, color: "bg-green-500" },
                      ...(doc.ratings.avgEngagement > 0 ? [
                        { label: "Engagement", value: doc.ratings.avgEngagement, color: "bg-yellow-500" },
                        { label: "Helpfulness", value: doc.ratings.avgHelpfulness, color: "bg-rose-500" },
                        { label: "Course Organization", value: doc.ratings.avgCourseOrganization, color: "bg-teal-500" },
                      ] : [])
                    ].map(cat => (
                      <div key={cat.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{cat.label}</span>
                          <span className="font-semibold">{cat.value.toFixed(1)} / 10</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${cat.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(cat.value / 10) * 100}%` }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

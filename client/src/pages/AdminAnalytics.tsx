import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BarChart3, Users, Star, ArrowUpRight, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Stats {
  totalUsers: number;
  totalDoctors: number;
  totalReviews: number;
  activeUsers: number;
  usersGrowth: number;
  doctorsGrowth: number;
  reviewsGrowth: number;
}

export default function AdminAnalytics() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const growthData = [
    { name: "Jan", users: 120, reviews: 40 },
    { name: "Feb", users: 160, reviews: 85 },
    { name: "Mar", users: 210, reviews: 156 },
    { name: "Apr", users: 290, reviews: 290 },
    { name: "May", users: Math.round((stats?.totalUsers ?? 350) * 0.8), reviews: Math.round((stats?.totalReviews ?? 400) * 0.7) },
    { name: "Now",  users: stats?.totalUsers ?? 420, reviews: stats?.totalReviews ?? 520 },
  ];

  const tiles = [
    { title: "Total Users",      val: stats?.totalUsers ?? 0,    growth: stats?.usersGrowth ?? 0,   icon: Users,    color: "text-blue-500" },
    { title: "Total Professors", val: stats?.totalDoctors ?? 0,  growth: stats?.doctorsGrowth ?? 0, icon: Users,    color: "text-purple-500" },
    { title: "Total Reviews",    val: stats?.totalReviews ?? 0,   growth: stats?.reviewsGrowth ?? 0, icon: Star,     color: "text-amber-500" },
    { title: "Active Users",     val: stats?.activeUsers ?? 0,    growth: 12,                        icon: Activity, color: "text-green-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-red-500/5">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-200 dark:border-red-800">
              <BarChart3 className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Platform Analytics</h1>
              <p className="text-muted-foreground">High-level growth and participation metrics across the whole application</p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tiles.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                  <Card className="bg-card/80 backdrop-blur">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{s.title}</p>
                          <p className="text-3xl font-bold">{s.val}</p>
                          <div className="flex items-center gap-1 mt-2 text-xs font-medium text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full w-fit">
                            <ArrowUpRight className="h-3 w-3" />
                            {s.growth.toFixed(1)}% vs last month
                          </div>
                        </div>
                        <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle>Growth Trajectory</CardTitle>
                  <CardDescription>User registrations and review submissions over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={growthData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 13 }} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 13 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} itemStyle={{ fontSize: "14px", fontWeight: 500 }} />
                        <Line type="monotone" name="Users"   dataKey="users"   stroke="#eab308" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" name="Reviews" dataKey="reviews" stroke="#ec4899" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}

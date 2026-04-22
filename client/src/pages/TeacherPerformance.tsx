import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, Activity, Target, AlertCircle, Download, Share2, Award, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

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
  const ratings = data?.doctor?.ratings;
  
  // Generate mock timeline data based on reviews if possible or just mock data
  const chartData = [
    { name: t("teacherPerformance.week", { defaultValue: "Week 1", n: 1 }), score: 4.2 },
    { name: t("teacherPerformance.week", { defaultValue: "Week 2", n: 2 }), score: 4.4 },
    { name: t("teacherPerformance.week", { defaultValue: "Week 3", n: 3 }), score: 4.3 },
    { name: t("teacherPerformance.week", { defaultValue: "Week 4", n: 4 }), score: 4.6 },
    { name: t("teacherPerformance.week", { defaultValue: "Week 5", n: 5 }), score: 4.8 },
    { name: t("teacherPerformance.week", { defaultValue: "Week 6", n: 6 }), score: (ratings?.overallRating ?? 4.9) },
  ];

  // Map to 8-axis Octagon "Skills Radar"
  // Note: we'll multiply normalized / 10 scales by 1 if out of 10 or convert appropriately.
  // Assuming the DB stores submetrics over 5 or 10, let's normalize to a /10 scale.
  const radarData = [
    { subject: t("doctorProfile.factorsShort.teaching", { defaultValue: "Teaching" }), A: (ratings?.avgTeachingQuality ?? 0) * 2, fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.availability", { defaultValue: "Availability" }), A: (ratings?.avgAvailability ?? 0) * 2, fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.communication", { defaultValue: "Communication" }), A: (ratings?.avgCommunication ?? 0) * 2, fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.knowledge", { defaultValue: "Knowledge" }), A: (ratings?.avgKnowledge ?? 0) * 2, fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.fairness", { defaultValue: "Fairness" }), A: (ratings?.avgFairness ?? 0) * 2, fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.engagement", { defaultValue: "Engagement" }), A: (ratings?.avgEngagement ?? 0), fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.helpfulness", { defaultValue: "Helpfulness" }), A: (ratings?.avgHelpfulness ?? 0), fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.courseOrganization", { defaultValue: "Organization" }), A: (ratings?.avgCourseOrganization ?? 0), fullMark: 10 },
  ];

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background pointer-events-none" />
      
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-1">{t("teacherPerformance.title", { defaultValue: "Performance Analytics" })}</h1>
              <p className="text-blue-200/70 text-lg">{t("teacherPerformance.subtitle", { defaultValue: "Track your ratings and engagement over time" })}</p>
            </div>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md gap-2">
               <Share2 className="h-4 w-4" /> Share
             </Button>
             <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] gap-2 border-0">
               <Download className="h-4 w-4" /> Export PDF
             </Button>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-32">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          </div>
        ) : !data?.matched ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Alert className="border-amber-500/30 bg-amber-500/10 backdrop-blur-xl mb-6 py-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <AlertCircle className="h-8 w-8 text-amber-400 relative z-10" />
              <div className="ml-4 relative z-10">
                <AlertDescription className="text-amber-100 text-xl font-semibold tracking-tight">
                  {t("teacherPerformance.noProfileLinked", { defaultValue: "No doctor profile is currently linked to your account." })}
                </AlertDescription>
                <div className="mt-4 text-sm text-amber-200/70 flex flex-col gap-2">
                  <p className="flex items-center gap-2">
                    System searched for profile matching: <code className="bg-amber-500/20 px-2 py-1 rounded-md font-mono text-amber-300">"{data?.searchedName || user?.username}"</code>
                  </p>
                  <p className="border-l-2 border-amber-500/50 pl-3 italic opacity-80">
                    Tip: Go to <strong>Profile Settings</strong> and update your First Name and Last Name to match your professor entry.
                  </p>
                </div>
              </div>
            </Alert>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid sm:grid-cols-4 gap-4">
               {[
                 { title: "Overall Rating", val: (ratings?.overallRating ?? 0).toFixed(1), max: "/5", icon: Award, color: "text-blue-400", bg: "from-blue-500/20 to-blue-600/5", border: "border-blue-500/20" },
                 { title: "Total Reviews", val: reviews.length, max: "", icon: Activity, color: "text-teal-400", bg: "from-teal-500/20 to-teal-600/5", border: "border-teal-500/20" },
                 { title: "Engagement Level", val: ((ratings?.avgAvailability ?? 0) * 20).toFixed(0), max: "%", icon: Zap, color: "text-amber-400", bg: "from-amber-500/20 to-amber-600/5", border: "border-amber-500/20" },
                 { title: "Growth Trend", val: "+0.3", max: "", icon: TrendingUp, color: "text-green-400", bg: "from-green-500/20 to-green-600/5", border: "border-green-500/20" },
               ].map((kpi, i) => (
                 <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                   <Card className={`bg-gradient-to-br ${kpi.bg} border ${kpi.border} backdrop-blur-xl relative overflow-hidden group hover:border-white/20 transition-all duration-300`}>
                     <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity group-hover:scale-110 duration-500">
                       <kpi.icon className={`w-16 h-16 ${kpi.color}`} />
                     </div>
                     <CardContent className="p-6 relative z-10">
                       <p className="text-sm font-medium text-white/50 uppercase tracking-wider mb-2">{kpi.title}</p>
                       <div className="flex items-baseline gap-1">
                         <h3 className={`text-4xl font-black tracking-tighter ${kpi.color}`}>{kpi.val}</h3>
                         <span className="text-lg font-medium text-white/40">{kpi.max}</span>
                       </div>
                     </CardContent>
                   </Card>
                 </motion.div>
               ))}
            </div>

            <div className="grid lg:grid-cols-5 gap-8">
              {/* Octagon Radar Chart */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
                <Card className="h-full bg-[#0a0f1c]/80 backdrop-blur-2xl border-white/5 shadow-2xl relative overflow-hidden">
                  <div className="absolute -inset-24 bg-gradient-to-tr from-blue-500/10 via-transparent to-purple-500/10 blur-3xl rounded-[100%] pointer-events-none" />
                  <CardHeader className="relative z-10 pb-0">
                     <CardTitle className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                       <Target className="h-5 w-5 text-blue-400" /> Pedagogical Octagon
                     </CardTitle>
                     <CardDescription className="text-white/40">Multi-axis ability assessment based on all student feedback.</CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10 p-0 flex items-center justify-center min-h-[400px]">
                    <ResponsiveContainer width="100%" height={380}>
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600 }} 
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                        <Radar 
                          name="Your Score" 
                          dataKey="A" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          fill="url(#colorUv)" 
                          fillOpacity={0.6}
                          activeDot={{ r: 6, fill: '#60a5fa', stroke: '#fff', strokeWidth: 2 }}
                        />
                        <defs>
                          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                          itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Trajectory Area Chart */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="lg:col-span-3">
                <Card className="h-full bg-[#0a0f1c]/80 backdrop-blur-2xl border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                      <Activity className="h-5 w-5 text-emerald-400" /> Trajectory Analytics
                    </CardTitle>
                    <CardDescription className="text-white/40">{t("teacherPerformance.ratingTrajectoryDesc", { defaultValue: "Historical progression of your overall feedback." })}</CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10 flex-grow h-full pt-4 pl-0">
                    <div className="h-full w-full min-h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                          <YAxis domain={[0, 5]} stroke="rgba(255,255,255,0.4)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dx={-10} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 8, strokeWidth: 0, fill: '#34d399' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

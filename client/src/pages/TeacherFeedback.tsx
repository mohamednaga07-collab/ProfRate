import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { MessageSquare, Star, TrendingUp, AlertCircle, BookOpen, Award, Layers } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StarRating } from "@/components/StarRating";
import { useTranslation } from "react-i18next";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Button } from "@/components/ui/button";

interface Review {
  id: number;
  teachingQuality: number;
  availability: number;
  communication: number;
  knowledge: number;
  fairness: number;
  engagement: number | null;
  helpfulness: number | null;
  courseOrganization: number | null;
  overallScore: number | null;
  subScores: any | null;
  comment: string | null;
  createdAt: string;
}

interface FeedbackResponse {
  matched: boolean;
  doctor: { id: number; name: string; ratings: any } | null;
  reviews: Review[];
  searchedName?: string;
}

function getCategoryAvg(catSubScores: Record<string, number> | undefined) {
  if (!catSubScores) return 0;
  const vals = Object.values(catSubScores);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export default function TeacherFeedback() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/teacher/feedback"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/feedback");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<FeedbackResponse>;
    },
  });

  const reviews = data?.reviews ?? [];
  const commented = reviews.filter(r => r.comment?.trim());
  const noComment = reviews.filter(r => !r.comment?.trim());

  const avgOverall = data?.doctor?.ratings?.overallRating ?? 0;
  const ratings = data?.doctor?.ratings;

  // Radar chart data strictly for student perception
  const radarData = [
    { subject: t("doctorProfile.factorsShort.teaching", { defaultValue: "Teaching" }), score: (ratings?.avgTeachingQuality ?? 0) * 2, fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.availability", { defaultValue: "Availability" }), score: (ratings?.avgAvailability ?? 0) * 2, fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.communication", { defaultValue: "Communication" }), score: (ratings?.avgCommunication ?? 0) * 2, fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.knowledge", { defaultValue: "Knowledge" }), score: (ratings?.avgKnowledge ?? 0) * 2, fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.fairness", { defaultValue: "Fairness" }), score: (ratings?.avgFairness ?? 0) * 2, fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.engagement", { defaultValue: "Engagement" }), score: (ratings?.avgEngagement ?? 0), fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.helpfulness", { defaultValue: "Helpfulness" }), score: (ratings?.avgHelpfulness ?? 0), fullMark: 10 },
    { subject: t("doctorProfile.factorsShort.courseOrganization", { defaultValue: "Organization" }), score: (ratings?.avgCourseOrganization ?? 0), fullMark: 10 },
  ];

  function SentimentTag({ text }: { text: string }) {
    const lower = text.toLowerCase();
    const positive = ["great", "excellent", "amazing", "best", "good", "helpful", "clear", "kind", "fair", "awesome", "wonderful", "fantastic", "loved"];
    const negative = ["bad", "poor", "terrible", "awful", "boring", "hard", "unclear", "rude", "unfair", "worst", "unhelpful"];
    const isPos = positive.some(w => lower.includes(w));
    const isNeg = negative.some(w => lower.includes(w));
    if (isPos) return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">Positive</span>;
    if (isNeg) return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">Negative</span>;
    return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Neutral</span>;
  }

  return (
    <div className="min-h-screen bg-[#060913] text-purple-50 font-sans selection:bg-purple-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
      
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-1">{t("teacherFeedback.title", { defaultValue: "Student Feedback" })}</h1>
              <p className="text-purple-200/70 text-lg">{t("teacherFeedback.subtitle", { defaultValue: "Anonymous reviews left by your students" })}</p>
            </div>
          </div>
          <div className="flex gap-3">
             <Button className="bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] gap-2 border-0">
               <Layers className="h-4 w-4" /> Export CSV
             </Button>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-32">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
          </div>
        ) : !data?.matched ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Alert className="border-amber-500/30 bg-amber-500/10 backdrop-blur-xl mb-6 py-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <AlertCircle className="h-8 w-8 text-amber-400 relative z-10" />
              <div className="ml-4 relative z-10">
                <AlertDescription className="text-amber-100 text-xl font-semibold tracking-tight">
                  {t("teacherFeedback.noProfileLinked", { defaultValue: "No linked profile — could not automatically match." })}
                </AlertDescription>
                <div className="mt-4 text-sm text-amber-200/70 flex flex-col gap-2">
                  <p className="flex items-center gap-2">
                    System searched for profile matching: <code className="bg-amber-500/20 px-2 py-1 rounded-md font-mono text-amber-300">"{data?.searchedName || user?.username}"</code>
                  </p>
                  <p className="border-l-2 border-amber-500/50 pl-3 italic opacity-80">
                    Tip: Go to <strong>Profile Settings</strong> and update your First Name and Last Name to match your university registration.
                  </p>
                </div>
              </div>
            </Alert>
          </motion.div>
        ) : reviews.length === 0 ? (
          <Card className="text-center py-24 bg-transparent border border-white/5 border-dashed">
            <CardContent>
              <BookOpen className="h-16 w-16 mx-auto mb-6 text-white/20" />
              <p className="text-xl font-medium text-white/40">{t("teacherFeedback.noReviews", { defaultValue: "No reviews yet. Check back soon." })}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Column: Stats & Octagon */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
              
              <Card className="bg-[#0a0515]/90 backdrop-blur-2xl border-white/5 shadow-2xl relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
                 <div className="absolute top-0 right-0 p-6 opacity-30 group-hover:scale-110 group-hover:opacity-60 transition-all duration-500">
                   <Award className="w-24 h-24 text-purple-500" />
                 </div>
                 <CardContent className="p-8 relative z-10">
                   <p className="text-sm font-medium text-white/50 uppercase tracking-widest mb-2">{t("teacherFeedback.overallRating", { defaultValue: "Overall Rating" })}</p>
                   <div className="flex items-baseline gap-2 mb-4">
                     <h3 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-purple-200">
                       {avgOverall > 5 ? avgOverall.toFixed(1) : avgOverall.toFixed(1)}
                     </h3>
                     <span className="text-xl font-medium text-white/30">{avgOverall > 5 ? "/10" : "/5"}</span>
                   </div>
                   <div className="bg-black/30 w-fit p-3 rounded-xl border border-white/5 backdrop-blur-md">
                     <StarRating rating={avgOverall > 5 ? avgOverall / 2 : avgOverall} size="lg" />
                   </div>
                 </CardContent>
              </Card>

              <Card className="bg-[#0a0515]/90 backdrop-blur-2xl border-white/5 shadow-2xl relative overflow-hidden">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg text-white">Student Perception Model</CardTitle>
                  <CardDescription className="text-white/40">Aggregated feedback sentiment across all axes.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex items-center justify-center min-h-[300px]">
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.05)" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 600 }} 
                      />
                      <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
                      <Radar 
                        name="Student Avg" 
                        dataKey="score" 
                        stroke="#a855f7" 
                        strokeWidth={2}
                        fill="#a855f7" 
                        fillOpacity={0.3}
                        activeDot={{ r: 4, fill: '#d8b4fe', stroke: '#fff', strokeWidth: 1 }}
                      />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'rgba(10, 5, 21, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#d8b4fe', fontWeight: 'bold' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                 <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 backdrop-blur-xl">
                   <CardContent className="p-5 text-center">
                     <p className="text-2xl font-black text-pink-400">{reviews.length}</p>
                     <p className="text-xs font-semibold text-pink-200/50 uppercase mt-1">Total</p>
                   </CardContent>
                 </Card>
                 <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 backdrop-blur-xl">
                   <CardContent className="p-5 text-center">
                     <p className="text-2xl font-black text-indigo-400">{commented.length}</p>
                     <p className="text-xs font-semibold text-indigo-200/50 uppercase mt-1">Comments</p>
                   </CardContent>
                 </Card>
              </div>
            </div>

            {/* Right Column: Narrative Feedback Stream */}
            <div className="w-full lg:w-2/3">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white">
                <MessageSquare className="h-5 w-5 text-purple-400" /> Qualitative Insights
              </h2>
              
              {commented.length === 0 ? (
                <div className="p-8 border border-white/10 rounded-2xl bg-white/5 text-center text-white/40">
                   No written comments yet. All reviews are rating-only.
                </div>
              ) : (
                <div className="grid gap-4">
                  {commented.map((review, idx) => {
                    const hasSubScores = !!review.subScores;
                    return (
                      <motion.div key={review.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + idx * 0.05 }}>
                        <Card className="bg-[#11162a]/60 backdrop-blur-xl border-white/5 hover:border-purple-500/30 hover:bg-[#11162a]/80 transition-all duration-300">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-lg font-bold text-purple-400 border border-purple-500/30">
                                  A
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-white">Anonymous Student</div>
                                  <div className="text-xs text-white/40">{new Date(review.createdAt).toLocaleDateString()}</div>
                                </div>
                              </div>
                              <div className="flex gap-2 items-center">
                                {hasSubScores && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-white/5 text-white/60 border border-white/10">Detailed</span>}
                                {review.comment && <SentimentTag text={review.comment} />}
                              </div>
                            </div>
                            
                            <p className="text-lg leading-relaxed mb-6 text-purple-50/90 font-medium">"{review.comment}"</p>
                            
                            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                              {hasSubScores ? (
                                 <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                                   {[
                                     { key: "teachingQuality", label: "Teach", color: "text-blue-400" },
                                     { key: "availability", label: "Avail", color: "text-green-400" },
                                     { key: "communication", label: "Comms", color: "text-purple-400" },
                                     { key: "knowledge", label: "Know", color: "text-amber-400" },
                                     { key: "fairness", label: "Fair", color: "text-red-400" },
                                     { key: "engagement", label: "Eng", color: "text-orange-400" },
                                     { key: "helpfulness", label: "Help", color: "text-pink-400" },
                                     { key: "courseOrganization", label: "Org", color: "text-teal-400" },
                                   ].map(f => (
                                     <div key={f.key} className="text-center group cursor-default">
                                       <div className={`text-sm font-black ${f.color} opacity-80 group-hover:opacity-100 transition-opacity`}>{getCategoryAvg(review.subScores[f.key]).toFixed(1)}</div>
                                       <div className="text-[9px] text-white/30 uppercase tracking-widest mt-1 group-hover:text-white/60 transition-colors">{f.label}</div>
                                     </div>
                                   ))}
                                 </div>
                              ) : (
                                 <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                   {[
                                     { label: "Teach", val: review.teachingQuality, color: "text-blue-400" },
                                     { label: "Avail", val: review.availability, color: "text-purple-400" },
                                     { label: "Comms", val: review.communication, color: "text-pink-400" },
                                     { label: "Know", val: review.knowledge, color: "text-amber-400" },
                                     { label: "Fair", val: review.fairness, color: "text-green-400" },
                                   ].map(f => (
                                     <div key={f.label} className="text-center">
                                       <div className={`text-base font-black ${f.color} opacity-80`}>{f.val}<span className="text-xs text-white/20">/5</span></div>
                                       <div className="text-[9px] text-white/30 uppercase tracking-widest mt-1">{f.label}</div>
                                     </div>
                                   ))}
                                 </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

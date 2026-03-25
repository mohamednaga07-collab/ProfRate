import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { MessageSquare, Star, TrendingUp, AlertCircle, BookOpen, Award } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StarRating } from "@/components/StarRating";

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
}

function SentimentTag({ text }: { text: string }) {
  const lower = text.toLowerCase();
  const positive = ["great", "excellent", "amazing", "best", "good", "helpful", "clear", "kind", "fair", "awesome", "wonderful", "fantastic", "loved"];
  const negative = ["bad", "poor", "terrible", "awful", "boring", "hard", "unclear", "rude", "unfair", "worst", "unhelpful"];
  const isPos = positive.some(w => lower.includes(w));
  const isNeg = negative.some(w => lower.includes(w));
  if (isPos) return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-200 dark:border-green-800 font-medium">Positive</span>;
  if (isNeg) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-200 dark:border-red-800 font-medium">Critical</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-200 dark:border-blue-800 font-medium">Neutral</span>;
}

function getCategoryAvg(catSubScores: Record<string, number> | undefined) {
  if (!catSubScores) return 0;
  const vals = Object.values(catSubScores);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export default function TeacherFeedback() {
  const { user } = useAuth();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-500/5">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-200 dark:border-purple-800">
              <MessageSquare className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Student Feedback</h1>
              <p className="text-muted-foreground">Anonymous reviews your students have left for you</p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : !data?.matched ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Alert className="border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 mb-6">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>No profile linked</strong> — Your account name (<em>{user?.firstName} {user?.lastName}</em>) could not be matched automatically to a doctor profile. Ask an admin to ensure your full name matches your registered professor entry.
              </AlertDescription>
            </Alert>
          </motion.div>
        ) : reviews.length === 0 ? (
          <Card className="text-center py-16 border-dashed">
            <CardContent>
              <BookOpen className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">No reviews yet for your profile. Check back once students start rating!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="grid sm:grid-cols-3 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800">
                <CardContent className="pt-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Rating</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {avgOverall > 5 ? `${avgOverall.toFixed(1)} / 10` : `${avgOverall.toFixed(1)} / 5`}
                    </p>
                    <StarRating rating={avgOverall > 5 ? avgOverall / 2 : avgOverall} size="sm" />
                  </div>
                  <Award className="h-10 w-10 text-purple-400/60" />
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Reviews</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{reviews.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">from students</p>
                  </div>
                  <MessageSquare className="h-10 w-10 text-blue-400/60" />
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
                <CardContent className="pt-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Written Comments</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{commented.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">{noComment.length} rating-only</p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-green-400/60" />
                </CardContent>
              </Card>
            </motion.div>

            {/* Written Comments */}
            {commented.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" /> Written Feedback
                </h2>
                <div className="grid gap-4">
                  {commented.map((review, idx) => {
                    const hasSubScores = !!review.subScores;
                    return (
                      <motion.div key={review.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + idx * 0.06 }}>
                        <Card className="bg-card/80 backdrop-blur hover:shadow-md transition-shadow">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                  A
                                </div>
                                <span className="text-sm text-muted-foreground">Anonymous Student</span>
                                <span className="text-xs text-muted-foreground">
                                  · {new Date(review.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                {hasSubScores && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">Detailed Review</span>}
                                {review.comment && <SentimentTag text={review.comment} />}
                              </div>
                            </div>
                            <p className="text-base leading-relaxed mb-4 italic">"{review.comment}"</p>
                            
                            {hasSubScores ? (
                               <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-3 border-t">
                                 {[
                                   { key: "teachingQuality", label: "Teaching", color: "text-blue-500" },
                                   { key: "availability", label: "Available", color: "text-green-500" },
                                   { key: "communication", label: "Comms", color: "text-purple-500" },
                                   { key: "knowledge", label: "Knowledge", color: "text-amber-500" },
                                   { key: "fairness", label: "Fairness", color: "text-red-500" },
                                   { key: "engagement", label: "Engage", color: "text-yellow-500" },
                                   { key: "helpfulness", label: "Helpful", color: "text-pink-500" },
                                   { key: "courseOrganization", label: "Org", color: "text-teal-500" },
                                 ].map(f => (
                                   <div key={f.key} className="text-center p-1 bg-muted/30 rounded-md">
                                     <div className={`text-sm font-bold ${f.color}`}>{getCategoryAvg(review.subScores[f.key]).toFixed(1)}</div>
                                     <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</div>
                                   </div>
                                 ))}
                               </div>
                            ) : (
                               <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t">
                                 {[
                                   { label: "Teaching", val: review.teachingQuality, color: "text-blue-500" },
                                   { label: "Availability", val: review.availability, color: "text-purple-500" },
                                   { label: "Communication", val: review.communication, color: "text-pink-500" },
                                   { label: "Knowledge", val: review.knowledge, color: "text-amber-500" },
                                   { label: "Fairness", val: review.fairness, color: "text-green-500" },
                                 ].map(f => (
                                   <div key={f.label} className="text-center p-2 bg-muted/30 rounded-md">
                                     <div className={`text-lg font-bold ${f.color}`}>{f.val}/5</div>
                                     <div className="text-xs text-muted-foreground">{f.label}</div>
                                   </div>
                                 ))}
                               </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rating-only reviews summary */}
            {noComment.length > 0 && (
              <Card className="bg-muted/30 border-dashed">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    {noComment.length} Rating-Only Reviews
                  </CardTitle>
                  <CardDescription>These students left star ratings without written comments</CardDescription>
                </CardHeader>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

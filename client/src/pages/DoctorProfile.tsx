import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { StarRating } from "@/components/StarRating";
import { RatingBar } from "@/components/RatingBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useTranslation } from "react-i18next";
import { Star, ArrowLeft, Shield, Calendar, MessageSquare, ChevronRight, ChevronLeft, CheckCircle2, BookOpen, Clock, MessageCircle, Brain, Scale, Zap, HandHeart, GraduationCap, Send } from "lucide-react";
import type { DoctorWithRatings, Review } from "@shared/schema";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { cn } from "@/lib/utils";

// Definition of all 8 rating categories with their sub-questions
// Labels and questions are looked up by key from i18n at render time
const CATEGORIES = [
  { key: "teachingQuality", questionCount: 3, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { key: "availability",    questionCount: 2, icon: Clock,      color: "text-green-500",  bg: "bg-green-500/10",  border: "border-green-500/20" },
  { key: "communication",  questionCount: 3, icon: MessageCircle, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { key: "knowledge",      questionCount: 2, icon: Brain,      color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  { key: "fairness",       questionCount: 3, icon: Scale,      color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/20" },
  { key: "engagement",     questionCount: 2, icon: Zap,        color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  { key: "helpfulness",    questionCount: 2, icon: HandHeart,  color: "text-pink-500",   bg: "bg-pink-500/10",   border: "border-pink-500/20" },
  { key: "courseOrganization", questionCount: 3, icon: GraduationCap, color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20" },
];

// Group categories into 3 steps
const STEPS = [
  CATEGORIES.slice(0, 3),
  CATEGORIES.slice(3, 6),
  CATEGORIES.slice(6, 8),
];

type SubScores = {
  [cat: string]: { [q: string]: number };
};

function makeDefaultSubScores(): SubScores {
  const result: SubScores = {};
  for (const cat of CATEGORIES) {
    result[cat.key] = {};
    for (let i = 0; i < cat.questionCount; i++) {
      result[cat.key][`q${i + 1}`] = 5; // default midpoint
    }
  }
  return result;
}

function getScoreLabel(val: number): string {
  if (val <= 2) return "Very Poor";
  if (val <= 4) return "Poor";
  if (val <= 6) return "Fair";
  if (val <= 8) return "Good";
  return "Excellent";
}

function getScoreColor(val: number): string {
  if (val <= 3) return "text-red-500";
  if (val <= 5) return "text-orange-500";
  if (val <= 7) return "text-yellow-500";
  return "text-green-500";
}

function computeCategoryAvg(scores: Record<string, number>): number {
  const vals = Object.values(scores);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Injected RatingSliderRow to manage ultra-fast local state without lagging the main form
const RatingSliderRow = ({ q, qKey, initialValue, cat, updateScore }: any) => {
  const [localVal, setLocalVal] = useState(initialValue);
  
  return (
    <div key={qKey} className="space-y-2">
      <div className="flex justify-between items-start gap-3">
        <Label className="text-sm leading-relaxed">{q}</Label>
        <div className="text-right flex-shrink-0 min-w-[60px]">
          <span className={`text-2xl font-bold ${getScoreColor(localVal)}`}>{localVal.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground block whitespace-nowrap">{getScoreLabel(localVal)}</span>
        </div>
      </div>
      <Slider
        min={1} max={10} step={0.1}
        value={[localVal]}
        onValueChange={([v]) => setLocalVal(v)}
        onValueCommit={([v]) => updateScore(cat.key, qKey, v)}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>1 — Very Poor</span><span>5 — Fair</span><span>10 — Excellent</span>
      </div>
    </div>
  );
};

export default function DoctorProfile() {
  const [, params] = useRoute("/doctors/:id");
  const doctorId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isMsgDialogOpen, setIsMsgDialogOpen] = useState(false);
  const [step, setStep] = useState(0); // 0-2 for 3 steps, 3 = comment/summary
  const [subScores, setSubScores] = useState<SubScores>(makeDefaultSubScores());
  const [comment, setComment] = useState("");

  const { data: doctor, isLoading: doctorLoading } = useQuery<DoctorWithRatings>({
    queryKey: ["/api/doctors", doctorId],
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/doctors", doctorId, "reviews"],
  });

  const { data: myReview, isLoading: myReviewLoading } = useQuery<Review | null>({
    queryKey: ["/api/doctors", doctorId, "my-review"],
    queryFn: async () => {
      const res = await fetch(`/api/reviews/my/${doctorId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user && user.role === "student",
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        subScores,
        comment: comment || undefined,
      };
      
      if (myReview?.id) {
        return apiRequest("PUT", `/api/doctors/${doctorId}/reviews/${myReview.id}`, payload);
      }
      return apiRequest("POST", `/api/doctors/${doctorId}/reviews`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", doctorId] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", doctorId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", doctorId, "my-review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      toast({ title: myReview ? "Review updated successfully" : t("doctorProfile.toast.reviewSubmitted") });
      setIsReviewDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("doctorProfile.toast.unauthorized.title"),
          description: t("doctorProfile.toast.unauthorized.description"),
          variant: "destructive",
        });
        setTimeout(() => { window.location.href = "/"; }, 500);
        return;
      }
      toast({ 
        title: t("doctorProfile.toast.submitFailed"), 
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive" 
      });
    },
  });

  const resetForm = () => {
    setSubScores(makeDefaultSubScores());
    setComment("");
    setStep(0);
  };

  const handleOpen = (open: boolean) => {
    setIsReviewDialogOpen(open);
    if (!open) {
      resetForm();
    } else if (myReview) {
      // Pre-fill form
      if (myReview.subScores) {
         setSubScores(myReview.subScores as SubScores);
      }
      if (myReview.comment) {
         setComment(myReview.comment);
      }
      setStep(0);
    }
  };

  const updateScore = (cat: string, q: string, val: number) => {
    setSubScores(prev => ({ ...prev, [cat]: { ...prev[cat], [q]: val } }));
  };

  const totalSteps = STEPS.length + 1; // 3 category steps + 1 comment step
  const progress = ((step + 1) / totalSteps) * 100;

  const currentStepCategories = step < STEPS.length ? STEPS[step] : null;

  // Compute preview scores for summary step
  const catAverages = Object.fromEntries(
    CATEGORIES.map(cat => [cat.key, computeCategoryAvg(subScores[cat.key])])
  );
  const overallPreview = Object.values(catAverages).reduce((a, b) => a + b, 0) / 8;

  const initials = doctor?.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (doctorLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card><CardContent className="p-8"><div className="flex items-start gap-6"><Skeleton className="h-24 w-24 rounded-full" /><div className="flex-1"><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-32 mb-4" /><Skeleton className="h-6 w-24" /></div></div></CardContent></Card>
            </div>
            <div><Skeleton className="h-64 w-full" /></div>
          </div>
        </main>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card><CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">{t("doctorProfile.notFound.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("doctorProfile.notFound.description")}</p>
            <Button asChild><Link href="/doctors">{t("doctorProfile.backToProfessors")}</Link></Button>
          </CardContent></Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={cn("transition-all duration-300", isReviewDialogOpen ? "blur-md scale-[0.99] opacity-50 pointer-events-none select-none" : "")}>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/doctors"><ArrowLeft className="h-4 w-4 mr-2" />{t("doctorProfile.backToProfessors")}</Link>
          </Button>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    <Avatar className="h-24 w-24 shrink-0">
                      <AvatarImage src={doctor.profileImageUrl ?? undefined} alt={doctor.name} />
                      <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h1 className="text-2xl font-bold" data-testid="text-doctor-name">
                            {t("doctorProfile.doctorPrefix")} {t(`home.professors.names.${doctor.name.replace(/^Dr\.?\s+/i, "")}`, { defaultValue: doctor.name.replace(/^Dr\.?\s+/i, "") })}
                          </h1>
                          <p className="text-muted-foreground">{t(`home.departments.${doctor.department}`, { defaultValue: doctor.department })}</p>
                          {doctor.title && <Badge variant="secondary" className="mt-2">{t(`home.departments.${doctor.title}`, { defaultValue: doctor.title })}</Badge>}
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-4">
                            <StarRating rating={doctor.ratings?.overallRating ?? 0} size="lg" />
                            <span className="text-2xl font-bold">{(doctor.ratings?.overallRating ?? 0).toFixed(1)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {doctor.ratings?.totalReviews ?? 0} {t("doctorProfile.reviewsCount", { count: doctor.ratings?.totalReviews ?? 0 })}
                          </p>
                        </div>
                        {/* Rate button — available only to students */}
                        {user && user.role === "student" && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            {myReviewLoading ? (
                               <Skeleton className="h-10 w-32" />
                            ) : myReview ? (
                              <Button data-testid="button-write-review" onClick={() => handleOpen(true)}>
                                <Star className="h-4 w-4 mr-2" />
                                Update Your Review
                              </Button>
                            ) : (
                              <Button data-testid="button-write-review" onClick={() => handleOpen(true)}>
                                <Star className="h-4 w-4 mr-2" />
                                {t("doctorProfile.writeReview")}
                              </Button>
                            )}
                            <Button variant="outline" data-testid="button-anon-message" onClick={() => setIsMsgDialogOpen(true)}>
                              <Send className="h-4 w-4 mr-2" />
                              Message Teacher
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {doctor.bio && (
                <Card><CardContent className="p-6"><p className="text-muted-foreground">{doctor.bio}</p></CardContent></Card>
              )}

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />{t("doctorProfile.reviewsTitle")}</CardTitle></CardHeader>
                <CardContent>
                  {reviewsLoading ? (
                    <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-16 w-full" /></div>)}</div>
                  ) : reviews && reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((review) => {
                        const hasDetail = review.subScores != null;
                        const overallVal = review.overallScore ?? ((review.teachingQuality + review.availability + review.communication + review.knowledge + review.fairness) / 5);
                        return (
                          <div key={review.id} className="pb-6 border-b last:border-0 last:pb-0" data-testid={`review-${review.id}`}>
                            <div className="flex items-center justify-between gap-4 mb-3">
                              <div className="flex items-center gap-2">
                                <span className={`text-xl font-bold ${getScoreColor(hasDetail ? overallVal : overallVal * 2)}`}>
                                  {hasDetail ? overallVal.toFixed(1) : (overallVal).toFixed(1)}
                                </span>
                                <span className="text-sm text-muted-foreground">{hasDetail ? "/10" : "/5"}</span>
                                {hasDetail && <Badge variant="secondary" className="text-xs">Detailed Review</Badge>}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : t("doctorProfile.unknownDate")}
                              </div>
                            </div>

                            {hasDetail ? (
                              <div className="grid grid-cols-4 gap-2 mb-3">
                                {CATEGORIES.map(cat => {
                                  const sub = (review.subScores as any)?.[cat.key] ?? {};
                                  const catAvg = computeCategoryAvg(sub);
                                  return (
                                   <div key={cat.key} className={`text-center p-2 rounded-lg ${cat.bg} border ${cat.border}`}>
                                      <cat.icon className={`h-4 w-4 mx-auto mb-1 ${cat.color}`} />
                                      <div className={`font-bold text-sm ${getScoreColor(catAvg)}`}>{catAvg.toFixed(1)}</div>
                                      <div className="text-xs text-muted-foreground truncate">{t(`doctorProfile.categories.${cat.key}`, { defaultValue: cat.key })}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="grid grid-cols-5 gap-2 mb-3 text-xs">
                                {[
                                  { label: t("doctorProfile.factorsShort.teaching"), value: review.teachingQuality },
                                  { label: t("doctorProfile.factorsShort.availability"), value: review.availability },
                                  { label: t("doctorProfile.factorsShort.communication"), value: review.communication },
                                  { label: t("doctorProfile.factorsShort.knowledge"), value: review.knowledge },
                                  { label: t("doctorProfile.factorsShort.fairness"), value: review.fairness },
                                ].map(({ label, value }) => (
                                  <div key={label} className="text-center p-2 bg-muted rounded">
                                    <div className="font-medium">{value}/5</div>
                                    <div className="text-muted-foreground truncate">{label}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {review.comment && <p className="text-muted-foreground mt-2">{review.comment}</p>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">{t("doctorProfile.noReviews.title")}</h3>
                      <p className="text-muted-foreground mb-4">{t("doctorProfile.noReviews.description")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>{t("doctorProfile.ratingBreakdown")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <RatingBar label={t("doctorProfile.factors.teachingQuality")} value={doctor.ratings?.avgTeachingQuality ?? 0} />
                  <RatingBar label={t("doctorProfile.factors.availability")} value={doctor.ratings?.avgAvailability ?? 0} />
                  <RatingBar label={t("doctorProfile.factors.communication")} value={doctor.ratings?.avgCommunication ?? 0} />
                  <RatingBar label={t("doctorProfile.factors.knowledge")} value={doctor.ratings?.avgKnowledge ?? 0} />
                  <RatingBar label={t("doctorProfile.factors.fairness")} value={doctor.ratings?.avgFairness ?? 0} />
                  {(doctor.ratings?.avgEngagement ?? 0) > 0 && <>
                    <RatingBar label={t("doctorProfile.factors.engagement")} value={doctor.ratings?.avgEngagement ?? 0} maxValue={10} />
                    <RatingBar label={t("doctorProfile.factors.helpfulness")} value={doctor.ratings?.avgHelpfulness ?? 0} maxValue={10} />
                    <RatingBar label={t("doctorProfile.factors.courseOrganization")} value={doctor.ratings?.avgCourseOrganization ?? 0} maxValue={10} />
                  </>}
                </CardContent>
              </Card>

              <Card className="border-chart-2/30 bg-chart-2/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="h-5 w-5 text-chart-2" />
                    <h3 className="font-semibold">{t("doctorProfile.anonymousCard.title")}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("doctorProfile.anonymousCard.description", { brand: t("brand.name") })}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Multi-step Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={handleOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl shadow-2xl border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              {t("doctorProfile.rateDoctorTitle", { name: doctor.name.replace(/^Dr\.?\s+/i, "") })}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 pt-1">
              <Shield className="h-4 w-4 text-chart-2" />{t("doctorProfile.anonymous")}
            </DialogDescription>
          </DialogHeader>

          {/* Step progress bar */}
          <div className="space-y-1 mb-6">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>{t("doctorProfile.stepOf", { step: step + 1, total: totalSteps, defaultValue: `Step ${step + 1} of ${totalSteps}` })}</span>
              <span>{Math.round(progress)}% {t("doctorProfile.complete", { defaultValue: "complete" })}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <AnimatePresence mode="wait">
            {step < STEPS.length ? (
              /* Category question steps */
              <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
                {currentStepCategories!.map((cat) => {
                  const catLabel = t(`doctorProfile.categories.${cat.key}`, { defaultValue: cat.key });
                  const translatedQuestions = t(`doctorProfile.questions.${cat.key}`, { returnObjects: true });
                  const catQuestions = Array.isArray(translatedQuestions) 
                    ? translatedQuestions 
                    : Array.from({ length: cat.questionCount }).map((_, i) => `Question ${i + 1}`);
                  
                  return (
                  <div key={cat.key} className={`rounded-xl border ${cat.border} ${cat.bg} p-4`}>
                    <div className="flex items-center gap-2 mb-4">
                      <cat.icon className={`h-5 w-5 ${cat.color}`} />
                      <span className="font-semibold">{catLabel}</span>
                    </div>
                    <div className="space-y-5">
                      {catQuestions.map((q, qi) => {
                        const qKey = `q${qi + 1}`;
                        const val = subScores[cat.key]?.[qKey] ?? 5;
                        return (
                          <RatingSliderRow 
                            key={qKey} 
                            q={q} 
                            qKey={qKey} 
                            initialValue={val} 
                            cat={cat} 
                            updateScore={updateScore} 
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
            ) : (
              /* Final step: comment + summary */
              <motion.div key="step-summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-5">
                <div>
                  <Label className="mb-2 block font-semibold">Score Summary</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map(cat => {
                      const catLbl = t(`doctorProfile.categories.${cat.key}`, { defaultValue: cat.key });
                      return (
                      <div key={cat.key} className={`text-center p-3 rounded-lg ${cat.bg} border ${cat.border}`}>
                        <cat.icon className={`h-4 w-4 mx-auto mb-1 ${cat.color}`} />
                        <div className={`text-lg font-bold ${getScoreColor(catAverages[cat.key])}`}>
                          {catAverages[cat.key].toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground leading-tight">{catLbl}</div>
                      </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                    <span className="font-semibold text-sm">Overall Score</span>
                    <span className={`text-2xl font-bold ${getScoreColor(overallPreview)}`}>
                      {overallPreview.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 10</span>
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("doctorProfile.commentsOptional")}</Label>
                  <Textarea
                    placeholder={t("doctorProfile.commentPlaceholder")}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-24"
                    data-testid="input-review-comment"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between gap-3 mt-6 pt-4 border-t">
            <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            {step < totalSteps - 1 ? (
              <Button onClick={() => setStep(s => s + 1)} className="gap-2">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => submitReviewMutation.mutate()}
                disabled={submitReviewMutation.isPending}
                className="gap-2 bg-green-600 hover:bg-green-700"
                data-testid="button-submit-review"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitReviewMutation.isPending ? t("doctorProfile.submitting") : "Submit Review"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Anonymous message to teacher — visible to students only */}
      {user?.role === "student" && doctor && (
        <SendMessageDialog
          open={isMsgDialogOpen}
          onOpenChange={setIsMsgDialogOpen}
          receiverId={undefined} /* teacher userId unknown — admin routes it */
          receiverName={doctor.name}
          targetDoctorId={doctor.id}
          forcedType="direct"
          forceAnonymous={true}
        />
      )}
    </div>
  );
}

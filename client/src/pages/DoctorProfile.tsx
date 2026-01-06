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
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useTranslation } from "react-i18next";
import {
  Star,
  ArrowLeft,
  Shield,
  Calendar,
  MessageSquare,
} from "lucide-react";
import type { DoctorWithRatings, Review } from "@shared/schema";
import { useState } from "react";
import { z } from "zod";

const reviewSchema = z.object({
  teachingQuality: z.number().min(1).max(5),
  availability: z.number().min(1).max(5),
  communication: z.number().min(1).max(5),
  knowledge: z.number().min(1).max(5),
  fairness: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export default function DoctorProfile() {
  const [, params] = useRoute("/doctors/:id");
  const doctorId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  const [ratings, setRatings] = useState({
    teachingQuality: 0,
    availability: 0,
    communication: 0,
    knowledge: 0,
    fairness: 0,
  });
  const [comment, setComment] = useState("");

  const { data: doctor, isLoading: doctorLoading } = useQuery<DoctorWithRatings>({
    queryKey: ["/api/doctors", doctorId],
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/doctors", doctorId, "reviews"],
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (data: z.infer<typeof reviewSchema>) => {
      return apiRequest("POST", `/api/doctors/${doctorId}/reviews`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", doctorId] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", doctorId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      toast({ title: t("doctorProfile.toast.reviewSubmitted") });
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
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({ title: t("doctorProfile.toast.submitFailed"), variant: "destructive" });
    },
  });

  const resetForm = () => {
    setRatings({
      teachingQuality: 0,
      availability: 0,
      communication: 0,
      knowledge: 0,
      fairness: 0,
    });
    setComment("");
  };

  const handleSubmitReview = () => {
    const allRated = Object.values(ratings).every((r) => r > 0);
    if (!allRated) {
      toast({ title: t("doctorProfile.toast.rateAll"), variant: "destructive" });
      return;
    }

    submitReviewMutation.mutate({
      ...ratings,
      comment: comment || undefined,
    });
  };

  const initials = doctor?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (doctorLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-start gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-8 w-48 mb-2" />
                      <Skeleton className="h-4 w-32 mb-4" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
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
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="text-xl font-semibold mb-2">{t("doctorProfile.notFound.title")}</h2>
              <p className="text-muted-foreground mb-4">
                {t("doctorProfile.notFound.description")}
              </p>
              <Button asChild>
                <Link href="/doctors">{t("doctorProfile.backToProfessors")}</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/doctors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("doctorProfile.backToProfessors")}
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <Avatar className="h-24 w-24 shrink-0">
                    <AvatarImage src={doctor.profileImageUrl ?? undefined} alt={doctor.name} />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-bold" data-testid="text-doctor-name">
                          {t("doctorProfile.doctorPrefix")} {doctor.name.replace(/^Dr\.?\s+/i, "")}
                        </h1>
                        <p className="text-muted-foreground">{doctor.department}</p>
                        {doctor.title && (
                          <Badge variant="secondary" className="mt-2">
                            {doctor.title}
                          </Badge>
                        )}
                      </div>

                      {user?.role === "student" && (
                        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                          <DialogTrigger asChild>
                            <Button data-testid="button-write-review">
                              <Star className="h-4 w-4 mr-2" />
                              {t("doctorProfile.writeReview")}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                {t("doctorProfile.rateDoctorTitle", {
                                  name: doctor.name.replace(/^Dr\.?\s+/i, ""),
                                })}
                              </DialogTitle>
                              <DialogDescription className="flex items-center gap-2 pt-2">
                                <Shield className="h-4 w-4 text-chart-2" />
                                {t("doctorProfile.anonymous")}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-4 pr-2">
                              {[
                                { key: "teachingQuality", label: t("doctorProfile.factors.teachingQuality") },
                                { key: "availability", label: t("doctorProfile.factors.availability") },
                                { key: "communication", label: t("doctorProfile.factors.communication") },
                                { key: "knowledge", label: t("doctorProfile.factors.knowledge") },
                                { key: "fairness", label: t("doctorProfile.factors.fairness") },
                              ].map(({ key, label }) => (
                                <div key={key} className="space-y-2">
                                  <Label>{label}</Label>
                                  <StarRating
                                    rating={ratings[key as keyof typeof ratings]}
                                    size="lg"
                                    interactive
                                    onRatingChange={(value) =>
                                      setRatings((prev) => ({
                                        ...prev,
                                        [key]: value,
                                      }))
                                    }
                                  />
                                </div>
                              ))}

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

                              <Button
                                className="w-full"
                                onClick={handleSubmitReview}
                                disabled={submitReviewMutation.isPending}
                                data-testid="button-submit-review"
                              >
                                {submitReviewMutation.isPending
                                  ? t("doctorProfile.submitting")
                                  : t("doctorProfile.submitReview")}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center gap-4">
                        <StarRating
                          rating={doctor.ratings?.overallRating ?? 0}
                          size="lg"
                        />
                        <span className="text-2xl font-bold">
                          {(doctor.ratings?.overallRating ?? 0).toFixed(1)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {doctor.ratings?.totalReviews ?? 0} {t("doctorProfile.reviewsCount", { count: doctor.ratings?.totalReviews ?? 0 })}
                      </p>
                    </div>
                  </div>
                </div>

                {doctor.bio && (
                  <>
                    <Separator className="my-6" />
                    <p className="text-muted-foreground">{doctor.bio}</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {t("doctorProfile.reviewsTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ))}
                  </div>
                ) : reviews && reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="pb-6 border-b last:border-0 last:pb-0"
                        data-testid={`review-${review.id}`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <StarRating
                            rating={
                              (review.teachingQuality +
                                review.availability +
                                review.communication +
                                review.knowledge +
                                review.fairness) /
                              5
                            }
                            size="sm"
                            showValue
                          />
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {review.createdAt
                              ? new Date(review.createdAt).toLocaleDateString()
                              : t("doctorProfile.unknownDate")}
                          </div>
                        </div>

                        <div className="grid grid-cols-5 gap-2 mb-3 text-xs">
                          {[
                            { label: t("doctorProfile.factorsShort.teaching"), value: review.teachingQuality },
                            { label: t("doctorProfile.factorsShort.availability"), value: review.availability },
                            { label: t("doctorProfile.factorsShort.communication"), value: review.communication },
                            { label: t("doctorProfile.factorsShort.knowledge"), value: review.knowledge },
                            { label: t("doctorProfile.factorsShort.fairness"), value: review.fairness },
                          ].map(({ label, value }) => (
                            <div
                              key={label}
                              className="text-center p-2 bg-muted rounded"
                            >
                              <div className="font-medium">{value}/5</div>
                              <div className="text-muted-foreground truncate">
                                {label}
                              </div>
                            </div>
                          ))}
                        </div>

                        {review.comment && (
                          <p className="text-muted-foreground">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">{t("doctorProfile.noReviews.title")}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t("doctorProfile.noReviews.description")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("doctorProfile.ratingBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RatingBar
                  label={t("doctorProfile.factors.teachingQuality")}
                  value={doctor.ratings?.avgTeachingQuality ?? 0}
                />
                <RatingBar
                  label={t("doctorProfile.factors.availability")}
                  value={doctor.ratings?.avgAvailability ?? 0}
                />
                <RatingBar
                  label={t("doctorProfile.factors.communication")}
                  value={doctor.ratings?.avgCommunication ?? 0}
                />
                <RatingBar
                  label={t("doctorProfile.factors.knowledge")}
                  value={doctor.ratings?.avgKnowledge ?? 0}
                />
                <RatingBar
                  label={t("doctorProfile.factors.fairness")}
                  value={doctor.ratings?.avgFairness ?? 0}
                />
              </CardContent>
            </Card>

            <Card className="border-chart-2/30 bg-chart-2/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-5 w-5 text-chart-2" />
                  <h3 className="font-semibold">{t("doctorProfile.anonymousCard.title")}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("doctorProfile.anonymousCard.description", {
                    brand: t("brand.name"),
                  })}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

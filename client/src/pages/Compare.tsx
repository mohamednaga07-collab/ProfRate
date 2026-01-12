import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RatingBar } from "@/components/RatingBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, TrendingUp, Award, Users, Sparkles, CheckCircle, Target } from "lucide-react";
import type { DoctorWithRatings } from "@shared/schema";
import { useTranslation } from "react-i18next";

export default function Compare() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const maxCompare = 2;

  const { data: doctors, isLoading } = useQuery<DoctorWithRatings[]>({ queryKey: ["/api/doctors"] });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get("ids");
    if (idsParam) setSelectedIds(idsParam.split(",").map(Number).filter(Boolean).slice(0, maxCompare));
  }, [location]);

  const selectedDoctors = useMemo(() => {
    if (!doctors) return [] as DoctorWithRatings[];
    return selectedIds.map((id) => doctors.find((d) => d.id === id)).filter((d): d is DoctorWithRatings => !!d);
  }, [doctors, selectedIds]);

  const availableDoctors = useMemo(() => (doctors ?? []).filter((d) => !selectedIds.includes(d.id)), [doctors, selectedIds]);

  const addDoctor = (id: number) => setSelectedIds((s) => (s.includes(id) ? s : s.length < maxCompare ? [...s, id] : s));
  const removeDoctor = (id: number) => setSelectedIds((s) => s.filter((x) => x !== id));

  const normalizeName = (name: string) => name.replace(/^Dr\.?\s+/i, "").trim();

  const factors = useMemo(
    () => [
      { key: "avgTeachingQuality" as const, label: t("doctorProfile.factors.teachingQuality") },
      { key: "avgAvailability" as const, label: t("doctorProfile.factors.availability") },
      { key: "avgCommunication" as const, label: t("doctorProfile.factors.communication") },
      { key: "avgKnowledge" as const, label: t("doctorProfile.factors.knowledge") },
      { key: "avgFairness" as const, label: t("doctorProfile.factors.fairness") },
    ],
    [t],
  );

  const getRatingValue = (
    d: DoctorWithRatings | undefined,
    key:
      | "avgTeachingQuality"
      | "avgAvailability"
      | "avgCommunication"
      | "avgKnowledge"
      | "avgFairness"
      | "overallRating",
  ) => {
    if (!d?.ratings) return 0;
    const value = (d.ratings as any)[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  };

  const getTotalReviews = (d: DoctorWithRatings | undefined) => {
    const value = d?.ratings?.totalReviews;
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  };

  const comparison = useMemo(() => {
    const [a, b] = selectedDoctors;
    if (!a || !b) return null;

    const aReviews = getTotalReviews(a);
    const bReviews = getTotalReviews(b);
    const hasAnyReviews = aReviews > 0 || bReviews > 0;

    const overallA = getRatingValue(a, "overallRating");
    const overallB = getRatingValue(b, "overallRating");

    let overallWinner: "a" | "b" | "tie" | "none" = "none";
    if (hasAnyReviews) {
      overallWinner = overallA === overallB ? "tie" : overallA > overallB ? "a" : "b";
    }

    const factorWinners = factors.map((f) => {
      const aVal = getRatingValue(a, f.key);
      const bVal = getRatingValue(b, f.key);
      const winner: "a" | "b" | "tie" | "none" =
        hasAnyReviews ? (aVal === bVal ? "tie" : aVal > bVal ? "a" : "b") : "none";
      return { ...f, aVal, bVal, winner };
    });

    return { a, b, aReviews, bReviews, hasAnyReviews, overallA, overallB, overallWinner, factorWinners };
  }, [factors, selectedDoctors]);

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">{t("common.loading")}</main>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button asChild className="mb-6 gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg border border-indigo-600/20 font-semibold">
          <Link href="/doctors">
            <ArrowLeft className="h-4 w-4" />
            {t("compare.backToProfessors")}
          </Link>
        </Button>

        <Card className="mb-6 border border-border bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-background shadow-sm">
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-200">
                  <Sparkles className="h-4 w-4" />
                  {t("compare.hero.tag", { defaultValue: "Side-by-side" })}
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{t("compare.title")}</h1>
                <p className="text-muted-foreground max-w-2xl">{t("compare.hero.subtitle", { defaultValue: t("compare.subtitle") })}</p>
              </div>
              {selectedDoctors.length === 2 && comparison?.hasAnyReviews && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-white/70 dark:bg-slate-900/80 px-3 py-2 text-center shadow-sm">
                    <p className="text-xs text-muted-foreground">{t("compare.stats.avgDiff", { defaultValue: "Avg diff" })}</p>
                    <p className="text-lg font-semibold text-foreground">{Math.abs(comparison.overallA - comparison.overallB).toFixed(1)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-white/70 dark:bg-slate-900/80 px-3 py-2 text-center shadow-sm">
                    <p className="text-xs text-muted-foreground">{t("compare.stats.reviews", { defaultValue: "Reviews" })}</p>
                    <p className="text-lg font-semibold text-foreground">{comparison.aReviews + comparison.bReviews}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {selectedDoctors.map((d) => {
            const other = selectedDoctors.find((x) => x.id !== d.id);
            const overall = getRatingValue(d, "overallRating");
            const totalReviews = getTotalReviews(d);
            const otherOverall = getRatingValue(other, "overallRating");
            const showWinner = comparison?.hasAnyReviews && other;
            const isWinner = showWinner && overall > otherOverall;
            const isTie = showWinner && overall === otherOverall;

            return (
              <Card key={d.id}>
                <CardHeader className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 items-start">
                      <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                        <AvatarImage src={d.profileImageUrl ?? undefined} alt={d.name} className="object-cover" />
                        <AvatarFallback className="text-xl bg-primary/10 text-primary">
                          {normalizeName(d.name).substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="leading-tight text-xl pt-1">
                          {t("doctorProfile.doctorPrefix", "د.")} {t(`home.professors.names.${normalizeName(d.name)}`, { defaultValue: normalizeName(d.name) })}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground mt-1">
                          {d.title ? `${t(`home.departments.${d.title.trim()}`, { defaultValue: d.title })} • ` : ""}
                          {t(`home.departments.${d.department.trim()}`, { defaultValue: t(`home.departments.${d.department.trim().toLowerCase()}`, { defaultValue: d.department }) })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isWinner && <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 shadow-sm border-0">{t("compare.winner")}</Badge>}
                      {isTie && <Badge variant="secondary">{t("compare.tie")}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">{t("compare.overall")}</div>
                      <div className="text-3xl font-bold tabular-nums">{overall.toFixed(1)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">{t("compare.totalReviews")}</div>
                      <div className="text-lg font-semibold tabular-nums">{totalReviews}</div>
                    </div>
                  </div>

                  {d.bio ? <p className="text-sm text-muted-foreground leading-relaxed">{d.bio}</p> : null}

                  <div className="space-y-3">
                    {factors.map((f) => {
                      const val = getRatingValue(d, f.key);
                      const otherVal = other ? getRatingValue(other, f.key) : 0;
                      const isBest = comparison?.hasAnyReviews && val > otherVal;
                      return (
                        <div key={f.key} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{f.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold tabular-nums">{val.toFixed(1)}</span>
                              {isBest && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                            </div>
                          </div>
                          <RatingBar label="" value={val} />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <Button variant="outline" asChild>
                      <Link href={`/doctors/${d.id}`}>{t("compare.viewProfile")}</Link>
                    </Button>
                    <Button variant="ghost" onClick={() => removeDoctor(d.id)}>
                      {t("compare.remove")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {selectedDoctors.length < maxCompare && (
            <Card className="border-dashed">
              <CardContent>
                <div className="mb-2">{t("compare.addProfessor")}</div>
                <Select onValueChange={(v) => addDoctor(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("compare.selectProfessor")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDoctors.map((doc) => (
                      <SelectItem key={doc.id} value={String(doc.id)}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={doc.profileImageUrl ?? undefined} />
                            <AvatarFallback className="text-[10px]">
                            {normalizeName(doc.name).substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{t("doctorProfile.doctorPrefix", "د.")} {t(`home.professors.names.${normalizeName(doc.name)}`, { defaultValue: normalizeName(doc.name) })}</span>
                      </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 text-xs text-muted-foreground">{t("compare.chooseTwo")}</div>
              </CardContent>
            </Card>
          )}
        </div>

        {comparison && (
          <div className="mt-6 grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="space-y-1">
                <CardTitle>{t("compare.summaryTitle")}</CardTitle>
                {!comparison.hasAnyReviews ? (
                  <p className="text-sm text-muted-foreground">{t("compare.noReviewsYet")}</p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {comparison.factorWinners.map((f) => {
                    const winnerLabel =
                      f.winner === "a"
                        ? `${t("doctorProfile.doctorPrefix", "د.")} ${t(`home.professors.names.${normalizeName(comparison.a.name)}`, { defaultValue: normalizeName(comparison.a.name) })}`
                        : f.winner === "b"
                          ? `${t("doctorProfile.doctorPrefix", "د.")} ${t(`home.professors.names.${normalizeName(comparison.b.name)}`, { defaultValue: normalizeName(comparison.b.name) })}`
                          : f.winner === "tie"
                            ? t("compare.tie")
                            : t("compare.notAvailable");

                    return (
                      <div key={f.key} className="flex items-center justify-between gap-4">
                        <div className="text-sm font-medium text-muted-foreground">{f.label}</div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm tabular-nums">
                            {f.aVal.toFixed(1)} vs {f.bVal.toFixed(1)}
                          </div>
                          <Badge variant={f.winner === "tie" ? "secondary" : "default"}>{winnerLabel}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-4 border-t pt-4">
                  <div>
                    <div className="text-sm text-muted-foreground">{t("compare.overallWinner")}</div>
                    <div className="text-lg font-semibold">
                      {comparison.overallWinner === "a"
                        ? `${t("doctorProfile.doctorPrefix", "د.")} ${t(`home.professors.names.${normalizeName(comparison.a.name)}`, { defaultValue: normalizeName(comparison.a.name) })}`
                        : comparison.overallWinner === "b"
                          ? `${t("doctorProfile.doctorPrefix", "د.")} ${t(`home.professors.names.${normalizeName(comparison.b.name)}`, { defaultValue: normalizeName(comparison.b.name) })}`
                          : comparison.overallWinner === "tie"
                            ? t("compare.tie")
                            : t("compare.notAvailable")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">{t("compare.overall")}</div>
                    <div className="text-lg font-semibold tabular-nums">
                      {comparison.overallA.toFixed(1)} vs {comparison.overallB.toFixed(1)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-indigo-200/70 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-500/10 to-purple-600/8 shadow-sm h-fit">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/80 dark:bg-indigo-900/50 flex items-center justify-center shadow-sm">
                    <Target className="h-5 w-5 text-indigo-700 dark:text-indigo-200" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("compare.recommendation.label", { defaultValue: "Recommendation" })}</p>
                    <h3 className="text-lg font-semibold text-foreground">{t("compare.recommendation.title", { defaultValue: "Best match" })}</h3>
                  </div>
                </div>
                {comparison.hasAnyReviews ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-500" />
                        <p className="text-sm font-semibold text-foreground">
                          {comparison.overallWinner === "a"
                            ? `${t("doctorProfile.doctorPrefix", "د.")} ${t(`home.professors.names.${normalizeName(comparison.a.name)}`, { defaultValue: normalizeName(comparison.a.name) })}`
                            : comparison.overallWinner === "b"
                              ? `${t("doctorProfile.doctorPrefix", "د.")} ${t(`home.professors.names.${normalizeName(comparison.b.name)}`, { defaultValue: normalizeName(comparison.b.name) })}`
                              : t("compare.tie")}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {comparison.overallWinner === "tie"
                          ? t("compare.recommendation.tieMsg", { defaultValue: "Both professors have equal overall ratings. Check individual factors." })
                          : t("compare.recommendation.winnerMsg", {
                              defaultValue: "Based on overall rating and student reviews.",
                            })}
                      </p>
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t("compare.recommendation.strengthsLabel", { defaultValue: "Top strengths" })}
                      </p>
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {comparison.factorWinners
                          .filter((f) => f.winner === (comparison.overallWinner === "a" ? "a" : "b"))
                          .slice(0, 3)
                          .map((f) => (
                            <li key={f.key} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                              <span>{f.label}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("compare.recommendation.noData", { defaultValue: "No reviews available to recommend." })}</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

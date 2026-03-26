import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Star, Clock, ChevronRight, Search } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { Link } from "wouter";
import { useState } from "react";

import { useTranslation } from "react-i18next";

interface Review {
  id: number;
  doctorId: number;
  teachingQuality: number;
  availability: number;
  communication: number;
  knowledge: number;
  fairness: number;
  comment: string | null;
  createdAt: string;
}

interface Doctor {
  id: number;
  name: string;
  department: string;
  title: string;
  ratings: {
    overallRating: number;
    totalReviews: number;
  } | null;
}

export default function StudentRatings() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const { data: doctors = [], isLoading } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
    queryFn: async () => {
      const res = await fetch("/api/doctors");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Show doctors the student has potentially rated — we use all rated doctors sorted by rating as a proxy
  const ratedDoctors = doctors
    .filter(d => d.ratings && d.ratings.totalReviews > 0)
    .filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.department.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.ratings?.overallRating ?? 0) - (a.ratings?.overallRating ?? 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-orange-500/5">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-200 dark:border-orange-800">
                <Star className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{t("student.ratings.title")}</h1>
                <p className="text-muted-foreground">{t("student.ratings.subtitle")}</p>
              </div>
            </div>
            <Link href="/doctors">
              <Button className="gap-2">
                <Star className="h-4 w-4" /> {t("home.stats.rateButton", { defaultValue: "Rate a Professor" })}
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("student.ratings.searchPlaceholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : ratedDoctors.length === 0 ? (
          <Card className="text-center py-16 border-dashed">
            <CardContent>
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t("student.ratings.emptyTitle")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {ratedDoctors.map((doc, i) => (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                <Link href={`/doctors/${doc.id}`}>
                  <Card className="bg-card/80 backdrop-blur hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-orange-500">{doc.name.replace(/^Dr\.?\s+/i, "")[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">{doc.title} · {doc.department}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating rating={doc.ratings?.overallRating ?? 0} size="sm" />
                          <span className="text-sm font-semibold">{doc.ratings?.overallRating.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({t("student.ratings.reviewsCount", { count: doc.ratings?.totalReviews ?? 0 })})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                        <span className="text-sm hidden sm:block">{t("home.topRated.viewAll", { defaultValue: "View" })}</span>
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* CTA at bottom */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">{t("home.empty.description", { defaultValue: "Don't see a professor you want to rate?" })}</p>
          <Link href="/doctors">
            <Button variant="outline" className="gap-2">
              <Clock className="h-4 w-4" /> {t("home.topRated.viewAll", { defaultValue: "Browse All Professors" })}
            </Button>
          </Link>
        </motion.div>
      </main>
    </div>
  );
}

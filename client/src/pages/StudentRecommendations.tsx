import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Zap, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { StarRating } from "@/components/StarRating";

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

export default function StudentRecommendations() {
  const { data: doctors = [], isLoading } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
    queryFn: async () => {
      const res = await fetch("/api/doctors");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Take top 5 highest rated doctors
  const recommended = [...doctors]
    .filter(d => d.ratings && d.ratings.totalReviews >= 2)
    .sort((a, b) => (b.ratings?.overallRating ?? 0) - (a.ratings?.overallRating ?? 0))
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-teal-500/5">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-200 dark:border-teal-800">
              <Zap className="h-6 w-6 text-teal-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Recommendations</h1>
              <p className="text-muted-foreground">Top-tier professors matched for you based on community acclaim</p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : recommended.length === 0 ? (
          <Card className="text-center py-16 border-dashed">
            <CardContent>
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">We need more reviews before we can recommend professors.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {recommended.map((doc, i) => (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                <Link href={`/doctors/${doc.id}`}>
                  <Card className="bg-card/80 backdrop-blur hover:shadow-md hover:border-teal-500/30 transition-all cursor-pointer h-full group">
                    <CardContent className="p-5 flex flex-col h-full relative overflow-hidden">
                      {i < 2 && (
                        <div className="absolute -right-6 -top-6 h-24 w-24 bg-teal-500/10 rounded-full blur-xl group-hover:bg-teal-500/20 transition-colors" />
                      )}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="h-12 w-12 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0 border border-teal-500/20">
                          <span className="text-xl font-bold text-teal-600">{i + 1}</span>
                        </div>
                        <div>
                          <p className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">{doc.title}</p>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">Department</p>
                          <p className="text-sm font-semibold">{doc.department}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end mb-1">
                            <span className="font-bold text-lg leading-none">{doc.ratings?.overallRating.toFixed(1)}</span>
                            <StarRating rating={doc.ratings?.overallRating ?? 0} size="sm" />
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">{doc.ratings?.totalReviews} verified reviews</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

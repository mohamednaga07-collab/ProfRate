import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { DoctorCard } from "@/components/DoctorCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Star, Users, BarChart3, TrendingUp, ArrowRight } from "lucide-react";
import type { DoctorWithRatings } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();

  const { data: doctors, isLoading: doctorsLoading } = useQuery<DoctorWithRatings[]>({
    queryKey: ["/api/doctors"],
  });

  const { data: stats } = useQuery<{ totalDoctors: number; totalReviews: number }>({
    queryKey: ["/api/stats"],
  });

  const topDoctors = doctors
    ?.filter((d) => (d.ratings?.totalReviews ?? 0) > 0)
    ?.sort((a, b) => (b.ratings?.overallRating ?? 0) - (a.ratings?.overallRating ?? 0))
    ?.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                Welcome back, {user?.firstName || "Student"}!
              </h1>
              <p className="text-muted-foreground">
                {user?.role === "student"
                  ? "Rate your professors and help fellow students make better decisions."
                  : user?.role === "teacher"
                  ? "View how students rate their professors."
                  : "Manage professors and oversee reviews."}
              </p>
            </div>
            {user?.role === "student" && (
              <Button asChild data-testid="button-rate-professor">
                <Link href="/doctors">
                  <Star className="h-4 w-4 mr-2" />
                  Rate a Professor
                </Link>
              </Button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-chart-1/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-chart-1" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Professors</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-doctors">
                      {stats?.totalDoctors ?? doctors?.length ?? 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                    <Star className="h-6 w-6 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Reviews</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-reviews">
                      {stats?.totalReviews ?? 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold">
                      {doctors && doctors.length > 0
                        ? (
                            doctors.reduce((acc, d) => acc + (d.ratings?.overallRating ?? 0), 0) /
                            Math.max(1, doctors.filter((d) => (d.ratings?.totalReviews ?? 0) > 0).length)
                          ).toFixed(1)
                        : "0.0"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Departments</p>
                    <p className="text-2xl font-bold">
                      {doctors ? new Set(doctors.map((d) => d.department)).size : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Top Rated Professors</h2>
              <p className="text-muted-foreground">Highest rated by students</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/doctors">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {doctorsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full mt-6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : topDoctors && topDoctors.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topDoctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Professors Yet</h3>
                <p className="text-muted-foreground mb-4">
                  There are no professors in the system yet.
                </p>
                {user?.role === "admin" && (
                  <Button asChild>
                    <Link href="/doctors">Add Professor</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}

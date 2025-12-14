import { useEffect, useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { StarRating } from "@/components/StarRating";
import { RatingBar } from "@/components/RatingBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, BarChart3, Plus, X, Trophy, Minus } from "lucide-react";
import type { DoctorWithRatings } from "@shared/schema";

const RATING_FACTORS = [
  { key: "avgTeachingQuality", label: "Teaching Quality" },
  { key: "avgAvailability", label: "Availability" },
  { key: "avgCommunication", label: "Communication" },
  { key: "avgKnowledge", label: "Subject Knowledge" },
  { key: "avgFairness", label: "Fairness" },
] as const;

export default function Compare() {
  const [location] = useLocation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: doctors, isLoading } = useQuery<DoctorWithRatings[]>({
    queryKey: ["/api/doctors"],
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get("ids");
    if (idsParam) {
      const ids = idsParam.split(",").map(Number).filter(Boolean);
      setSelectedIds(ids.slice(0, 3));
    }
  }, [location]);

  const selectedDoctors = useMemo(() => {
    if (!doctors) return [];
    return selectedIds
      .map((id) => doctors.find((d) => d.id === id))
      .filter((d): d is DoctorWithRatings => d !== undefined);
  }, [doctors, selectedIds]);

  const availableDoctors = useMemo(() => {
    if (!doctors) return [];
    return doctors.filter((d) => !selectedIds.includes(d.id));
  }, [doctors, selectedIds]);

  const addDoctor = (id: number) => {
    if (selectedIds.length < 3) {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const removeDoctor = (id: number) => {
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  const getWinner = (factor: keyof DoctorWithRatings["ratings"]) => {
    if (selectedDoctors.length < 2) return null;

    let maxValue = -1;
    let winnerId: number | null = null;

    selectedDoctors.forEach((doctor) => {
      const value = (doctor.ratings?.[factor] as number) ?? 0;
      if (value > maxValue) {
        maxValue = value;
        winnerId = doctor.id;
      }
    });

    return winnerId;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96 w-full" />
            ))}
          </div>
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
            Back to Professors
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              Compare Professors
            </h1>
            <p className="text-muted-foreground">
              Select up to 3 professors to compare their ratings side by side
            </p>
          </div>
        </div>

        {selectedDoctors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Professors Selected</h2>
              <p className="text-muted-foreground mb-6">
                Select professors from the list below to start comparing
              </p>

              {doctors && doctors.length > 0 && (
                <div className="max-w-md mx-auto">
                  <Select onValueChange={(value) => addDoctor(Number(value))}>
                    <SelectTrigger data-testid="select-add-doctor">
                      <SelectValue placeholder="Select a professor to compare" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={String(doctor.id)}>
                          Dr. {doctor.name} - {doctor.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {selectedDoctors.map((doctor) => {
                const initials = doctor.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <Card key={doctor.id} className="relative" data-testid={`compare-card-${doctor.id}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => removeDoctor(doctor.id)}
                      data-testid={`button-remove-${doctor.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center mb-6">
                        <Avatar className="h-20 w-20 mb-4">
                          <AvatarImage
                            src={doctor.profileImageUrl ?? undefined}
                            alt={doctor.name}
                          />
                          <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-semibold text-lg">Dr. {doctor.name}</h3>
                        <p className="text-sm text-muted-foreground">{doctor.department}</p>
                        {doctor.title && (
                          <Badge variant="secondary" className="mt-2">
                            {doctor.title}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-col items-center mb-6">
                        <StarRating rating={doctor.ratings?.overallRating ?? 0} size="lg" />
                        <span className="text-3xl font-bold mt-2">
                          {(doctor.ratings?.overallRating ?? 0).toFixed(1)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {doctor.ratings?.totalReviews ?? 0} reviews
                        </span>
                      </div>

                      <div className="space-y-4">
                        {RATING_FACTORS.map(({ key, label }) => {
                          const value = (doctor.ratings?.[key] as number) ?? 0;
                          const isWinner = getWinner(key) === doctor.id;

                          return (
                            <div key={key} className="relative">
                              {isWinner && selectedDoctors.length >= 2 && (
                                <div className="absolute -left-2 top-0">
                                  <Trophy className="h-4 w-4 text-amber-500" />
                                </div>
                              )}
                              <RatingBar label={label} value={value} />
                            </div>
                          );
                        })}
                      </div>

                      <Button variant="outline" className="w-full mt-6" asChild>
                        <Link href={`/doctors/${doctor.id}`}>View Profile</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}

              {selectedDoctors.length < 3 && availableDoctors.length > 0 && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] py-8">
                    <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4 text-center">
                      Add another professor to compare
                    </p>
                    <Select onValueChange={(value) => addDoctor(Number(value))}>
                      <SelectTrigger className="w-full max-w-xs" data-testid="select-add-more">
                        <SelectValue placeholder="Select professor" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDoctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={String(doctor.id)}>
                            Dr. {doctor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              )}
            </div>

            {selectedDoctors.length >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Rating Comparison Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Factor</th>
                          {selectedDoctors.map((doctor) => (
                            <th key={doctor.id} className="text-center py-3 px-4 font-medium">
                              Dr. {doctor.name.split(" ")[0]}
                            </th>
                          ))}
                          <th className="text-center py-3 px-4 font-medium">Winner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {RATING_FACTORS.map(({ key, label }) => {
                          const winnerId = getWinner(key);
                          const winner = selectedDoctors.find((d) => d.id === winnerId);

                          return (
                            <tr key={key} className="border-b last:border-0">
                              <td className="py-3 px-4 text-muted-foreground">{label}</td>
                              {selectedDoctors.map((doctor) => {
                                const value = (doctor.ratings?.[key] as number) ?? 0;
                                const isWinner = winnerId === doctor.id;

                                return (
                                  <td
                                    key={doctor.id}
                                    className={`text-center py-3 px-4 font-medium ${
                                      isWinner ? "text-chart-2" : ""
                                    }`}
                                  >
                                    {value.toFixed(1)}
                                    {isWinner && " *"}
                                  </td>
                                );
                              })}
                              <td className="text-center py-3 px-4">
                                {winner ? (
                                  <Badge variant="secondary" className="gap-1">
                                    <Trophy className="h-3 w-3 text-amber-500" />
                                    Dr. {winner.name.split(" ")[0]}
                                  </Badge>
                                ) : (
                                  <Minus className="h-4 w-4 mx-auto text-muted-foreground" />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-muted/30">
                          <td className="py-3 px-4 font-semibold">Overall Rating</td>
                          {selectedDoctors.map((doctor) => {
                            const value = doctor.ratings?.overallRating ?? 0;
                            const maxOverall = Math.max(
                              ...selectedDoctors.map((d) => d.ratings?.overallRating ?? 0)
                            );
                            const isWinner = value === maxOverall;

                            return (
                              <td
                                key={doctor.id}
                                className={`text-center py-3 px-4 font-bold ${
                                  isWinner ? "text-chart-2" : ""
                                }`}
                              >
                                {value.toFixed(1)}
                              </td>
                            );
                          })}
                          <td className="text-center py-3 px-4">
                            {(() => {
                              const maxOverall = Math.max(
                                ...selectedDoctors.map((d) => d.ratings?.overallRating ?? 0)
                              );
                              const overallWinner = selectedDoctors.find(
                                (d) => (d.ratings?.overallRating ?? 0) === maxOverall
                              );
                              return overallWinner ? (
                                <Badge className="gap-1">
                                  <Trophy className="h-3 w-3" />
                                  Dr. {overallWinner.name.split(" ")[0]}
                                </Badge>
                              ) : null;
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

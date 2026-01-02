import { useEffect, useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import type { DoctorWithRatings } from "@shared/schema";

export default function Compare() {
  const [location] = useLocation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: doctors, isLoading } = useQuery<DoctorWithRatings[]>({ queryKey: ["/api/doctors"] });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get("ids");
    if (idsParam) setSelectedIds(idsParam.split(",").map(Number).filter(Boolean).slice(0, 3));
  }, [location]);

  const selectedDoctors = useMemo(() => {
    if (!doctors) return [] as DoctorWithRatings[];
    return selectedIds.map((id) => doctors.find((d) => d.id === id)).filter((d): d is DoctorWithRatings => !!d);
  }, [doctors, selectedIds]);

  const availableDoctors = useMemo(() => (doctors ?? []).filter((d) => !selectedIds.includes(d.id)), [doctors, selectedIds]);

  const addDoctor = (id: number) => setSelectedIds((s) => (s.includes(id) ? s : s.length < 3 ? [...s, id] : s));
  const removeDoctor = (id: number) => setSelectedIds((s) => s.filter((x) => x !== id));

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">Loading...</main>
    </div>
  );

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

        <div className="grid md:grid-cols-3 gap-6">
          {selectedDoctors.map((d) => (
            <Card key={d.id}>
              <CardContent>
                <div className="font-semibold">Dr. {d.name.replace(/^Dr\.?\s+/i, "")}</div>
                <div className="text-sm text-muted-foreground">{d.department}</div>
                <div className="mt-2">Overall: {(d.ratings?.overallRating ?? 0).toFixed(1)}</div>
                <div className="mt-2">
                  <button onClick={() => removeDoctor(d.id)} className="text-xs text-red-600">Remove</button>
                </div>
              </CardContent>
            </Card>
          ))}

          {selectedDoctors.length < 3 && (
            <Card className="border-dashed">
              <CardContent>
                <div className="mb-2">Add professor</div>
                <Select onValueChange={(v) => addDoctor(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select professor" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDoctors.map((doc) => (
                      <SelectItem key={doc.id} value={String(doc.id)}>Dr. {doc.name.replace(/^Dr\.?\s+/i, "")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

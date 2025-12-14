import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Header } from "@/components/Header";
import { DoctorCard } from "@/components/DoctorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, Plus, BarChart3, Users, X } from "lucide-react";
import type { DoctorWithRatings, InsertDoctor } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const addDoctorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  department: z.string().min(2, "Department is required"),
  title: z.string().optional(),
  bio: z.string().optional(),
});

export default function DoctorListing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"rating" | "reviews" | "name">("rating");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [comparingDoctors, setComparingDoctors] = useState<number[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: doctors, isLoading } = useQuery<DoctorWithRatings[]>({
    queryKey: ["/api/doctors"],
  });

  const form = useForm<z.infer<typeof addDoctorSchema>>({
    resolver: zodResolver(addDoctorSchema),
    defaultValues: {
      name: "",
      department: "",
      title: "",
      bio: "",
    },
  });

  const addDoctorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addDoctorSchema>) => {
      return apiRequest("POST", "/api/doctors", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      toast({ title: "Professor added successfully!" });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to add professor", variant: "destructive" });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const search = params.get("search");
    if (search) {
      setSearchQuery(search);
    }
  }, [location]);

  const departments = useMemo(() => {
    if (!doctors) return [];
    return Array.from(new Set(doctors.map((d) => d.department))).sort();
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];

    let filtered = doctors;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.department.toLowerCase().includes(query) ||
          d.title?.toLowerCase().includes(query)
      );
    }

    if (selectedDepartment && selectedDepartment !== "all") {
      filtered = filtered.filter((d) => d.department === selectedDepartment);
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return (b.ratings?.overallRating ?? 0) - (a.ratings?.overallRating ?? 0);
        case "reviews":
          return (b.ratings?.totalReviews ?? 0) - (a.ratings?.totalReviews ?? 0);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [doctors, searchQuery, selectedDepartment, sortBy]);

  const handleCompareToggle = (doctorId: number) => {
    setComparingDoctors((prev) =>
      prev.includes(doctorId)
        ? prev.filter((id) => id !== doctorId)
        : prev.length < 3
        ? [...prev, doctorId]
        : prev
    );
  };

  const clearComparison = () => {
    setComparingDoctors([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Professors</h1>
            <p className="text-muted-foreground">
              Browse and rate professors at your college
            </p>
          </div>

          {user?.role === "admin" && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-doctor">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Professor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Professor</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) => addDoctorMutation.mutate(data))}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} data-testid="input-doctor-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input placeholder="Computer Science" {...field} data-testid="input-doctor-department" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Associate Professor" {...field} data-testid="input-doctor-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Brief biography..."
                              {...field}
                              data-testid="input-doctor-bio"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={addDoctorMutation.isPending}
                      data-testid="button-submit-doctor"
                    >
                      {addDoctorMutation.isPending ? "Adding..." : "Add Professor"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search professors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-doctors"
            />
          </div>

          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-full md:w-48" data-testid="select-department">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-full md:w-40" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rating</SelectItem>
              <SelectItem value="reviews">Most Reviews</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {comparingDoctors.length > 0 && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="font-medium">Comparing:</span>
                  {comparingDoctors.map((id) => {
                    const doctor = doctors?.find((d) => d.id === id);
                    return (
                      <Badge key={id} variant="secondary" className="gap-1">
                        Dr. {doctor?.name}
                        <button
                          onClick={() => handleCompareToggle(id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={clearComparison}>
                    Clear
                  </Button>
                  <Button asChild size="sm" disabled={comparingDoctors.length < 2}>
                    <Link href={`/compare?ids=${comparingDoctors.join(",")}`}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Compare ({comparingDoctors.length})
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
        ) : filteredDoctors.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onCompareToggle={handleCompareToggle}
                isComparing={comparingDoctors.includes(doctor.id)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Professors Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedDepartment !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "There are no professors in the system yet."}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

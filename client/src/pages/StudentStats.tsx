import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Trash2, GraduationCap, Calendar, Hash, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Enrollment {
  id: number;
  courseName: string;
  courseCode: string | null;
  term: string | null;
  grade: string | null;
  createdAt: string;
}

const gradeColors: Record<string, string> = {
  A: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800",
  B: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
  C: "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800",
  D: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800",
  F: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
};

function getGradeColor(grade: string | null) {
  if (!grade) return "bg-muted text-muted-foreground border-border";
  const g = grade.toUpperCase()[0];
  return gradeColors[g] || "bg-muted text-muted-foreground border-border";
}

export default function StudentStats() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ courseName: "", courseCode: "", term: "", grade: "" });

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["/api/student/enrollments"],
    queryFn: async () => {
      const res = await fetch("/api/student/enrollments");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Enrollment[]>;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const csrfRes = await fetch("/api/auth/csrf-token");
      const { token } = await csrfRes.json();
      const res = await fetch("/api/student/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/enrollments"] });
      setForm({ courseName: "", courseCode: "", term: "", grade: "" });
      setShowForm(false);
      toast({ title: t("student.stats.form.saveSuccess", { defaultValue: "Course added!" }), description: t("student.stats.form.saveSuccessDesc", { defaultValue: "Your academic record has been updated." }) });
    },
    onError: () => toast({ title: t("common.error"), description: t("student.stats.form.saveError"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const csrfRes = await fetch("/api/auth/csrf-token");
      const { token } = await csrfRes.json();
      const res = await fetch(`/api/student/enrollments/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": token },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/enrollments"] });
      toast({ title: t("common.removed"), description: t("student.stats.form.removeSuccess") });
    },
  });

  const groupedByTerm = enrollments.reduce((acc, e) => {
    const key = e.term || "No Term Specified";
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, Enrollment[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-green-500/5">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-200 dark:border-green-800">
                <GraduationCap className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{t("student.stats.title")}</h1>
                <p className="text-muted-foreground">{t("student.stats.subtitle")}</p>
              </div>
            </div>
            <Button onClick={() => setShowForm(s => !s)} className="gap-2">
              <Plus className="h-4 w-4" /> {t("student.stats.addCourse")}
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: t("student.stats.totalCourses"), value: enrollments.length, icon: <BookOpen className="h-5 w-5 text-green-500" />, color: "text-green-600 dark:text-green-400" },
            { label: t("student.stats.termsTracked"), value: Object.keys(groupedByTerm).filter(k => k !== "No Term Specified").length, icon: <Calendar className="h-5 w-5 text-blue-500" />, color: "text-blue-600 dark:text-blue-400" },
            { label: t("student.stats.gradedCourses"), value: enrollments.filter(e => e.grade).length, icon: <Award className="h-5 w-5 text-purple-500" />, color: "text-purple-600 dark:text-purple-400" },
          ].map((s, i) => (
            <Card key={i} className="bg-card/80 backdrop-blur">
              <CardContent className="pt-5 pb-4">
                <div className="mb-1">{s.icon}</div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Add Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <Card className="border-primary/30 bg-card/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" /> {t("student.stats.form.title")}
                  </CardTitle>
                  <CardDescription>{t("student.stats.form.desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t("student.stats.form.name")} *</label>
                      <Input
                        value={form.courseName}
                        onChange={e => setForm(f => ({ ...f, courseName: e.target.value }))}
                        placeholder="e.g. Introduction to Algorithms"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t("student.stats.form.code")}</label>
                      <Input
                        value={form.courseCode}
                        onChange={e => setForm(f => ({ ...f, courseCode: e.target.value }))}
                        placeholder="e.g. CS101"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t("student.stats.form.term")}</label>
                      <Input
                        value={form.term}
                        onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                        placeholder="e.g. Fall 2024"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t("student.stats.form.grade")} ({t("common.optional", { defaultValue: "optional" })})</label>
                      <Input
                        value={form.grade}
                        onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                        placeholder="e.g. A, B+, 90"
                        maxLength={5}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => addMutation.mutate(form)}
                      disabled={!form.courseName.trim() || addMutation.isPending}
                    >
                      {addMutation.isPending ? t("student.stats.form.saving") : t("student.stats.form.save")}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowForm(false)}>{t("student.stats.form.cancel")}</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Course List */}
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : enrollments.length === 0 ? (
          <Card className="text-center py-16 border-dashed">
            <CardContent>
              <GraduationCap className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground mb-2">{t("student.stats.emptyTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("student.stats.emptyDesc")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByTerm).map(([term, courses], gi) => (
              <motion.div key={term} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + gi * 0.08 }}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{term}</h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{courses.length} course{courses.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grid gap-3">
                  <AnimatePresence>
                    {courses.map((c) => (
                      <motion.div key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
                        <Card className="bg-card/80 backdrop-blur hover:shadow-sm transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="h-9 w-9 rounded-lg bg-green-500/10 border border-green-200 dark:border-green-800 flex items-center justify-center flex-shrink-0">
                                  <BookOpen className="h-4 w-4 text-green-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">{c.courseName}</p>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {c.courseCode && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Hash className="h-3 w-3" /> {c.courseCode}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {c.grade && (
                                  <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${getGradeColor(c.grade)}`}>
                                    {c.grade}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteMutation.mutate(c.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

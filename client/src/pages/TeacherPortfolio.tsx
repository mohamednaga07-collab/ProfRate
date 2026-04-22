import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { BookOpen, ExternalLink, Save, Plus, Trash2, FileText, Sparkles, Eye, Edit2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Material { title: string; url: string }
interface Portfolio {
  title: string | null;
  philosophy: string | null;
  syllabusUrl: string | null;
  materials: Material[];
}

export default function TeacherPortfolio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Portfolio>({ title: "", philosophy: "", syllabusUrl: "", materials: [] });
  const [newMat, setNewMat] = useState({ title: "", url: "" });

  const { data: portfolio, isLoading, isError } = useQuery<Portfolio | null>({
    queryKey: ["/api/teacher/portfolio"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/portfolio");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    retry: 1, // Only retry once instead of 3 exponential backoffs so it fails faster if down
  });

  useEffect(() => {
    if (portfolio) {
      setForm({ ...portfolio, materials: (portfolio.materials as Material[]) || [] });
    }
  }, [portfolio]);

  const saveMutation = useMutation({
    mutationFn: async (data: Portfolio) => {
      const csrfRes = await fetch("/api/auth/csrf-token");
      const { token } = await csrfRes.json();
      const res = await fetch("/api/teacher/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/portfolio"] });
      setEditing(false);
      toast({ title: t("teacherPortfolio.toast.savedTitle"), description: t("teacherPortfolio.toast.savedDesc") });
    },
    onError: () => toast({ title: t("teacherPortfolio.toast.errorTitle"), description: t("teacherPortfolio.toast.errorDesc"), variant: "destructive" }),
  });

  const addMaterial = () => {
    if (!newMat.title.trim()) return;
    setForm(f => ({ ...f, materials: [...f.materials, { ...newMat }] }));
    setNewMat({ title: "", url: "" });
  };

  const removeMaterial = (idx: number) => {
    setForm(f => ({ ...f, materials: f.materials.filter((_, i) => i !== idx) }));
  };

  const displayData = editing ? form : (portfolio ?? form);

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background pointer-events-none" />
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white mb-1">{t("teacherPortfolio.title")}</h1>
                <p className="text-blue-200/70 text-lg">{t("teacherPortfolio.subtitle")}</p>
              </div>
            </div>
            <Button
              onClick={() => editing ? saveMutation.mutate(form) : setEditing(true)}
              disabled={saveMutation.isPending || isError}
              className={`gap-2 ${editing ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'} backdrop-blur-md`}
              variant={editing ? "default" : "outline"}
            >
              {editing ? <><Save className="h-4 w-4" />{t("teacherPortfolio.saveChanges")}</> : <><Edit2 className="h-4 w-4" />{t("teacherPortfolio.editPortfolio")}</>}
            </Button>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <span className="text-red-500 text-3xl font-bold">!</span>
            </div>
            <h2 className="text-xl font-bold mb-2 text-white">{t("system.error.title", { defaultValue: "Connection Error" })}</h2>
            <p className="text-white/50 max-w-md">
              {t("system.error.description", { defaultValue: "The system is currently unavailable. This is usually due to a degraded connection. Please try again later." })}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Portfolio Title */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="backdrop-blur-2xl bg-[#0a0f1c]/80 border-white/5 shadow-2xl relative overflow-hidden transition-all hover:border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <Sparkles className="h-5 w-5 text-blue-400" /> {t("teacherPortfolio.portfolioTitle.label")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <Input
                      value={form.title ?? ""}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder={t("teacherPortfolio.portfolioTitle.placeholder")}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500"
                    />
                  ) : (
                    <p className="text-xl font-semibold text-white">
                      {displayData?.title || <span className="text-white/40 italic">{t("teacherPortfolio.portfolioTitle.empty")}</span>}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Teaching Philosophy */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="backdrop-blur-2xl bg-[#0a0f1c]/80 border-white/5 shadow-2xl relative overflow-hidden transition-all hover:border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <FileText className="h-5 w-5 text-purple-400" /> {t("teacherPortfolio.philosophy.label")}
                  </CardTitle>
                  <CardDescription className="text-white/40">{t("teacherPortfolio.philosophy.desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <Textarea
                      value={form.philosophy ?? ""}
                      onChange={e => setForm(f => ({ ...f, philosophy: e.target.value }))}
                      placeholder={t("teacherPortfolio.philosophy.placeholder")}
                      className="min-h-[140px] resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500"
                    />
                  ) : (
                    <p className="text-base leading-relaxed whitespace-pre-wrap text-white/80">
                      {displayData?.philosophy || <span className="text-white/40 italic">{t("teacherPortfolio.philosophy.empty")}</span>}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Syllabus Link */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="backdrop-blur-2xl bg-[#0a0f1c]/80 border-white/5 shadow-2xl relative overflow-hidden transition-all hover:border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <ExternalLink className="h-5 w-5 text-green-400" /> {t("teacherPortfolio.syllabus.label")}
                  </CardTitle>
                  <CardDescription className="text-white/40">{t("teacherPortfolio.syllabus.desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <Input
                      value={form.syllabusUrl ?? ""}
                      onChange={e => setForm(f => ({ ...f, syllabusUrl: e.target.value }))}
                      placeholder="https://..."
                      type="url"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500"
                    />
                  ) : displayData?.syllabusUrl ? (
                    <a
                      href={displayData.syllabusUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-2 font-medium transition-colors"
                    >
                      <Eye className="h-4 w-4" /> {t("teacherPortfolio.syllabus.view")}
                    </a>
                  ) : (
                    <p className="text-white/40 italic">{t("teacherPortfolio.syllabus.empty")}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Course Materials */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="backdrop-blur-2xl bg-[#0a0f1c]/80 border-white/5 shadow-2xl relative overflow-hidden transition-all hover:border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <BookOpen className="h-5 w-5 text-orange-400" /> {t("teacherPortfolio.materials.label")}
                  </CardTitle>
                  <CardDescription className="text-white/40">{t("teacherPortfolio.materials.desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {((displayData?.materials ?? []) as Material[]).map((m, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{m.title}</p>
                        {m.url && (
                          <a href={m.url} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-blue-400 hover:text-blue-300 hover:underline truncate block mt-1 transition-colors">
                            {m.url}
                          </a>
                        )}
                      </div>
                      {editing && (
                        <Button variant="ghost" size="icon" onClick={() => removeMaterial(i)} className="text-white/50 hover:text-red-400 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {((displayData?.materials ?? []) as Material[]).length === 0 && !editing && (
                    <p className="text-white/40 italic">{t("teacherPortfolio.materials.empty")}</p>
                  )}
                  {editing && (
                    <div className="flex gap-3 flex-wrap pt-4 mt-4 border-t border-white/10">
                      <Input
                        value={newMat.title}
                        onChange={e => setNewMat(n => ({ ...n, title: e.target.value }))}
                        placeholder={t("teacherPortfolio.materials.titlePlaceholder")}
                        className="flex-1 min-w-[160px] bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500"
                      />
                      <Input
                        value={newMat.url}
                        onChange={e => setNewMat(n => ({ ...n, url: e.target.value }))}
                        placeholder={t("teacherPortfolio.materials.urlPlaceholder")}
                        className="flex-1 min-w-[160px] bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500"
                      />
                      <Button type="button" variant="outline" onClick={addMaterial} className="gap-1 bg-white/5 border-white/10 text-white hover:bg-white/10">
                        <Plus className="h-4 w-4" /> {t("teacherPortfolio.materials.add")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}

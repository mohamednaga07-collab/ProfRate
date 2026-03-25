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
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Portfolio>({ title: "", philosophy: "", syllabusUrl: "", materials: [] });
  const [newMat, setNewMat] = useState({ title: "", url: "" });

  const { data: portfolio, isLoading } = useQuery<Portfolio | null>({
    queryKey: ["/api/teacher/portfolio"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/portfolio");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
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
      toast({ title: "Portfolio saved!", description: "Your portfolio has been updated successfully." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save portfolio.", variant: "destructive" }),
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-500/5">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-200 dark:border-blue-800">
                <BookOpen className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Teaching Portfolio</h1>
                <p className="text-muted-foreground">Showcase your teaching journey and resources</p>
              </div>
            </div>
            <Button
              onClick={() => editing ? saveMutation.mutate(form) : setEditing(true)}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              {editing ? <><Save className="h-4 w-4" /> Save Changes</> : <><Edit2 className="h-4 w-4" /> Edit Portfolio</>}
            </Button>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Portfolio Title */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-yellow-500" /> Portfolio Title
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <Input
                      value={form.title ?? ""}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Dr. Smith's Teaching Portfolio"
                    />
                  ) : (
                    <p className="text-xl font-semibold text-primary">
                      {displayData?.title || <span className="text-muted-foreground italic">No title set — click Edit to add one</span>}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Teaching Philosophy */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-purple-500" /> Teaching Philosophy
                  </CardTitle>
                  <CardDescription>Describe your approach to education and student interaction</CardDescription>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <Textarea
                      value={form.philosophy ?? ""}
                      onChange={e => setForm(f => ({ ...f, philosophy: e.target.value }))}
                      placeholder="Share your teaching philosophy..."
                      className="min-h-[140px] resize-none"
                    />
                  ) : (
                    <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground/90">
                      {displayData?.philosophy || <span className="text-muted-foreground italic">No philosophy written yet.</span>}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Syllabus Link */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ExternalLink className="h-5 w-5 text-green-500" /> Syllabus URL
                  </CardTitle>
                  <CardDescription>Link to your public syllabus or course outline</CardDescription>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <Input
                      value={form.syllabusUrl ?? ""}
                      onChange={e => setForm(f => ({ ...f, syllabusUrl: e.target.value }))}
                      placeholder="https://..."
                      type="url"
                    />
                  ) : displayData?.syllabusUrl ? (
                    <a
                      href={displayData.syllabusUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2 font-medium"
                    >
                      <Eye className="h-4 w-4" /> View Syllabus
                    </a>
                  ) : (
                    <p className="text-muted-foreground italic">No syllabus link added yet.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Course Materials */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-orange-500" /> Course Materials
                  </CardTitle>
                  <CardDescription>Links to readings, slides, or any public resources</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {((displayData?.materials ?? []) as Material[]).map((m, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{m.title}</p>
                        {m.url && (
                          <a href={m.url} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline truncate block">
                            {m.url}
                          </a>
                        )}
                      </div>
                      {editing && (
                        <Button variant="ghost" size="icon" onClick={() => removeMaterial(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {((displayData?.materials ?? []) as Material[]).length === 0 && !editing && (
                    <p className="text-muted-foreground italic">No materials added yet.</p>
                  )}
                  {editing && (
                    <div className="flex gap-2 flex-wrap pt-2">
                      <Input
                        value={newMat.title}
                        onChange={e => setNewMat(n => ({ ...n, title: e.target.value }))}
                        placeholder="Material title"
                        className="flex-1 min-w-[160px]"
                      />
                      <Input
                        value={newMat.url}
                        onChange={e => setNewMat(n => ({ ...n, url: e.target.value }))}
                        placeholder="https://... (optional)"
                        className="flex-1 min-w-[160px]"
                      />
                      <Button type="button" variant="outline" onClick={addMaterial} className="gap-1">
                        <Plus className="h-4 w-4" /> Add
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

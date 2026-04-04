import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Edit, Trash2, Calendar, Clock, MapPin, Users, BookOpen } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type TeacherClass = {
  id: number;
  userId: string;
  courseName: string;
  courseCode: string | null;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room: string | null;
  studentCount: number | null;
  createdAt: string;
};

export default function TeacherCourses() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form State
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [room, setRoom] = useState("");
  const [studentCount, setStudentCount] = useState("");

  if (!user || user.role !== "teacher") {
    navigate("/");
    return null;
  }

  const { data: classes = [], isLoading } = useQuery<TeacherClass[]>({
    queryKey: ["/api/teacher/classes"],
  });

  const createClassMutation = useMutation({
    mutationFn: async (newClass: Partial<TeacherClass>) => {
      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClass),
      });
      if (!res.ok) throw new Error("Failed to create class");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes"] });
      toast({ title: t("common.success"), description: "Class added successfully." });
      resetForm();
    },
    onError: () => toast({ title: "Error", description: "Could not add class.", variant: "destructive" })
  });

  const updateClassMutation = useMutation({
    mutationFn: async (updatedClass: Partial<TeacherClass> & { id: number }) => {
      const { id, ...data } = updatedClass;
      const res = await fetch(`/api/teacher/classes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update class");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes"] });
      toast({ title: t("common.success"), description: "Class updated successfully." });
      resetForm();
    },
    onError: () => toast({ title: "Error", description: "Could not update class.", variant: "destructive" })
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/teacher/classes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete class");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes"] });
      toast({ title: t("common.success"), description: "Class deleted successfully." });
    },
    onError: () => toast({ title: "Error", description: "Could not delete class.", variant: "destructive" })
  });

  const resetForm = () => {
    setCourseName(""); setCourseCode(""); setDayOfWeek("1");
    setStartTime("09:00"); setEndTime("10:30"); setRoom(""); setStudentCount("");
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const openEdit = (cls: TeacherClass) => {
    setEditingId(cls.id);
    setCourseName(cls.courseName);
    setCourseCode(cls.courseCode || "");
    setDayOfWeek(cls.dayOfWeek.toString());
    setStartTime(cls.startTime);
    setEndTime(cls.endTime);
    setRoom(cls.room || "");
    setStudentCount(cls.studentCount?.toString() || "");
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    const data = {
      courseName,
      courseCode: courseCode || null,
      dayOfWeek: parseInt(dayOfWeek),
      startTime,
      endTime,
      room: room || null,
      studentCount: studentCount ? parseInt(studentCount) : null,
    };
    if (editingId) {
      updateClassMutation.mutate({ id: editingId, ...data });
    } else {
      createClassMutation.mutate(data);
    }
  };

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calendar className="h-8 w-8 text-primary" />
              Campus Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage your courses, sections, and timetables</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Class
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" dir={isRTL ? "rtl" : "ltr"}>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Class" : "Add New Class"}</DialogTitle>
                <DialogDescription>
                  Enter the course scheduling details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Course Name *</Label>
                  <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. Data Structures" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Course Code</Label>
                    <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="CS201" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Room / Hall</Label>
                    <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Hall A" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2 col-span-3">
                    <Label htmlFor="day-of-week-select">Day of Week</Label>
                    <select 
                      id="day-of-week-select"
                      aria-label="Day of Week"
                      value={dayOfWeek} 
                      onChange={(e) => setDayOfWeek(e.target.value)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {days.map((d, i) => (
                        <option key={i} value={i}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>End Time</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Students</Label>
                    <Input type="number" value={studentCount} onChange={(e) => setStudentCount(e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSave} disabled={!courseName || !startTime || !endTime || createClassMutation.isPending || updateClassMutation.isPending}>
                  {(createClassMutation.isPending || updateClassMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5 text-primary" />
              My Timetable
            </CardTitle>
            <CardDescription>Your weekly scheduled classes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : classes.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium">No classes scheduled</h3>
                <p className="text-muted-foreground mt-1 mb-4">You haven't added any courses to your timetable yet.</p>
                <Button variant="outline" onClick={() => setIsDialogOpen(true)}>Add your first class</Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Day & Time</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Grouping by day or just simple sorting by day/time */}
                    {classes.sort((a, b) => a.dayOfWeek === b.dayOfWeek ? a.startTime.localeCompare(b.startTime) : a.dayOfWeek - b.dayOfWeek).map((cls) => (
                      <TableRow key={cls.id}>
                        <TableCell>
                          <div className="font-medium">{cls.courseName}</div>
                          {cls.courseCode && <div className="text-xs text-muted-foreground">{cls.courseCode}</div>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {days[cls.dayOfWeek]}
                          </div>
                          <div className="text-xs text-muted-foreground ml-5">{cls.startTime} - {cls.endTime}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {cls.room || "TBA"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            {cls.studentCount || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(cls)}>
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              if(confirm("Are you sure you want to delete this class?")) deleteClassMutation.mutate(cls.id);
                            }}
                          >
                            {deleteClassMutation.isPending && deleteClassMutation.variables === cls.id ? 
                              <Loader2 className="h-4 w-4 animate-spin text-red-500" /> : 
                              <Trash2 className="h-4 w-4 text-red-500" />
                            }
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import HealthStatus from "@/components/ui/HealthStatus";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Users,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Shield,
  Trash2,
  Edit,
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Download,
  TrendingUp,
  Activity,
  Clock,
  UserPlus,
  Settings,
  Database,
  Zap,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

interface Doctor {
  id: number;
  name: string;
  department: string;
  title?: string;
  bio?: string;
  profileImageUrl?: string;
  createdAt: string;
}

interface Review {
  id: number;
  doctorId: number;
  doctorName: string;
  teachingQuality: number;
  availability: number;
  communication: number;
  knowledge: number;
  fairness: number;
  comment?: string;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  totalDoctors: number;
  totalReviews: number;
  pendingReports: number;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [newDoctor, setNewDoctor] = useState({ name: "", department: "", title: "", bio: "" });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<string>("student");
  const roleEditorRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [showSettings, setShowSettings] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const tabsSectionRef = useRef<HTMLDivElement>(null);

  // Function to scroll to tabs section
  const scrollToTabs = () => {
    tabsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // When opening editor, sync selected role and scroll it into view
  useEffect(() => {
    if (editingUser) {
      setEditRole(editingUser.role);
      // Scroll the inline editor into view after it renders
      setTimeout(() => roleEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
    }
  }, [editingUser]);

  // Fetch admin stats
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch users
  const { data: users, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch doctors
  const { data: doctors, refetch: refetchDoctors } = useQuery<Doctor[]>({
    queryKey: ["/api/admin/doctors"],
  });

  // Fetch reviews
  const { data: reviews, refetch: refetchReviews } = useQuery<Review[]>({
    queryKey: ["/api/admin/reviews"],
  });

  // Fetch activity logs
  const { data: activityLogs } = useQuery<any[]>({
    queryKey: ["/api/admin/activity"],
  });

  // Export data function
  const handleExportData = () => {
    const dataToExport = {
      users: users || [],
      doctors: doctors || [],
      reviews: reviews || [],
      exportDate: new Date().toISOString(),
      totalUsers: stats?.totalUsers || 0,
      totalDoctors: stats?.totalDoctors || 0,
      totalReviews: stats?.totalReviews || 0,
    };

    if (exportFormat === 'json') {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campus-ratings-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // CSV export for users
      const csvUsers = [
        ['Username', 'Email', 'Role', 'First Name', 'Last Name', 'Created At'],
        ...(users || []).map(u => [u.username, u.email || '', u.role, u.firstName || '', u.lastName || '', new Date(u.createdAt).toLocaleString()])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvUsers], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campus-ratings-users-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    toast({ title: t("admin.toasts.exportSuccess"), description: t("admin.toasts.exportDesc", { format: exportFormat.toUpperCase() }) });
  };

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("admin.toasts.userDeleted") });
      refetchUsers();
    },
    onError: () => {
      toast({ title: t("admin.toasts.userDeleteFailed"), variant: "destructive" });
    },
  });

  // Update user role mutation
  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("admin.toasts.userRoleUpdated") });
      refetchUsers();
      // Keep the editor open briefly so inline success can be seen
    },
    onError: () => {
      toast({ title: t("admin.toasts.userRoleUpdateFailed"), variant: "destructive" });
    },
  });

  // Create doctor mutation
  const createDoctor = useMutation({
    mutationFn: async (doctor: typeof newDoctor) => {
      const res = await apiRequest("POST", "/api/admin/doctors", doctor);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("admin.toasts.doctorCreated") });
      refetchDoctors();
      setNewDoctor({ name: "", department: "", title: "", bio: "" });
    },
    onError: () => {
      toast({ title: t("admin.toasts.doctorCreateFailed"), variant: "destructive" });
    },
  });

  // Delete doctor mutation
  const deleteDoctor = useMutation({
    mutationFn: async (doctorId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/doctors/${doctorId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("admin.toasts.doctorDeleted") });
      refetchDoctors();
    },
    onError: () => {
      toast({ title: t("admin.toasts.doctorDeleteFailed"), variant: "destructive" });
    },
  });

  // Delete review mutation
  const deleteReview = useMutation({
    mutationFn: async (reviewId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/reviews/${reviewId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("admin.toasts.reviewDeleted") });
      refetchReviews();
    },
    onError: () => {
      toast({ title: t("admin.toasts.reviewDeleteFailed"), variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background transition-colors duration-100">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section with Gradient */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 p-8 mb-8 shadow-2xl transition-all duration-100"
        >
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30"
              >
                <Shield className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl font-bold text-white"
                >
                  {t("admin.header.title")}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-white/90 mt-1"
                >
                  {t("admin.header.subtitle")}
                </motion.p>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-2"
            >
              <Button variant="secondary" size="sm" className="gap-2" onClick={handleExportData}>
                <Download className="h-4 w-4" />
                {t("admin.header.export")}
              </Button>
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4" />
                {t("admin.header.settings")}
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-100 bg-blue-50/50 dark:bg-blue-950/50">
              <CardContent className="pt-6 h-[140px] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +12%
                  </Badge>
                </div>
                <div className="flex flex-col flex-1 justify-end">
                  <p className="text-sm text-muted-foreground mb-1">{t("admin.stats.totalUsers")}</p>
                  <div className="flex flex-col items-start">
                    <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400 leading-tight">{stats?.totalUsers || 0}</h3>
                    <p className="text-xs text-muted-foreground leading-tight">{t("admin.stats.activeMembers")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-100 bg-green-50/50 dark:bg-green-950/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +8%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{t("admin.stats.totalDoctors")}</p>
                <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">{stats?.totalDoctors || 0}</h3>
                <p className="text-xs text-muted-foreground mt-2">{t("admin.stats.registeredProfiles")}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-100 bg-purple-50/50 dark:bg-purple-950/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-full bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +24%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{t("admin.stats.totalReviews")}</p>
                <h3 className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats?.totalReviews || 0}</h3>
                <p className="text-xs text-muted-foreground mt-2">{t("admin.stats.submittedRatings")}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-100 bg-orange-50/50 dark:bg-orange-950/50">
              <CardContent className="pt-6">
                {/* Live HealthStatus component with smooth animation */}
                <HealthStatus />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.1 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                {t("admin.quickActions.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-blue-50 dark:hover:bg-blue-950" onClick={() => { setSelectedTab("users"); setTimeout(scrollToTabs, 100); }}>
                  <UserPlus className="h-5 w-5" />
                  <span className="text-sm">{t("admin.quickActions.viewUsers")}</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-green-50 dark:hover:bg-green-950" onClick={() => { setSelectedTab("doctors"); setTimeout(scrollToTabs, 100); }}>
                  <GraduationCap className="h-5 w-5" />
                  <span className="text-sm">{t("admin.quickActions.viewDoctors")}</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-purple-50 dark:hover:bg-purple-950" onClick={() => { setSelectedTab("reviews"); setTimeout(scrollToTabs, 100); }}>
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-sm">{t("admin.quickActions.viewReviews")}</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-orange-50 dark:hover:bg-orange-950" onClick={handleExportData}>
                  <Download className="h-5 w-5" />
                  <span className="text-sm">{t("admin.quickActions.exportData")}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.1 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-lg h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  {t("admin.activity.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {activityLogs && activityLogs.length > 0 ? (
                      activityLogs.map((activity, index) => {
                        const getActivityIcon = (type: string) => {
                          switch (type) {
                            case 'login': return UserPlus;
                            case 'review': return MessageSquare;
                            case 'doctor': return GraduationCap;
                            case 'role': return Shield;
                            default: return Activity;
                          }
                        };
                        const getActivityColor = (type: string) => {
                          switch (type) {
                            case 'login': return 'text-blue-500';
                            case 'review': return 'text-purple-500';
                            case 'doctor': return 'text-green-500';
                            case 'role': return 'text-red-500';
                            default: return 'text-gray-500';
                          }
                        };
                        const ActivityIcon = getActivityIcon(activity.type);
                        return (
                          <motion.div
                            key={activity.id || index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.1 }}
                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center ${getActivityColor(activity.type)}`}>
                              <ActivityIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{activity.action}</p>
                              <p className="text-xs text-muted-foreground">{t("admin.activity.byUser", { username: activity.username, role: activity.role })}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleString()}</span>
                          </motion.div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">{t("admin.activity.empty")}</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.1 }}
          >
            <Card className="border-0 shadow-lg h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  {t("admin.activity.topRated")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Dr. Sarah Johnson", rating: 4.9, reviews: 45 },
                    { name: "Dr. Michael Chen", rating: 4.8, reviews: 38 },
                    { name: "Dr. Emily Williams", rating: 4.7, reviews: 32 },
                  ].map((doctor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">{doctor.name}</p>
                        <p className="text-xs text-muted-foreground">{t("admin.activity.reviewsCount", { count: doctor.reviews })}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="text-sm font-bold">{doctor.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Management Tabs */}
        <div ref={tabsSectionRef}>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6 h-12">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                {t("admin.tabs.users")}
              </TabsTrigger>
              <TabsTrigger value="doctors" className="gap-2">
                <GraduationCap className="h-4 w-4" />
                {t("admin.tabs.doctors")}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                {t("admin.tabs.reviews")}
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{t("admin.users.title")}</CardTitle>
                      <CardDescription>{t("admin.users.subtitle")}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t("admin.users.searchPlaceholder")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder={t("admin.users.table.role")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("admin.users.allRoles")}</SelectItem>
                          <SelectItem value="student">{t("roles.student")}</SelectItem>
                          <SelectItem value="teacher">{t("roles.teacher")}</SelectItem>
                          <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingUser && (
                    <div ref={roleEditorRef} className="mb-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Edit User Role</CardTitle>
                          <CardDescription>
                            Change the role for {editingUser.username}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {/* Inline Alerts */}
                          {((updateUserRole as any).isError) && (
                            <Alert variant="destructive" className="mb-3">
                              <AlertTitle>Failed</AlertTitle>
                              <AlertDescription>Could not update the role. Please try again.</AlertDescription>
                            </Alert>
                          )}
                          {((updateUserRole as any).isSuccess) && (
                            <Alert className="mb-3">
                              <AlertTitle>Saved</AlertTitle>
                              <AlertDescription>User role updated successfully.</AlertDescription>
                            </Alert>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-3">
                            <Label htmlFor="edit-role">Role</Label>
                            <select
                              id="edit-role"
                              title="Select user role"
                              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                            >
                              <option value="student">Student</option>
                              <option value="teacher">Teacher</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        </CardContent>
                        <CardContent className="flex justify-end gap-2 pt-0">
                          <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                          <Button
                            disabled={(updateUserRole as any).isLoading || (updateUserRole as any).isPending}
                            onClick={() => {
                              if (editingUser) {
                                updateUserRole.mutate({ userId: editingUser.id, role: editRole });
                                // Auto-close after a short delay on success
                                setTimeout(() => {
                                  if ((updateUserRole as any).isSuccess) setEditingUser(null);
                                }, 1200);
                              }
                            }}
                          >
                            {((updateUserRole as any).isLoading || (updateUserRole as any).isPending) ? "Saving..." : "Save Changes"}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("admin.users.table.username")}</TableHead>
                          <TableHead>{t("admin.users.table.email")}</TableHead>
                          <TableHead>{t("admin.users.table.name")}</TableHead>
                          <TableHead>{t("admin.users.table.role")}</TableHead>
                          <TableHead>{t("admin.users.table.joined")}</TableHead>
                          <TableHead className="text-right">{t("admin.users.table.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users
                          ?.filter(user => {
                            const matchesSearch = searchQuery === "" ||
                              user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              user.email?.toLowerCase().includes(searchQuery.toLowerCase());
                            const matchesRole = filterRole === "all" || user.role === filterRole;
                            return matchesSearch && matchesRole;
                          })
                          .map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.username}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "—"}</TableCell>
                              <TableCell>
                                <Badge variant={user.role === "admin" ? "destructive" : user.role === "teacher" ? "default" : "secondary"}>
                                  {t(`roles.${user.role}`)}
                                </Badge>
                              </TableCell>
                              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingUser(user)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm(t("admin.users.delete.confirm", { username: user.username }))) {
                                        deleteUser.mutate(user.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Doctors Tab */}
            <TabsContent value="doctors">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{t("admin.doctors.add.title")}</CardTitle>
                  <CardDescription>{t("admin.doctors.add.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>{t("admin.doctors.add.name")}</Label>
                      <Input
                        value={newDoctor.name}
                        onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                        placeholder={t("admin.doctors.add.placeholder.name")}
                      />
                    </div>
                    <div>
                      <Label>{t("admin.doctors.add.department")}</Label>
                      <Input
                        value={newDoctor.department}
                        onChange={(e) => setNewDoctor({ ...newDoctor, department: e.target.value })}
                        placeholder={t("admin.doctors.add.placeholder.department")}
                      />
                    </div>
                    <div>
                      <Label>{t("admin.doctors.add.doctorTitle")}</Label>
                      <Input
                        value={newDoctor.title}
                        onChange={(e) => setNewDoctor({ ...newDoctor, title: e.target.value })}
                        placeholder={t("admin.doctors.add.placeholder.title")}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>{t("admin.doctors.add.bio")}</Label>
                      <Textarea
                        value={newDoctor.bio}
                        onChange={(e) => setNewDoctor({ ...newDoctor, bio: e.target.value })}
                        placeholder={t("admin.doctors.add.placeholder.bio")}
                        rows={3}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button
                        onClick={() => createDoctor.mutate(newDoctor)}
                        disabled={!newDoctor.name || !newDoctor.department}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("admin.doctors.add.button")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.doctors.title")}</CardTitle>
                  <CardDescription>{t("admin.doctors.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.doctors.table.name")}</TableHead>
                        <TableHead>{t("admin.doctors.table.department")}</TableHead>
                        <TableHead>{t("admin.doctors.table.title")}</TableHead>
                        <TableHead>{t("admin.doctors.table.created")}</TableHead>
                        <TableHead>{t("admin.doctors.table.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {doctors?.map((doctor) => (
                        <TableRow key={doctor.id}>
                          <TableCell className="font-medium">{doctor.name}</TableCell>
                          <TableCell>{doctor.department}</TableCell>
                          <TableCell>{doctor.title || "—"}</TableCell>
                          <TableCell>{new Date(doctor.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm(t("admin.doctors.delete.confirm", { name: doctor.name }))) {
                                    deleteDoctor.mutate(doctor.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.reviews.title")}</CardTitle>
                  <CardDescription>{t("admin.reviews.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.reviews.table.doctor")}</TableHead>
                        <TableHead>{t("admin.reviews.table.ratings")}</TableHead>
                        <TableHead>{t("admin.reviews.table.comment")}</TableHead>
                        <TableHead>{t("admin.reviews.table.date")}</TableHead>
                        <TableHead>{t("admin.reviews.table.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviews?.map((review) => (
                        <TableRow key={review.id}>
                          <TableCell className="font-medium">{review.doctorName}</TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs">
                              <div>{t("admin.reviews.table.teaching")}: {review.teachingQuality}/5</div>
                              <div>{t("admin.reviews.table.knowledge")}: {review.knowledge}/5</div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{review.comment || "—"}</TableCell>
                          <TableCell>{new Date(review.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm(t("admin.reviews.delete.confirm"))) {
                                  deleteReview.mutate(review.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md h-[90vh] shadow-2xl border-2 border-primary/20 top-[5vh] translate-y-0 flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t("admin.settings.title")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.settings.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pr-2">
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="export-format">{t("admin.settings.exportFormat")}</Label>
                <Select value={exportFormat} onValueChange={(value: 'json' | 'csv') => setExportFormat(value)}>
                  <SelectTrigger id="export-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="json">{t("admin.settings.jsonFormat")}</SelectItem>
                    <SelectItem value="csv">{t("admin.settings.csvFormat")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t("admin.settings.exportFormatDesc")}</p>
              </div>

              <div className="space-y-2">
                <Label>{t("admin.settings.statsTitle")}</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-muted-foreground text-xs">{t("admin.stats.totalUsers")}</p>
                    <p className="font-bold text-lg">{stats?.totalUsers || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-muted-foreground text-xs">{t("admin.stats.totalDoctors")}</p>
                    <p className="font-bold text-lg">{stats?.totalDoctors || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-muted-foreground text-xs">{t("admin.stats.totalReviews")}</p>
                    <p className="font-bold text-lg">{stats?.totalReviews || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-muted-foreground text-xs">{t("admin.stats.systemHealth")}</p>
                    <p className="font-bold text-lg text-green-600">98.5%</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("admin.quickActions.title")}</Label>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowSettings(false); handleExportData(); }} className="justify-start gap-2">
                    <Download className="h-4 w-4" />
                    {t("admin.settings.exportAll")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowSettings(false); setSelectedTab("users"); setTimeout(scrollToTabs, 100); }} className="justify-start gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{t("admin.quickActions.viewUsers")}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowSettings(false); setSelectedTab("doctors"); setTimeout(scrollToTabs, 100); }} className="justify-start gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span className="text-sm">{t("admin.quickActions.viewDoctors")}</span>
                  </Button>
                </div>
              </div>
              <div className="h-4" />
            </div>
          </div>
          <DialogFooter className="p-6 pt-2 border-t">
            <Button onClick={() => setShowSettings(false)}>{t("admin.settings.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

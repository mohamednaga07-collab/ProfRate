import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { DoctorCard } from "@/components/DoctorCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Mail,
  Calendar,
  UserPlus,
  Settings,
  Database,
  Zap,
  Star,

} from "lucide-react";
import { useTranslation } from "react-i18next";
import HealthStatus, { AnimatedHealthText } from "@/components/ui/HealthStatus";
import { fetchSystemHealth } from "@/lib/healthUtils";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { StatCard } from "@/components/ui/StatCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  profileImageUrl?: string;
  emailVerified?: boolean;
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

interface DoctorRating {
  id: number;
  doctorId: number;
  totalReviews: number;
  overallRating: number;
  avgTeachingQuality: number;
  avgAvailability: number;
  avgCommunication: number;
  avgKnowledge: number;
  avgFairness: number;
  updatedAt: string;
}

interface DoctorWithRatings extends Doctor {
  ratings: DoctorRating | null;
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
  activeUsers: number;
  usersGrowth: number;
  doctorsGrowth: number;
  reviewsGrowth: number;
  pendingReports: number;
}

const maskEmail = (email: string) => {
  if (!email || !email.includes("@")) return email;
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 3) {
    return `${localPart[0]}***@${domain}`;
  }
  const maskedLocal = localPart.substring(0, 2) + "*".repeat(localPart.length - 3) + localPart.substring(localPart.length - 1);
  return `${maskedLocal}@${domain}`;
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("users");
  const [showSettings, setShowSettings] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  // Delete confirmation state
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [doctorToDelete, setDoctorToDelete] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [doctorDeleteConfirmOpen, setDoctorDeleteConfirmOpen] = useState(false);
  
  // Doctor Card Popup state
  const [viewingDoctorId, setViewingDoctorId] = useState<number | null>(null);
  const [doctorCardOpen, setDoctorCardOpen] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ name: "", department: "", title: "", bio: "" });
  const [editRole, setEditRole] = useState<string>("student");
  const roleEditorRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

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

  // Determine if any modal is open for background blur effect
  const isAnyModalOpen = showSettings || isEditUserOpen || deleteConfirmOpen || doctorDeleteConfirmOpen || doctorCardOpen;

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

  // Fetch specific doctor with ratings for popup
  const { data: fullDoctorData, isLoading: isLoadingDoctorDetail } = useQuery<DoctorWithRatings>({
    queryKey: ["/api/doctors", viewingDoctorId],
    enabled: !!viewingDoctorId && doctorCardOpen,
  });

  // Fetch reviews
  const { data: reviews, refetch: refetchReviews } = useQuery<Review[]>({
    queryKey: ["/api/admin/reviews"],
  });

  // Fetch activity logs
  const { data: activityLogs } = useQuery<any[]>({
    queryKey: ["/api/admin/activity"],
  });

  // Fetch system health
  const { data: healthPercent } = useQuery<number>({
    queryKey: ["system-health"],
    queryFn: fetchSystemHealth,
    refetchInterval: 30000, // Check every 30s
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
        [
          t("admin.users.export.username"),
          t("admin.users.export.email"),
          t("admin.users.export.role"),
          t("admin.users.export.firstName"),
          t("admin.users.export.lastName"),
          t("admin.users.export.joined")
        ],
        ...(users || []).map(u => [
          u.username,
          maskEmail(u.email || ''),
          u.role,
          u.firstName || '',
          u.lastName || '',
          new Date(u.createdAt).toLocaleString()
        ])
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
    onError: (error) => {
      console.error("Delete user failed:", error);
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

  // Track to top when finding user


  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/20">
      {/* Background with transition for modal state */}
      <div className={`transition-all duration-500 ease-out ${isAnyModalOpen ? 'blur-md scale-[0.99] opacity-50 pointer-events-none select-none grayscale-[0.2]' : ''}`}>
        <Header />
        
        <main className="container mx-auto px-4 py-8 max-w-7xl">
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
            <StatCard
              title={t("admin.stats.totalUsers")}
              value={stats?.totalUsers || 0}
              icon={Users}
              color="blue"
              trend={stats?.usersGrowth}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1, delay: 0.1 }}
          >
            <StatCard
              title={t("admin.stats.totalDoctors")}
              value={stats?.totalDoctors || 0}
              icon={GraduationCap}
              color="green" // Using green as per previous design
              trend={stats?.doctorsGrowth} // Assuming doctorsGrowth exists on Stats
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1, delay: 0.2 }}
          >
            <StatCard
              title={t("admin.stats.totalReviews")}
              value={stats?.totalReviews || 0}
              icon={MessageSquare}
              color="purple"
              trend={stats?.reviewsGrowth}
            />
          </motion.div>

          {/* System Health Card (Main Dashboard) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1, delay: 0.3 }}
          >
             {/* Using a wrapped HealthStatus for the main dashboard to match StatCard height/style */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm relative overflow-hidden group h-full bg-orange-50/50 dark:bg-orange-950/50">
               <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <CardContent className="p-4 h-full relative z-10 w-full">
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
                              <p className="text-sm font-medium">
                                {t(`admin.activity.actions.${activity.action.toLowerCase().replace(/\s+/g, "_")}`, { defaultValue: activity.action })}
                              </p>
                              <p className="text-xs text-muted-foreground">{t("admin.activity.byUser", { username: activity.username, role: t(`roles.${activity.role}`) })}</p>
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
                    { name: "Sarah Johnson", rating: 4.9, reviews: 45 },
                    { name: "Michael Chen", rating: 4.8, reviews: 38 },
                    { name: "Emily Williams", rating: 4.7, reviews: 32 },
                  ].map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-bold">
                          {t("doctorProfile.doctorPrefix", "د.")} {t(`home.professors.names.${doc.name.trim()}`, { defaultValue: doc.name.trim() })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.reviews} {t("teacherDashboard.reviewsCount")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{doc.rating}</p>
                        <StarRating rating={doc.rating} size="sm" />
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
                        <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t("admin.users.searchPlaceholder")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="ps-10 w-64"
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
                  {/* User Details & Edit Dialog */}
                  <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
                    <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-accent/20">
                      <DialogTitle className="sr-only">{t("admin.users.edit.title")}</DialogTitle>
                      <DialogDescription className="sr-only">{t("admin.users.edit.subtitle", { username: editingUser?.username })}</DialogDescription>
                      <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-500 relative w-full">
                      </div>
                      <div className="px-6 pb-6 relative">
                        {/* Avatar overlapping the banner */}
                        <div className="absolute -top-12 start-6">
                          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                            <AvatarImage src={editingUser?.profileImageUrl} alt={editingUser?.username} />
                            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                              {editingUser?.username?.substring(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        <div className="ms-28 -mt-4 space-y-1">
                          <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold">{editingUser?.firstName ? `${editingUser.firstName} ${editingUser.lastName}` : editingUser?.username}</h2>
                            <Badge variant={editingUser?.role === "admin" ? "destructive" : editingUser?.role === "teacher" ? "default" : "secondary"}>
                              {editingUser?.role && t(`roles.${editingUser.role}`)}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground flex items-center gap-1">
                            @{editingUser?.username}
                          </p>
                        </div>

                        <div className="mt-8 grid gap-4">
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">{t("admin.users.edit.contact")}</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="overflow-hidden flex-1">
                                  <p className="text-sm font-medium truncate" title={editingUser?.email}>{maskEmail(editingUser?.email)}</p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {editingUser?.emailVerified ?
                                      <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 w-fit"><CheckCircle className="h-3 w-3" /> {t("admin.users.edit.verified")}</span>
                                      :
                                      <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-full w-fit">{t("admin.users.edit.unverified")}</span>
                                    }
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                  <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{t("admin.users.edit.joined")} {editingUser?.createdAt && new Date(editingUser.createdAt).toLocaleDateString()}</p>
                                  <p className="text-xs text-muted-foreground">{editingUser?.createdAt && new Date(editingUser.createdAt).toLocaleTimeString()}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-1.5 mt-2">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">{t("admin.users.edit.actions")}</Label>
                            <Card className="border shadow-none">
                              <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="flex-1">
                                  <Label htmlFor="edit-role" className="mb-1 block">{t("admin.users.edit.roleAssignment")}</Label>
                                  <p className="text-xs text-muted-foreground">{t("admin.users.editRoleDesc", "Manage user access permissions")}</p>
                                </div>
                                <div className="w-[140px]">
                                  <Select
                                    value={editRole}
                                    onValueChange={setEditRole}
                                  >
                                    <SelectTrigger id="edit-role">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="student">{t("roles.student")}</SelectItem>
                                      <SelectItem value="teacher">{t("roles.teacher")}</SelectItem>
                                      <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>

                        <DialogFooter className="mt-8 gap-2">
                          <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>{t("common.cancel")}</Button>
                          <Button
                            disabled={(updateUserRole as any).isLoading || (updateUserRole as any).isPending}
                            onClick={() => {
                              if (editingUser) {
                                updateUserRole.mutate(
                                  { userId: editingUser.id, role: editRole },
                                  { onSuccess: () => setIsEditUserOpen(false) }
                                );
                              }
                            }}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md"
                          >
                            {((updateUserRole as any).isLoading || (updateUserRole as any).isPending) ? t("common.saving") : t("admin.users.edit.save")}
                          </Button>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <ScrollArea className="h-[500px]">
                    <div className="table-responsive">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("admin.users.table.username")}</TableHead>
                          <TableHead>{t("admin.users.table.email")}</TableHead>
                          <TableHead>{t("admin.users.table.name")}</TableHead>
                          <TableHead>{t("admin.users.table.role")}</TableHead>
                          <TableHead>{t("admin.users.table.joined")}</TableHead>
                          <TableHead className="text-end">{t("admin.users.table.actions")}</TableHead>
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
                              <TableCell>{maskEmail(user.email)}</TableCell>
                              <TableCell>{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "—"}</TableCell>
                              <TableCell>
                                <Badge variant={user.role === "admin" ? "destructive" : user.role === "teacher" ? "default" : "secondary"}>
                                  {t(`roles.${user.role}`)}
                                </Badge>
                              </TableCell>
                              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setEditingUser(user); setIsEditUserOpen(true); }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setUserToDelete(user);
                                      setDeleteConfirmOpen(true);
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
                  <ScrollArea className="h-[500px]">
                    <div className="table-responsive">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">{t("admin.doctors.table.image")}</TableHead>
                          <TableHead>{t("admin.doctors.table.name")}</TableHead>
                          <TableHead>{t("admin.doctors.table.department")}</TableHead>
                          <TableHead>{t("admin.doctors.table.title")}</TableHead>
                          <TableHead className="text-end">{t("admin.doctors.table.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doctors?.map((doctor) => (
                          <TableRow key={doctor.id}>
                            <TableCell>
                              <Avatar>
                                <AvatarImage src={doctor.profileImageUrl} alt={doctor.name} />
                                <AvatarFallback>
                                  {doctor.name.toLowerCase().includes("dr.") ? (t("common.doctorAbbr", "DR")) : doctor.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">
                              {t("doctorProfile.doctorPrefix", "د.")} {t(`home.professors.names.${doctor.name.replace(/^Dr\.?\s+/i, "").trim()}`, { defaultValue: doctor.name.replace(/^Dr\.?\s+/i, "").trim() })}
                            </TableCell>
                            <TableCell>
                              {t(`home.departments.${doctor.department.trim()}`, { defaultValue: t(`home.departments.${doctor.department.trim().toLowerCase()}`, { defaultValue: doctor.department }) })}
                            </TableCell>
                            <TableCell>
                              {t(`home.departments.${doctor.title?.trim()}`, { defaultValue: doctor.title })}
                            </TableCell>
                            <TableCell className="text-end">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setViewingDoctorId(doctor.id);
                                    setDoctorCardOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setDoctorToDelete(doctor);
                                    setDoctorDeleteConfirmOpen(true);
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
          </Tabs>
        </div>
      </main>
      </div> {/* End of blurred wrapper */}

      {/* Settings Dialog - Widened and Reorganized */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-3xl max-h-[85vh] shadow-2xl border-2 border-primary/20 flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 bg-muted/10 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Settings className="h-6 w-6 text-primary" />
              {t("admin.settings.title")}
            </DialogTitle>
            <DialogDescription className="text-base">
              {t("admin.settings.subtitle")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Platform Statistics Section - 4 Big Cards in 2x2 Grid */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  <Label className="text-lg font-semibold">{t("admin.settings.statsTitle")}</Label>
                </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Total Users - Blue Theme */}
                    <StatCard
                      title={t("admin.stats.totalUsers")}
                      value={stats?.totalUsers || 0}
                      icon={Users}
                      color="blue"
                      className="shadow-md h-32"
                    />

                    {/* Total Doctors - Green Theme */}
                    <StatCard
                      title={t("admin.stats.totalDoctors")}
                      value={stats?.totalDoctors || 0}
                      icon={GraduationCap}
                      color="green"
                      className="shadow-md h-32"
                    />

                    {/* Total Reviews - Purple Theme */}
                    <StatCard
                      title={t("admin.stats.totalReviews")}
                      value={stats?.totalReviews || 0}
                      icon={MessageSquare}
                      color="purple"
                      className="shadow-md h-32"
                    />

                  {/* System Health - Orange Theme */}
                  <Card className="border-0 shadow-md h-32 bg-orange-50/50 dark:bg-orange-950/50 backdrop-blur-sm relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-4 h-full relative z-10 w-full">
                      <HealthStatus />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Lower Section: Exports and Quick Actions Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Export Format Section */}
                <Card className="border-0 shadow-sm bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Download className="h-4 w-4 text-blue-500" />
                      {t("admin.settings.exportFormat")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="export-format" className="sr-only">{t("admin.settings.exportFormat")}</Label>
                      <Select value={exportFormat} onValueChange={(value: 'json' | 'csv') => setExportFormat(value)}>
                        <SelectTrigger id="export-format" className="bg-background/50 border-slate-200 dark:border-slate-800 h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="json">{t("admin.settings.jsonFormat")}</SelectItem>
                          <SelectItem value="csv">{t("admin.settings.csvFormat")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground leading-snug">{t("admin.settings.exportFormatDesc")}</p>
                    </div>
                    <Button onClick={() => { setShowSettings(false); handleExportData(); }} className="w-full gap-2" variant="outline">
                      <Download className="h-4 w-4" />
                      {t("admin.settings.exportAll")}
                    </Button>
                  </CardContent>
                </Card>

                {/* Quick Actions Section */}
                <Card className="border-0 shadow-sm bg-yellow-50/50 dark:bg-yellow-950/20 backdrop-blur-sm h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      {t("admin.quickActions.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setShowSettings(false); setSelectedTab("users"); setTimeout(scrollToTabs, 100); }} className="justify-start gap-2 bg-background/50 hover:bg-background/80 border-yellow-200 dark:border-yellow-900/50 h-10">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">{t("admin.quickActions.viewUsers")}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setShowSettings(false); setSelectedTab("doctors"); setTimeout(scrollToTabs, 100); }} className="justify-start gap-2 bg-background/50 hover:bg-background/80 border-yellow-200 dark:border-yellow-900/50 h-10">
                        <GraduationCap className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">{t("admin.quickActions.viewDoctors")}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setShowSettings(false); setSelectedTab("reviews"); setTimeout(scrollToTabs, 100); }} className="justify-start gap-2 bg-background/50 hover:bg-background/80 border-yellow-200 dark:border-yellow-900/50 h-10">
                        <MessageSquare className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">{t("admin.quickActions.viewReviews")}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t bg-muted/10">
            <Button onClick={() => setShowSettings(false)} className="w-full sm:w-auto px-8">{t("admin.settings.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.common.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.common.confirmDeleteDesc")}
              <span className="font-semibold text-foreground"> {userToDelete?.username} </span>
              {t("admin.common.confirmDeleteRemoveData")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (userToDelete) {
                  console.log("🗑️ Confirm Delete clicked for:", userToDelete.id);
                  deleteUser.mutate(userToDelete.id);
                  setUserToDelete(null);
                }
              }}
            >
              {t("admin.users.delete.button")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Doctor Confirmation Dialog */}
      <AlertDialog open={doctorDeleteConfirmOpen} onOpenChange={setDoctorDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.doctors.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.doctors.delete.description", { name: doctorToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (doctorToDelete) {
                  deleteDoctor.mutate(doctorToDelete.id);
                  setDoctorToDelete(null);
                }
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Professor Card Popup - Glassy Effect */}
      <Dialog open={doctorCardOpen} onOpenChange={setDoctorCardOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl bg-background/60 backdrop-blur-xl">
          <div className="p-1">
            {isLoadingDoctorDetail ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : fullDoctorData ? (
              <DoctorCard doctor={fullDoctorData} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground p-6 text-center">
                {t("doctorProfile.notFound.title", "Professor data not found")}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

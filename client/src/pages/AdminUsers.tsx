import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Shield, User, GraduationCap, Edit, Check, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function AdminUsers() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [newFirstName, setNewFirstName] = useState<string>("");
  const [newLastName, setNewLastName] = useState<string>("");
  const [newUsername, setNewUsername] = useState<string>("");
  const [newLinkedDoctorId, setNewLinkedDoctorId] = useState<string>("none");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["/api/admin/doctors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/doctors");
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json();
    },
  });

  const updateDetailsMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/details`, data);
      if (!res.ok) {
         const errorData = await res.json();
         throw new Error(errorData.message || "Update failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Updated",
        description: "The user's details and role have been updated.",
      });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
        toast({
            title: "Update failed",
            description: error.message,
            variant: "destructive",
        });
    }
  });

  const linkDoctorMutation = useMutation({
    mutationFn: async ({ userId, doctorId }: { userId: string; doctorId: number | null }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/link-doctor`, { doctorId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Profile linked",
        description: "Teacher properly linked to profile.",
      });
    }
  });

  const handleSaveChanges = () => {
    if (selectedUser) {
      // First update details (which also updates role and might auto-link)
      updateDetailsMutation.mutate({ 
        userId: selectedUser.id, 
        data: {
           firstName: newFirstName,
           lastName: newLastName,
           username: newUsername,
           role: newRole
        }
      });

      // Update linked doctor if explicitly changed manually
      const currentLinkedIdStr = selectedUser.linkedDoctorId ? String(selectedUser.linkedDoctorId) : "none";
      if (newRole === "teacher" && newLinkedDoctorId !== currentLinkedIdStr) {
        linkDoctorMutation.mutate({ 
          userId: selectedUser.id, 
          doctorId: newLinkedDoctorId === "none" ? null : parseInt(newLinkedDoctorId, 10) 
        });
      }
    }
  };

  const openEditDialog = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setNewFirstName(user.firstName || "");
    setNewLastName(user.lastName || "");
    setNewUsername(user.username || "");
    setNewLinkedDoctorId(user.linkedDoctorId ? String(user.linkedDoctorId) : "none");
    setIsDialogOpen(true);
  };

  const getRoleIcon = (role: string) => {
      switch(role) {
          case 'admin': return <Shield className="h-4 w-4 text-red-500" />;
          case 'teacher': return <GraduationCap className="h-4 w-4 text-blue-500" />;
          default: return <User className="h-4 w-4 text-green-500" />;
      }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("admin.titles.users")}</h1>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t("admin.badges.adminAccess", { defaultValue: "Admin Access" })}
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-lg border shadow-sm h-[400px]">
             <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
             <p className="text-muted-foreground">{t("common.loading", { defaultValue: "Loading..." })}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
            <AlertCircle className="h-5 w-5" />
            <span>{t("admin.errors.loadingUsers")}: {String(error.message)}</span>
        </div>
      )}

      {users && Array.isArray(users) && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">{t("admin.table.name")}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">{t("admin.table.email")}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">{t("admin.table.role")}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">{t("admin.table.status")}</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">{t("admin.table.actions", { defaultValue: "Actions" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">{user.email}</td>
                  <td className="px-6 py-4">
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-secondary w-fit text-xs font-medium capitalize">
                          {getRoleIcon(user.role)}
                          {t(`roles.${user.role}`)}
                      </div>
                  </td>
                  <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.isActive 
                          ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}>
                          {user.isActive ? t("admin.status.active") : t("admin.status.inactive")}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Dialog open={isDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                        if (!open) {
                            setIsDialogOpen(false);
                            setSelectedUser(null);
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8" 
                                onClick={() => openEditDialog(user)}
                                disabled={currentUser?.id === user.id}
                                title={currentUser?.id === user.id ? t("admin.tooltips.cannotEditSelf", { defaultValue: "You cannot edit your own role" }) : t("admin.actions.editRole", { defaultValue: "Edit Details" })}
                            >
                                <Edit className="h-3.5 w-3.5 mr-2" />
                                Edit
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit User Details</DialogTitle>
                            </DialogHeader>
                            <div className="py-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">First Name</label>
                                        <input 
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={newFirstName}
                                            onChange={(e) => setNewFirstName(e.target.value)}
                                            placeholder="First Name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Last Name</label>
                                        <input 
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={newLastName}
                                            onChange={(e) => setNewLastName(e.target.value)}
                                            placeholder="Last Name"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Username</label>
                                    <input 
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        placeholder="Username"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("admin.labels.selectRole")}</label>
                                    <Select value={newRole} onValueChange={setNewRole}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="student">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-green-500" />
                                                    {t("roles.student")}
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="teacher">
                                                <div className="flex items-center gap-2">
                                                    <GraduationCap className="h-4 w-4 text-blue-500" />
                                                    {t("roles.teacher")}
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="admin">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="h-4 w-4 text-red-500" />
                                                    {t("roles.admin")}
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {newRole === "teacher" && (
                                    <div className="space-y-2 mt-4">
                                        <label className="text-sm font-medium">Link Doctor Profile (Optional Override)</label>
                                        <Select value={newLinkedDoctorId} onValueChange={setNewLinkedDoctorId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select doctor profile to link..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    <div className="text-muted-foreground italic">Auto-link based on name</div>
                                                </SelectItem>
                                                {doctors.map((doc: any) => (
                                                    <SelectItem key={doc.id} value={String(doc.id)}>
                                                        {doc.name} - {doc.department}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            If set to 'Auto-link', the system will automatically match the profile using the First and Last name.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">{t("common.cancel", { defaultValue: "Cancel" })}</Button>
                                </DialogClose>
                                <Button 
                                  onClick={handleSaveChanges} 
                                  disabled={updateDetailsMutation.isPending || linkDoctorMutation.isPending} 
                                  className="min-w-[100px]"
                                >
                                    {updateDetailsMutation.isPending || linkDoctorMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save", { defaultValue: "Save Changes" })}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}

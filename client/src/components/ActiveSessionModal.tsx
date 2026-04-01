import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut, ArrowRight } from "lucide-react";

interface ActiveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function ActiveSessionModal({ isOpen, onClose, message }: ActiveSessionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
          <DialogTitle className="text-center font-bold text-xl">
            Account Already in Use
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {message || "We noticed your account is already logged into ProfRate from another device or browser."}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 p-4 rounded-lg my-4 space-y-3">
          <div className="flex items-start gap-3 text-sm text-foreground/80">
            <LogOut className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
            <p>To access your account here, please log out from your other device first.</p>
          </div>
          <div className="flex items-start gap-3 text-sm text-foreground/80">
            <ArrowRight className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
            <p>If you don't recognize the other session, we recommend changing your password.</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end mt-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
            Understood
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

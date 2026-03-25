import { motion } from "framer-motion";
import { BarChart3, MoveLeft, Construction } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function StudentStats() {
  const { t } = useTranslation();

  return (
    <div className="container px-4 py-10 md:py-20 max-w-4xl mx-auto flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 flex flex-col items-center"
      >
        <div className="h-24 w-24 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
          <BarChart3 className="h-12 w-12 text-indigo-500" />
        </div>
        
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          Learning Stats
        </h1>
        
        <p className="text-muted-foreground max-w-md mx-auto text-lg pt-2">
          Review your academic trajectory, past enrolled subjects, and rating activity metrics. This feature is currently under active development.
        </p>

        <div className="flex items-center gap-2 mt-8 p-4 rounded-xl bg-muted/50 border border-border/50">
          <Construction className="h-5 w-5 text-amber-500" />
          <span className="text-sm font-medium">Coming soon in the next major update</span>
        </div>

        <div className="pt-8">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/">
              <MoveLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

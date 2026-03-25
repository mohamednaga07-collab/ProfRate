import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MoveLeft, Home, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export default function NotFound() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background visual effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      <div className="container px-4 md:px-6 flex flex-col items-center text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="relative mb-8"
        >
          {/* Animated 404 Text */}
          <h1 className="text-[8rem] md:text-[12rem] font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary via-blue-500 to-purple-600 opacity-20 select-none">
            404
          </h1>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-background/80 backdrop-blur-sm p-6 rounded-3xl border border-border/50 shadow-2xl">
              <SearchX className="h-16 w-16 md:h-24 md:w-24 text-primary" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-md space-y-4"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Page Not Found
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Oops! The page you are looking for seems to have vanished into the digital void. It might have been moved or never existed.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="w-full sm:w-auto rounded-xl">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto rounded-xl border-border/60 hover:bg-muted">
              <Link href="javascript:history.back()">
                <MoveLeft className="mr-2 h-4 w-4" />
                Go Back
              </Link>
            </Button>
          </div>
          
          <p className="mt-8 text-xs text-muted-foreground/60 font-mono bg-muted/50 py-1.5 px-3 rounded-md inline-block">
             Error Code: 404 | Path: {window.location.pathname}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

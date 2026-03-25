import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MoveLeft, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export default function NotFound() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background visual effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      <div className="container px-4 md:px-6 flex flex-col items-center text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mb-10"
        >
          {/* Abstract elegant 404 Text */}
          <h1 className="text-[7rem] md:text-[10rem] font-light tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/20 select-none leading-none">
            404
          </h1>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent mt-4" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-md space-y-6"
        >
          <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground/90">
            Page Not Found
          </h2>
          <p className="text-muted-foreground/80 text-base md:text-lg mb-8 font-light">
            The page you are looking for has either moved to a new location or no longer exists.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Button asChild size="lg" className="w-full sm:w-auto rounded-full font-medium shadow-none hover:opacity-90 transition-opacity">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Return Home
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto rounded-full font-medium shadow-none hover:bg-muted/80 transition-colors">
              <Link href="/login">
                <MoveLeft className="mr-2 h-4 w-4" />
                To Login
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

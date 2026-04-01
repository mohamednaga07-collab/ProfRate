import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, Search, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden selection:bg-primary/20">
      
      {/* Dynamic Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[800px] h-[800px] rounded-full bg-primary/10 blur-[120px] -translate-y-1/4 translate-x-1/4" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[100px] translate-y-1/3 -translate-x-1/3" 
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="container relative z-10 px-4 md:px-6 flex flex-col items-center justify-center text-center">
        
        {/* 404 Glitch & Glow Effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative group mb-8"
        >
          <div className="absolute -inset-8 bg-gradient-to-r from-primary/30 to-blue-500/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full" />
          
          <h1 className="relative text-[8rem] md:text-[12rem] font-bold tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-foreground via-foreground/90 to-muted z-10 drop-shadow-sm">
            4<span className="text-primary inline-block">0</span>4
          </h1>
          
          {/* Floating Badge */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="absolute top-[10%] -right-4 md:-right-12 px-4 py-1.5 rounded-full border border-foreground/10 bg-background/50 backdrop-blur-md shadow-xl flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium tracking-wide">NOT FOUND</span>
          </motion.div>
        </motion.div>

        {/* Messaging Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl mx-auto space-y-8"
        >
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Lost in the Digital Campus
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-[90%] mx-auto">
              We couldn't find the page you're looking for. It might have been moved, renamed, or perhaps it never existed.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              asChild 
              size="lg" 
              className="h-12 px-8 w-full sm:w-auto rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] bg-gradient-to-r from-primary to-primary/90 text-primary-foreground group"
            >
              <Link href="/">
                <Home className="mr-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                Return Home
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="h-12 px-8 w-full sm:w-auto rounded-full font-medium transition-all duration-300 hover:bg-muted/50 border-border backdrop-blur-sm group"
            >
              <Link href="/doctors">
                <Search className="mr-2 h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
                Find Professors
              </Link>
            </Button>
          </div>
        </motion.div>
        
      </div>
    </div>
  );
}

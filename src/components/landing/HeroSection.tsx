import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import heroDashboard from "@/assets/hero-dashboard.png";

export const HeroSection = () => {
  return (
    <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
      <nav className="container mx-auto flex items-center justify-between px-6 py-4">
        <motion.h1 
          className="text-2xl font-bold"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          TrackMySIWES
        </motion.h1>
        <motion.div 
          className="flex gap-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/auth">
            <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
              Login
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="secondary">
              Get Started
            </Button>
          </Link>
        </motion.div>
      </nav>
      
      <div className="container mx-auto px-6 py-16 lg:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Hero Text */}
          <div className="text-center lg:text-left">
            <motion.div 
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <GraduationCap className="h-4 w-4" />
              <span>SIWES Management Platform</span>
            </motion.div>
            <motion.h2 
              className="mb-6 text-4xl font-bold md:text-5xl lg:text-5xl xl:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              A Smart SIWES Monitoring and Internship Logbook System
            </motion.h2>
            <motion.p 
              className="mb-8 max-w-xl text-lg text-primary-foreground/80 md:text-xl lg:mx-0 mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              TrackMySIWES is a centralized digital platform for managing SIWES logbooks, supervision, attendance, and progress tracking for students and supervisors.
            </motion.p>
            <motion.div 
              className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="gap-2">
                  Get Started <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
                  Login to Account
                </Button>
              </Link>
            </motion.div>
            <motion.p 
              className="mt-6 text-sm text-primary-foreground/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              Built to support structured SIWES supervision and academic assessment.
            </motion.p>
          </div>
          
          {/* Hero Dashboard Image */}
          <motion.div 
            className="relative mx-auto w-full max-w-2xl lg:max-w-none"
            initial={{ opacity: 0, scale: 0.95, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <div className="relative rounded-xl bg-white/5 p-2 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm">
              <img
                src={heroDashboard}
                alt="TrackMySIWES Dashboard showing progress tracking, logbook entries, and attendance analytics"
                className="rounded-lg shadow-lg w-full"
              />
            </div>
            {/* Decorative Elements */}
            <motion.div 
              className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-secondary/20 blur-2xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-primary-foreground/10 blur-2xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
          </motion.div>
        </div>
      </div>
    </header>
  );
};

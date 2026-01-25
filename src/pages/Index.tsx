import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Users, 
  FileText, 
  CheckCircle, 
  ArrowRight, 
  GraduationCap, 
  UserCheck, 
  Building2,
  ClipboardCheck,
  BarChart3,
  Shield,
  Clock,
  TrendingUp
} from "lucide-react";
import { HeroSection } from "@/components/landing/HeroSection";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/landing/ScrollReveal";
import { UserCard } from "@/components/landing/UserCard";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { ValuePoint } from "@/components/landing/ValuePoint";
import { MockupCard } from "@/components/landing/MockupCard";
import userStudentsImg from "@/assets/user-students.png";
import userSupervisorsImg from "@/assets/user-supervisors.png";
import userInstitutionsImg from "@/assets/user-institutions.png";
import featureLogbookImg from "@/assets/feature-logbook.png";
import featureApprovalImg from "@/assets/feature-approval.png";
import featureProgressImg from "@/assets/feature-progress.png";
import featureDocumentsImg from "@/assets/feature-documents.png";
import mockupDashboard from "@/assets/mockup-dashboard.png";
import mockupLogbook from "@/assets/mockup-logbook.png";
import mockupReview from "@/assets/mockup-review.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection />

      {/* Who It's For Section */}
      <section className="container mx-auto px-6 py-20">
        <ScrollReveal>
          <h3 className="mb-4 text-center text-3xl font-bold text-foreground">
            Who TrackMySIWES Is Built For
          </h3>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            A comprehensive solution designed to serve all stakeholders in the SIWES ecosystem.
          </p>
        </ScrollReveal>
        <StaggerContainer className="grid gap-8 md:grid-cols-3" staggerDelay={0.15}>
          <StaggerItem>
            <UserCard
              icon={<GraduationCap className="h-10 w-10" />}
              title="Students"
              image={userStudentsImg}
              features={[
                "Log daily SIWES activities",
                "Track attendance and progress",
                "Receive supervisor feedback"
              ]}
            />
          </StaggerItem>
          <StaggerItem>
            <UserCard
              icon={<UserCheck className="h-10 w-10" />}
              title="Supervisors"
              image={userSupervisorsImg}
              features={[
                "Review and approve logbooks",
                "Monitor assigned students",
                "Provide structured feedback"
              ]}
            />
          </StaggerItem>
          <StaggerItem>
            <UserCard
              icon={<Building2 className="h-10 w-10" />}
              title="Institutions / Coordinators"
              image={userInstitutionsImg}
              features={[
                "Monitor SIWES participation",
                "Access progress analytics",
                "Ensure compliance and accountability"
              ]}
            />
          </StaggerItem>
        </StaggerContainer>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.05),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--primary)/0.03),transparent_50%)]" />
        
        <div className="container relative mx-auto px-6 py-24">
          <ScrollReveal>
            <div className="mb-4 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <TrendingUp className="h-4 w-4" />
                Powerful Features
              </span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h3 className="mb-4 text-center text-3xl font-bold text-foreground md:text-4xl">
              Core Features of TrackMySIWES
            </h3>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="mx-auto mb-16 max-w-2xl text-center text-lg text-muted-foreground">
              Everything you need for effective SIWES management in one platform.
            </p>
          </ScrollReveal>
          <StaggerContainer className="grid gap-8 md:grid-cols-2 lg:grid-cols-4" staggerDelay={0.1}>
            <StaggerItem>
              <FeatureCard
                icon={<BookOpen className="h-7 w-7" />}
                title="Daily Logbook Entries"
                description="Students record daily SIWES activities and skills acquired with structured entry forms."
                image={featureLogbookImg}
                accentColor="from-blue-500/20 to-blue-600/10"
              />
            </StaggerItem>
            <StaggerItem>
              <FeatureCard
                icon={<ClipboardCheck className="h-7 w-7" />}
                title="Supervisor Review & Approval"
                description="Supervisors review, comment, and approve logbook submissions with ease."
                image={featureApprovalImg}
                accentColor="from-emerald-500/20 to-emerald-600/10"
              />
            </StaggerItem>
            <StaggerItem>
              <FeatureCard
                icon={<Clock className="h-7 w-7" />}
                title="Progress & Attendance Tracking"
                description="Automatically track SIWES duration, hours, and completion status in real-time."
                image={featureProgressImg}
                accentColor="from-amber-500/20 to-amber-600/10"
              />
            </StaggerItem>
            <StaggerItem>
              <FeatureCard
                icon={<FileText className="h-7 w-7" />}
                title="Document Management"
                description="Upload and manage placement letters, reports, and certificates securely."
                image={featureDocumentsImg}
                accentColor="from-purple-500/20 to-purple-600/10"
              />
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* See It In Action Section */}
      <section className="container mx-auto px-6 py-24">
        <ScrollReveal>
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <BookOpen className="h-4 w-4" />
              Product Preview
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h3 className="mb-4 text-center text-3xl font-bold text-foreground md:text-4xl">
            See TrackMySIWES in Action
          </h3>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
          <p className="mx-auto mb-16 max-w-2xl text-center text-lg text-muted-foreground">
            Explore the intuitive interfaces designed for students, supervisors, and administrators.
          </p>
        </ScrollReveal>
        
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Large Dashboard Mockup */}
          <ScrollReveal className="lg:col-span-7" direction="left" delay={0.2}>
            <MockupCard
              image={mockupDashboard}
              title="Student Dashboard"
              caption="Track your SIWES progress with real-time analytics, hours logged, and activity overview at a glance."
              featured
            />
          </ScrollReveal>
          
          {/* Stacked Right Column */}
          <div className="flex flex-col gap-8 lg:col-span-5">
            <ScrollReveal direction="right" delay={0.3}>
              <MockupCard
                image={mockupLogbook}
                title="Logbook Entry Form"
                caption="Record daily activities, skills learned, and challenges with an intuitive structured form."
              />
            </ScrollReveal>
            <ScrollReveal direction="right" delay={0.4}>
              <MockupCard
                image={mockupReview}
                title="Supervisor Review Panel"
                caption="Review, approve, or request revisions on student submissions with detailed feedback tools."
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Academic Value Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <h3 className="mb-4 text-center text-3xl font-bold text-foreground">
              Why TrackMySIWES Matters
            </h3>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
              Addressing critical challenges in traditional SIWES management.
            </p>
          </ScrollReveal>
          <StaggerContainer className="grid gap-6 md:grid-cols-2" staggerDelay={0.1}>
            <StaggerItem>
              <ValuePoint
                icon={<CheckCircle className="h-6 w-6 text-success" />}
                title="Replaces Manual Logbooks"
                description="Eliminates paper-based record keeping with a reliable digital alternative."
              />
            </StaggerItem>
            <StaggerItem>
              <ValuePoint
                icon={<Shield className="h-6 w-6 text-success" />}
                title="Reduces Data Manipulation"
                description="Timestamped entries and approval workflows ensure data integrity."
              />
            </StaggerItem>
            <StaggerItem>
              <ValuePoint
                icon={<Users className="h-6 w-6 text-success" />}
                title="Improves Supervision Transparency"
                description="Clear visibility into student activities and supervisor feedback."
              />
            </StaggerItem>
            <StaggerItem>
              <ValuePoint
                icon={<Building2 className="h-6 w-6 text-success" />}
                title="Enhances Institutional Monitoring"
                description="Centralized dashboard for tracking SIWES participation across departments."
              />
            </StaggerItem>
            <StaggerItem>
              <ValuePoint
                icon={<BarChart3 className="h-6 w-6 text-success" />}
                title="Supports Outcome-Based Evaluation"
                description="Skill tracking and progress metrics for competency assessment."
              />
            </StaggerItem>
            <StaggerItem>
              <ValuePoint
                icon={<TrendingUp className="h-6 w-6 text-success" />}
                title="Ensures Compliance & Accountability"
                description="Audit trails and structured workflows for regulatory compliance."
              />
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* CTA Section */}
      <ScrollReveal>
        <section className="bg-primary text-primary-foreground">
          <div className="container mx-auto px-6 py-16 text-center">
            <h3 className="mb-4 text-2xl font-bold md:text-3xl">
              Ready to Modernize Your SIWES Experience?
            </h3>
            <p className="mb-8 text-primary-foreground/80">
              Join students and supervisors already using TrackMySIWES for efficient internship management.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="gap-2">
                Create Your Account <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </ScrollReveal>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            TrackMySIWES is a final-year project designed to improve the effectiveness of Student Industrial Work Experience Scheme (SIWES) monitoring.
          </p>
          <p className="text-muted-foreground">
            &copy; {new Date().getFullYear()} TrackMySIWES. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

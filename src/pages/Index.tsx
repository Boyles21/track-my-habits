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
import heroDashboard from "@/assets/hero-dashboard.png";
import userStudentsImg from "@/assets/user-students.png";
import userSupervisorsImg from "@/assets/user-supervisors.png";
import userInstitutionsImg from "@/assets/user-institutions.png";
import featureLogbookImg from "@/assets/feature-logbook.png";
import featureApprovalImg from "@/assets/feature-approval.png";
import featureProgressImg from "@/assets/feature-progress.png";
import featureDocumentsImg from "@/assets/feature-documents.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <nav className="container mx-auto flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold">TrackMySIWES</h1>
          <div className="flex gap-4">
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
          </div>
        </nav>
        
        <div className="container mx-auto px-6 py-16 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Hero Text */}
            <div className="text-center lg:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm">
                <GraduationCap className="h-4 w-4" />
                <span>SIWES Management Platform</span>
              </div>
              <h2 className="mb-6 text-4xl font-bold md:text-5xl lg:text-5xl xl:text-6xl">
                A Smart SIWES Monitoring and Internship Logbook System
              </h2>
              <p className="mb-8 max-w-xl text-lg text-primary-foreground/80 md:text-xl lg:mx-0 mx-auto">
                TrackMySIWES is a centralized digital platform for managing SIWES logbooks, supervision, attendance, and progress tracking for students and supervisors.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
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
              </div>
              <p className="mt-6 text-sm text-primary-foreground/60">
                Built to support structured SIWES supervision and academic assessment.
              </p>
            </div>
            
            {/* Hero Dashboard Image */}
            <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
              <div className="relative rounded-xl bg-white/5 p-2 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm">
                <img
                  src={heroDashboard}
                  alt="TrackMySIWES Dashboard showing progress tracking, logbook entries, and attendance analytics"
                  className="rounded-lg shadow-lg w-full"
                />
              </div>
              {/* Decorative Elements */}
              <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-secondary/20 blur-2xl" />
              <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-primary-foreground/10 blur-2xl" />
            </div>
          </div>
        </div>
      </header>

      {/* Who It's For Section */}
      <section className="container mx-auto px-6 py-20">
        <h3 className="mb-4 text-center text-3xl font-bold text-foreground">
          Who TrackMySIWES Is Built For
        </h3>
        <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
          A comprehensive solution designed to serve all stakeholders in the SIWES ecosystem.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
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
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.05),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--primary)/0.03),transparent_50%)]" />
        
        <div className="container relative mx-auto px-6 py-24">
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <TrendingUp className="h-4 w-4" />
              Powerful Features
            </span>
          </div>
          <h3 className="mb-4 text-center text-3xl font-bold text-foreground md:text-4xl">
            Core Features of TrackMySIWES
          </h3>
          <p className="mx-auto mb-16 max-w-2xl text-center text-lg text-muted-foreground">
            Everything you need for effective SIWES management in one platform.
          </p>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<BookOpen className="h-7 w-7" />}
              title="Daily Logbook Entries"
              description="Students record daily SIWES activities and skills acquired with structured entry forms."
              image={featureLogbookImg}
              accentColor="from-blue-500/20 to-blue-600/10"
            />
            <FeatureCard
              icon={<ClipboardCheck className="h-7 w-7" />}
              title="Supervisor Review & Approval"
              description="Supervisors review, comment, and approve logbook submissions with ease."
              image={featureApprovalImg}
              accentColor="from-emerald-500/20 to-emerald-600/10"
            />
            <FeatureCard
              icon={<Clock className="h-7 w-7" />}
              title="Progress & Attendance Tracking"
              description="Automatically track SIWES duration, hours, and completion status in real-time."
              image={featureProgressImg}
              accentColor="from-amber-500/20 to-amber-600/10"
            />
            <FeatureCard
              icon={<FileText className="h-7 w-7" />}
              title="Document Management"
              description="Upload and manage placement letters, reports, and certificates securely."
              image={featureDocumentsImg}
              accentColor="from-purple-500/20 to-purple-600/10"
            />
          </div>
        </div>
      </section>

      {/* Academic Value Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h3 className="mb-4 text-center text-3xl font-bold text-foreground">
            Why TrackMySIWES Matters
          </h3>
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            Addressing critical challenges in traditional SIWES management.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <ValuePoint
              icon={<CheckCircle className="h-6 w-6 text-success" />}
              title="Replaces Manual Logbooks"
              description="Eliminates paper-based record keeping with a reliable digital alternative."
            />
            <ValuePoint
              icon={<Shield className="h-6 w-6 text-success" />}
              title="Reduces Data Manipulation"
              description="Timestamped entries and approval workflows ensure data integrity."
            />
            <ValuePoint
              icon={<Users className="h-6 w-6 text-success" />}
              title="Improves Supervision Transparency"
              description="Clear visibility into student activities and supervisor feedback."
            />
            <ValuePoint
              icon={<Building2 className="h-6 w-6 text-success" />}
              title="Enhances Institutional Monitoring"
              description="Centralized dashboard for tracking SIWES participation across departments."
            />
            <ValuePoint
              icon={<BarChart3 className="h-6 w-6 text-success" />}
              title="Supports Outcome-Based Evaluation"
              description="Skill tracking and progress metrics for competency assessment."
            />
            <ValuePoint
              icon={<TrendingUp className="h-6 w-6 text-success" />}
              title="Ensures Compliance & Accountability"
              description="Audit trails and structured workflows for regulatory compliance."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
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

interface UserCardProps {
  icon: React.ReactNode;
  title: string;
  features: string[];
  image?: string;
}

const UserCard = ({ icon, title, features, image }: UserCardProps) => (
  <div className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:border-primary/20">
    {image && (
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
        <img 
          src={image} 
          alt={`${title} illustration`}
          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
      </div>
    )}
    <div className="p-8 text-center">
      <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4 text-primary">
        {icon}
      </div>
      <h4 className="mb-4 text-xl font-semibold text-card-foreground">{title}</h4>
      <ul className="space-y-3 text-left">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  image?: string;
  accentColor?: string;
}

const FeatureCard = ({ icon, title, description, image, accentColor = "from-primary/20 to-primary/10" }: FeatureCardProps) => (
  <div className="group relative rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-1">
    {/* Image Section */}
    {image && (
      <div className={`relative h-40 overflow-hidden bg-gradient-to-br ${accentColor}`}>
        <img 
          src={image} 
          alt={`${title} illustration`}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
        />
        {/* Gradient overlay for smooth transition */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
      </div>
    )}
    
    {/* Content Section */}
    <div className="relative p-6 text-center">
      {/* Icon badge */}
      <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary shadow-sm ring-1 ring-primary/10 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md group-hover:shadow-primary/20">
        {icon}
      </div>
      <h4 className="mb-3 text-lg font-semibold text-card-foreground">{title}</h4>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
    
    {/* Hover glow effect */}
    <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none ring-1 ring-primary/20" />
  </div>
);

interface ValuePointProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ValuePoint = ({ icon, title, description }: ValuePointProps) => (
  <div className="flex gap-4 rounded-lg border border-border bg-card p-4">
    <div className="flex-shrink-0">{icon}</div>
    <div>
      <h4 className="font-semibold text-card-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

export default Index;

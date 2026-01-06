import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, FileText, CheckCircle, ArrowRight } from "lucide-react";

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
        
        <div className="container mx-auto px-6 py-20 text-center">
          <h2 className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
            Track Your SIWES Journey
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-primary-foreground/80 md:text-xl">
            The complete internship logbook and progress tracking system for students and supervisors.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="gap-2">
              Start Tracking <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <h3 className="mb-12 text-center text-3xl font-bold text-foreground">
          Everything You Need
        </h3>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<BookOpen className="h-8 w-8" />}
            title="Daily Logbook"
            description="Record your daily activities, skills learned, and challenges faced during your internship."
          />
          <FeatureCard
            icon={<Users className="h-8 w-8" />}
            title="Supervisor Feedback"
            description="Get valuable feedback and approval from your supervisors on your progress."
          />
          <FeatureCard
            icon={<FileText className="h-8 w-8" />}
            title="Document Uploads"
            description="Upload placement letters, reports, and certificates securely."
          />
          <FeatureCard
            icon={<CheckCircle className="h-8 w-8" />}
            title="Progress Tracking"
            description="Monitor your internship progress with visual dashboards and statistics."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted">
        <div className="container mx-auto px-6 py-16 text-center">
          <h3 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
            Ready to Get Started?
          </h3>
          <p className="mb-8 text-muted-foreground">
            Join students and supervisors already using TrackMySIWES.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              Create Your Account <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} TrackMySIWES. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="rounded-lg border border-border bg-card p-6 text-center transition-shadow hover:shadow-lg">
    <div className="mb-4 inline-flex rounded-full bg-primary/10 p-3 text-primary">
      {icon}
    </div>
    <h4 className="mb-2 text-lg font-semibold text-card-foreground">{title}</h4>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Index;

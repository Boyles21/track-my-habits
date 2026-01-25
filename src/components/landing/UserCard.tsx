import { CheckCircle } from "lucide-react";

interface UserCardProps {
  icon: React.ReactNode;
  title: string;
  features: string[];
  image?: string;
}

export const UserCard = ({ icon, title, features, image }: UserCardProps) => (
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

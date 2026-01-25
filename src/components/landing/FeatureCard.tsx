interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  image?: string;
  accentColor?: string;
}

export const FeatureCard = ({ icon, title, description, image, accentColor = "from-primary/20 to-primary/10" }: FeatureCardProps) => (
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

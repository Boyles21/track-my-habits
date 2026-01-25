interface MockupCardProps {
  image: string;
  title: string;
  caption: string;
  featured?: boolean;
}

export const MockupCard = ({ image, title, caption, featured = false }: MockupCardProps) => (
  <div className={`group relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 ${featured ? '' : ''}`}>
    {/* Image Container */}
    <div className={`relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted ${featured ? 'aspect-[16/10]' : 'aspect-[16/9]'}`}>
      <img 
        src={image} 
        alt={`${title} mockup`}
        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-60" />
    </div>
    
    {/* Caption */}
    <div className="relative p-6">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <h4 className="font-semibold text-card-foreground">{title}</h4>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{caption}</p>
    </div>
    
    {/* Decorative corner accent */}
    <div className="absolute right-0 top-0 h-20 w-20 bg-gradient-to-bl from-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
  </div>
);

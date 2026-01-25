interface ValuePointProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const ValuePoint = ({ icon, title, description }: ValuePointProps) => (
  <div className="flex gap-4 rounded-lg border border-border bg-card p-4">
    <div className="flex-shrink-0">{icon}</div>
    <div>
      <h4 className="font-semibold text-card-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

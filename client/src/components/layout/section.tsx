import React from "react";

export interface SectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, description, actions, className = "space-y-4", children }) => {
  return (
    <section className={className}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-xl font-semibold text-foreground">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
};

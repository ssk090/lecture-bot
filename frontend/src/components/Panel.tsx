import type { ReactNode } from 'react';

export function Panel({
  label,
  hint,
  className = '',
  children
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-bar">
        <span>{label}</span>
        {hint && <span className="panel-hint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

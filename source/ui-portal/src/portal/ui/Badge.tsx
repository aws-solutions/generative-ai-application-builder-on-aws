import * as React from 'react';
import { cn } from '@/portal/lib/cn';

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'blue' | 'green' }) {
  const variants: Record<string, string> = {
    default: 'bg-muted text-foreground',
    blue: 'bg-blue-600 text-white',
    green: 'bg-emerald-600 text-white'
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}



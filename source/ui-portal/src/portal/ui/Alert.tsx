import * as React from 'react';
import { cn } from '@/portal/lib/cn';

export function Alert({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'error' }) {
  const variants: Record<string, string> = {
    default: 'border-border bg-card text-foreground',
    error: 'border-red-600/30 bg-red-600/10 text-red-200'
  };

  return (
    <div
      role="alert"
      className={cn('rounded-md border px-4 py-3 text-sm', variants[variant], className)}
      {...props}
    />
  );
}



import * as React from 'react';
import { cn } from '@/portal/lib/cn';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background';

  const variants: Record<string, string> = {
    primary:
      'bg-primary text-primary-foreground hover:opacity-90 focus-visible:ring-primary',
    secondary:
      'bg-muted text-foreground hover:opacity-90 focus-visible:ring-muted',
    ghost: 'hover:bg-muted text-foreground focus-visible:ring-muted'
  };

  const sizes: Record<string, string> = {
    sm: 'h-9 px-3',
    md: 'h-10 px-4'
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}



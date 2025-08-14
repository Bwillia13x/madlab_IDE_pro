import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
} as const;

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', sizeMap[size], className)}
    />
  );
}

export function LoadingState({ 
  title = 'Loading...', 
  className 
}: { 
  title?: string; 
  className?: string; 
}) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="flex items-center space-x-2">
        <LoadingSpinner />
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
    </div>
  );
}
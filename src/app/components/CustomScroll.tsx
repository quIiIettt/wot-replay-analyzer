import type { ReactNode } from 'react';

type CustomScrollProps = {
  children: ReactNode;
  className?: string;
  enabled?: boolean;
};

export default function CustomScroll({ children, className = '', enabled = true }: CustomScrollProps) {
  return <div className={`${enabled ? 'custom-scroll' : ''} ${className}`.trim()}>{children}</div>;
}

import type { ReactNode, SelectHTMLAttributes } from 'react';

type CustomSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
};

export default function CustomSelect({ children, className = '', ...props }: CustomSelectProps) {
  return (
    <div className={`custom-select-shell ${className}`.trim()}>
      <select {...props} className="custom-select">
        {children}
      </select>
    </div>
  );
}

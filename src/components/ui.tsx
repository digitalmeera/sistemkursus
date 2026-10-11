import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ title, description, actions }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-[#1a2430]">{title}</h2>
      {description && <p className="mt-0.5 text-[13px] text-[#4b5a6a]">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`dm-card ${className}`}>{children}</div>;

export const Toast: React.FC<{ message: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-[#1a2430] bg-[#1a2430] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
      <span>{message}</span>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="p-10 text-center">
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-[#f0f3f6] text-[#8494a5]">
      {icon}
    </div>
    <h4 className="mt-3 text-sm font-semibold text-[#1a2430]">{title}</h4>
    <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#4b5a6a]">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export function StatusBadge({ value }: { value: string }) {
  const cls = value === 'Aktif' || value === 'Hadir' ? 'dm-badge dm-badge-active' : 'dm-badge dm-badge-muted';
  return <span className={cls}>{value}</span>;
}

/** Logo lembaga dengan fallback default — tahan terhadap URL Drive yang rusak. */
export const BrandLogo: React.FC<{
  src?: string;
  alt?: string;
  boxClassName?: string;
  imgClassName?: string;
}> = ({ src, alt = 'Logo', boxClassName = '', imgClassName = '' }) => {
  const [failed, setFailed] = React.useState(false);
  const useDefault = !src || failed;
  return (
    <span className={`flex items-center justify-center overflow-hidden ${boxClassName}`}>
      <img
        src={useDefault ? '/logo-digitalmeera.svg' : src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={useDefault ? undefined : () => setFailed(true)}
        className={`h-full w-full object-contain ${imgClassName}`}
      />
    </span>
  );
};
export const StudentPhoto: React.FC<{
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ src, name, size = 'sm', className = '' }) => {
  const [failed, setFailed] = React.useState(false);
  const dims = size === 'lg' ? 'h-24 w-20' : size === 'md' ? 'h-14 w-12' : 'h-9 w-8';
  const initials = (name || '??').trim().slice(0, 2).toUpperCase();
  return (
    <div
      className={`${dims} flex items-center justify-center overflow-hidden rounded-md border border-[#e3e9ef] bg-[#eef1f4] ${className}`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-[11px] font-semibold text-[#4b5a6a]">{initials}</span>
      )}
    </div>
  );
};

'use client';

import React from 'react';

interface FilterPillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function FilterPill({ label, active = false, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center whitespace-nowrap
        px-3.5 py-1.5 text-sm font-medium rounded-full border
        transition-colors duration-150 ease-in-out
        shrink-0 cursor-pointer
        ${
          active
            ? 'bg-accent-dim text-accent border-accent'
            : 'bg-transparent text-text-secondary border-border-subtle hover:border-border-default hover:text-text-primary'
        }
      `}
    >
      {label}
    </button>
  );
}

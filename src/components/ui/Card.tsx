'use client';

import React from 'react';

type CardPadding = 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: CardPadding;
}

const paddingClasses: Record<CardPadding, string> = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

export function Card({
  children,
  className = '',
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={`
        rounded-xl border border-border-subtle bg-bg-card shadow-card
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

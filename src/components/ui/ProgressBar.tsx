'use client';

import React from 'react';

type ProgressColor = 'accent' | 'success' | 'warning' | 'danger';
type ProgressSize = 'sm' | 'md';

interface ProgressBarProps {
  value: number; // 0 – 100
  color?: ProgressColor;
  size?: ProgressSize;
  className?: string;
}

const colorClasses: Record<ProgressColor, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

const sizeClasses: Record<ProgressSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

export function ProgressBar({
  value,
  color = 'accent',
  size = 'md',
  className = '',
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={`w-full rounded-full bg-bg-surface overflow-hidden ${sizeClasses[size]} ${className}`}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}

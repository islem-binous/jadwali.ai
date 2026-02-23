'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { SubstituteMatch } from '@/lib/substitute-matcher'

interface SubstituteMatchCardProps {
  match: SubstituteMatch
  onAssign: (teacherId: string) => void
  loading?: boolean
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-success'
  if (score >= 60) return 'text-warning'
  return 'text-danger'
}

function getScoreBg(score: number): string {
  if (score >= 85) return 'bg-success-dim border-success/20'
  if (score >= 60) return 'bg-warning-dim border-warning/20'
  return 'bg-danger-dim border-danger/20'
}

export function SubstituteMatchCard({ match, onAssign, loading }: SubstituteMatchCardProps) {
  const t = useTranslations()

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-4 transition hover:border-border-default">
      {/* Top: Score circle + teacher name + primary subject */}
      <div className="flex items-center gap-3">
        {/* Score circle */}
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${getScoreBg(match.matchScore)}`}
        >
          <span className={`text-sm font-bold ${getScoreColor(match.matchScore)}`}>
            {match.matchScore}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* Teacher avatar circle */}
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: match.teacherColor }}
            >
              {match.teacherName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <p className="truncate text-sm font-semibold text-text-primary">
              {match.teacherName}
            </p>
          </div>
          {match.primarySubject && (
            <Badge variant="accent" size="sm" className="mt-1">
              {match.primarySubject}
            </Badge>
          )}
        </div>

        <div className="text-right text-xs text-text-muted">
          {match.availableSlots}/{match.totalSlots}
          <br />
          <span className="text-[10px]">{t('absences.periods_affected')}</span>
        </div>
      </div>

      {/* Middle: reasons + warnings */}
      <div className="mt-3 space-y-1">
        {match.reasons.map((reason, i) => (
          <div key={`r-${i}`} className="flex items-center gap-2 text-xs text-success">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{reason}</span>
          </div>
        ))}
        {match.warnings.map((warning, i) => (
          <div key={`w-${i}`} className="flex items-center gap-2 text-xs text-warning">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{warning}</span>
          </div>
        ))}
      </div>

      {/* Bottom: Assign button */}
      <div className="mt-3">
        <Button
          size="sm"
          onClick={() => onAssign(match.teacherId)}
          loading={loading}
          className="w-full"
        >
          {t('absences.assign')}
        </Button>
      </div>
    </div>
  )
}

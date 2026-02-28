'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, Loader2, Crown, Shield, Briefcase, BookOpen, GraduationCap, X, AlertTriangle, Share2 } from 'lucide-react'

type SignupRole = 'DIRECTOR' | 'ADMIN' | 'STAFF' | 'TEACHER' | 'STUDENT'

type SchoolLookupResult = {
  id: string | null
  name: string
  slug: string
  hasDirector: boolean
  needsCreation?: boolean
  tunisianSchoolId?: string
  governorate?: string
  classes: { id: string; name: string; grade: string | null }[]
}

function SignupForm() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const { signUp } = useAuth()

  const initialRole = 'DIRECTOR' as SignupRole
  const [role, setRole] = useState<SignupRole>(initialRole)
  const [name, setName] = useState('')
  const [cin, setCin] = useState('')
  const [matricule, setMatricule] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // School lookup state (all roles)
  const [schoolLookup, setSchoolLookup] = useState<SchoolLookupResult | null>(null)
  const [schoolSearchResults, setSchoolSearchResults] = useState<SchoolLookupResult[]>([])
  const [showSchoolResults, setShowSchoolResults] = useState(false)
  const [searchingSchoolLookup, setSearchingSchoolLookup] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState('')
  const schoolSearchRef = useRef<HTMLDivElement>(null)
  const schoolDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchSchools = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSchoolSearchResults([])
      setShowSchoolResults(false)
      return
    }
    setSearchingSchoolLookup(true)
    try {
      const res = await fetch(`/api/school/lookup?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data: SchoolLookupResult[] = await res.json()
        setSchoolSearchResults(data)
        setShowSchoolResults(data.length > 0)
      }
    } catch {
      // Silently fail
    } finally {
      setSearchingSchoolLookup(false)
    }
  }, [])

  function handleSchoolSearchChange(value: string) {
    setSchoolCode(value)
    setSchoolLookup(null)
    setSelectedClassId('')
    if (schoolDebounceRef.current) clearTimeout(schoolDebounceRef.current)
    schoolDebounceRef.current = setTimeout(() => searchSchools(value), 300)
  }

  function handleSelectSchool(school: SchoolLookupResult) {
    setSchoolLookup(school)
    setSchoolCode(school.name)
    setShowSchoolResults(false)
    setSchoolSearchResults([])
    setSelectedClassId('')
  }

  function handleClearSchool() {
    setSchoolLookup(null)
    setSchoolCode('')
    setSelectedClassId('')
  }

  // Close school suggestions on outside click
  useEffect(() => {
    function handleClickOutsideSchool(e: MouseEvent) {
      if (schoolSearchRef.current && !schoolSearchRef.current.contains(e.target as Node)) {
        setShowSchoolResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutsideSchool)
    return () => document.removeEventListener('mousedown', handleClickOutsideSchool)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!schoolLookup) {
      setError(t('auth.school_not_found'))
      return
    }

    // Director cannot select a school that already has a director
    if (role === 'DIRECTOR' && schoolLookup.hasDirector) {
      setError(t('auth.school_already_registered'))
      return
    }

    if ((role === 'STAFF' || role === 'TEACHER') && !cin.trim()) {
      setError(t('auth.cin') + ' is required')
      return
    }

    if ((role === 'STAFF' || role === 'TEACHER' || role === 'STUDENT') && !matricule.trim()) {
      setError(t('auth.matricule') + ' is required')
      return
    }

    // Class is only required for STUDENT when school already exists (has classes)
    if (role === 'STUDENT' && !schoolLookup?.needsCreation && !selectedClassId) {
      setError(t('auth.select_class'))
      return
    }

    setLoading(true)

    try {
      const result = await signUp({
        email,
        password,
        name,
        language: locale.toUpperCase(),
        role,
        schoolName: role === 'DIRECTOR' ? schoolLookup?.name : undefined,
        tunisianSchoolId: schoolLookup?.tunisianSchoolId || undefined,
        schoolId: schoolLookup?.needsCreation ? undefined : schoolLookup?.id || undefined,
        classId: role === 'STUDENT' && selectedClassId ? selectedClassId : undefined,
        cin: cin || undefined,
        matricule: matricule || undefined,
      })

      if ('pendingActivation' in result) {
        router.push('/auth/pending-activation')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent'

  const roleOptions: { value: SignupRole; label: string; icon: typeof Shield }[] = [
    { value: 'DIRECTOR', label: t('auth.role_director'), icon: Crown },
    { value: 'ADMIN', label: t('auth.role_admin'), icon: Shield },
    { value: 'STAFF', label: t('auth.role_staff'), icon: Briefcase },
    { value: 'TEACHER', label: t('auth.role_teacher'), icon: BookOpen },
    { value: 'STUDENT', label: t('auth.role_student'), icon: GraduationCap },
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent shadow-accent-glow">
            <span className="font-display text-2xl font-bold text-white">S</span>
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-text-primary">
            {t('auth.sign_up')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t('app.tagline')}
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-border-subtle bg-bg-card p-6 shadow-card">
          {/* Role selector */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-text-secondary">
              {t('auth.select_role')}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {roleOptions.map((opt) => {
                const Icon = opt.icon
                const isSelected = role === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setRole(opt.value)
                      setError('')
                      setSchoolLookup(null)
                      setSchoolCode('')
                      setSelectedClassId('')
                      setCin('')
                      setMatricule('')
                      setSchoolSearchResults([])
                      setShowSchoolResults(false)
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition ${
                      isSelected
                        ? 'border-accent bg-accent-dim text-accent'
                        : 'border-border-default bg-bg-elevated text-text-secondary hover:bg-bg-surface'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-md bg-danger-dim p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text-secondary">
                {t('teachers.name')}
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Ahmed Benali"
              />
            </div>

            {/* School Search (all roles) */}
            <div>
                <label htmlFor="schoolCode" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  {t('auth.school_code')}
                </label>
                <div className="relative" ref={schoolSearchRef}>
                  {schoolLookup ? (
                    <div className="flex items-center gap-2 rounded-md border border-accent bg-accent-dim px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{schoolLookup.name}</p>
                        <p className="text-xs text-text-muted">
                          {schoolLookup.slug}
                          {schoolLookup.governorate ? ` — ${schoolLookup.governorate}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSchool}
                        className="shrink-0 text-text-muted hover:text-text-primary"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <input
                          id="schoolCode"
                          type="text"
                          value={schoolCode}
                          onChange={(e) => handleSchoolSearchChange(e.target.value)}
                          onFocus={() => schoolSearchResults.length > 0 && setShowSchoolResults(true)}
                          className={inputClass}
                          placeholder={t('auth.school_search_placeholder')}
                          autoComplete="off"
                        />
                        {searchingSchoolLookup && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-text-muted" />
                        )}
                      </div>
                      {showSchoolResults && schoolSearchResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border-default bg-bg-card shadow-lg">
                          {schoolSearchResults.map((school, idx) => {
                            const isDirectorBlocked = role === 'DIRECTOR' && school.hasDirector
                            return (
                              <button
                                key={school.id ?? `ts-${idx}`}
                                type="button"
                                disabled={isDirectorBlocked}
                                onClick={() => !isDirectorBlocked && handleSelectSchool(school)}
                                className={`flex w-full items-start gap-2 px-3 py-2 text-start transition ${
                                  isDirectorBlocked
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-bg-elevated cursor-pointer'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-text-primary truncate">{school.name}</p>
                                  <p className="text-xs text-text-muted">
                                    {school.slug}
                                    {school.governorate ? ` — ${school.governorate}` : ''}
                                  </p>
                                </div>
                                {isDirectorBlocked ? (
                                  <span className="shrink-0 rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                                    {t('auth.school_already_registered')}
                                  </span>
                                ) : !school.hasDirector && (
                                  <span className="shrink-0 flex items-center gap-1 rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                                    <AlertTriangle className="h-3 w-3" />
                                    {t('auth.no_director')}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* Unclaimed school warning (non-director roles only) */}
                {role !== 'DIRECTOR' && schoolLookup && !schoolLookup.hasDirector && (
                  <div className="mt-2 flex items-start gap-2 rounded-md bg-warning/10 border border-warning/20 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-warning">
                        {t('auth.school_no_director_warning')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const msg = t('auth.share_message', { url: window.location.origin })
                          navigator.clipboard.writeText(msg).catch(() => {})
                        }}
                        className="mt-1.5 flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover transition"
                      >
                        <Share2 className="h-3 w-3" />
                        {t('auth.share_with_director')}
                      </button>
                    </div>
                  </div>
                )}
            </div>

            {/* Staff/Teacher: CIN */}
            {(role === 'STAFF' || role === 'TEACHER') && (
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  {t('auth.cin')}
                </label>
                <input
                  type="text"
                  value={cin}
                  onChange={(e) => setCin(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                  placeholder={t('auth.cin_placeholder')}
                  required
                />
              </div>
            )}

            {/* Staff/Teacher/Student: Matricule */}
            {(role === 'STAFF' || role === 'TEACHER' || role === 'STUDENT') && (
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  {t('auth.matricule')}
                </label>
                <input
                  type="text"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                  placeholder={t('auth.matricule_placeholder')}
                  required
                />
              </div>
            )}

            {/* Student: Class picker (only when school already exists with classes) */}
            {role === 'STUDENT' && schoolLookup && !schoolLookup.needsCreation && schoolLookup.classes.length > 0 && (
              <div>
                <label htmlFor="classId" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  {t('auth.select_class')}
                </label>
                <select
                  id="classId"
                  required
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">{t('timetable.select_class')}</option>
                  {schoolLookup.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.grade ? ` (${c.grade})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder={role === 'DIRECTOR' ? 'admin@school.com' : 'name@email.com'}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-text-secondary">
                {t('auth.confirm_password')}
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            {/* Terms */}
            <p className="text-xs text-text-muted">
              {t('auth.terms_agree')}
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('auth.sign_up')}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-text-muted">
          {t('auth.have_account')}{' '}
          <Link href="/auth/login" className="font-medium text-accent transition hover:text-accent-hover">
            {t('auth.sign_in')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}

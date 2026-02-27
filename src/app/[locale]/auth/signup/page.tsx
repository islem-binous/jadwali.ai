'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, Loader2, Crown, Shield, Briefcase, BookOpen, GraduationCap, X, AlertTriangle, Share2 } from 'lucide-react'

type SignupRole = 'DIRECTOR' | 'ADMIN' | 'STAFF' | 'TEACHER' | 'STUDENT'

type TunisianSchoolResult = {
  id: string
  code: string
  nameAr: string
  governorate: string
  zipCode: string
  isClaimed?: boolean
}

type SchoolLookupResult = {
  id: string
  name: string
  slug: string
  hasDirector: boolean
  classes: { id: string; name: string; grade: string | null }[]
}

function SignupForm() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, signInWithGoogle } = useAuth()
  const isGoogleSignup = searchParams.get('google') === 'true'
  const oauthError = searchParams.get('error')

  // Restore role from URL param (preserved through Google OAuth redirect)
  const initialRole = (searchParams.get('role') as SignupRole) || 'DIRECTOR'
  const [role, setRole] = useState<SignupRole>(initialRole)
  const [name, setName] = useState('')
  const [cin, setCin] = useState('')
  const [matricule, setMatricule] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState(true)

  // Google signup state
  const [googleId, setGoogleId] = useState('')

  // Fetch public settings to know if Google OAuth is available
  useEffect(() => {
    fetch('/api/settings/public')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setGoogleEnabled(data.googleOAuthEnabled) })
      .catch(() => {})
  }, [])

  // Read Google pre-fill cookie on mount
  useEffect(() => {
    if (!isGoogleSignup) return
    try {
      const match = document.cookie
        .split('; ')
        .find((c) => c.startsWith('auth_result='))
      if (!match) return
      const value = decodeURIComponent(match.split('=')[1])
      // decodeURIComponent after atob to handle Unicode (Arabic names)
      const data = JSON.parse(decodeURIComponent(atob(value)))
      if (data.newUser) {
        setName(data.name || '')
        setEmail(data.email || '')
        setGoogleId(data.googleId || '')
      }
    } catch {
      // Ignore parse errors
    }
  }, [isGoogleSignup])

  // Tunisian school autocomplete state (for director)
  const [tunisianResults, setTunisianResults] = useState<TunisianSchoolResult[]>([])
  const [selectedTunisianSchool, setSelectedTunisianSchool] = useState<TunisianSchoolResult | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchingSchools, setSearchingSchools] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchTunisianSchools = useCallback(async (query: string) => {
    if (query.length < 2) {
      setTunisianResults([])
      setShowSuggestions(false)
      return
    }
    setSearchingSchools(true)
    try {
      const res = await fetch(`/api/schools/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data: TunisianSchoolResult[] = await res.json()
        setTunisianResults(data)
        setShowSuggestions(data.length > 0)
      }
    } catch {
      // Silently fail — user can still type manually
    } finally {
      setSearchingSchools(false)
    }
  }, [])

  function handleSchoolNameChange(value: string) {
    setSchoolName(value)
    setSelectedTunisianSchool(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchTunisianSchools(value), 300)
  }

  function handleSelectTunisianSchool(school: TunisianSchoolResult) {
    setSelectedTunisianSchool(school)
    setSchoolName(school.nameAr)
    setShowSuggestions(false)
    setTunisianResults([])
  }

  function handleClearTunisianSchool() {
    setSelectedTunisianSchool(null)
    setSchoolName('')
  }

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // School lookup state (for non-director roles)
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

    if (!googleId) {
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
    }

    if (role === 'DIRECTOR' && !schoolName.trim()) {
      setError('School name is required')
      return
    }

    if (role !== 'DIRECTOR' && !schoolLookup) {
      setError(t('auth.school_not_found'))
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

    if (role === 'STUDENT' && !selectedClassId) {
      setError(t('auth.select_class'))
      return
    }

    setLoading(true)

    try {
      await signUp({
        email,
        password: googleId ? undefined : password,
        name,
        language: locale.toUpperCase(),
        role,
        schoolName: role === 'DIRECTOR' ? schoolName : undefined,
        tunisianSchoolId: role === 'DIRECTOR' ? selectedTunisianSchool?.id : undefined,
        schoolId: schoolLookup?.id,
        classId: role === 'STUDENT' ? selectedClassId : undefined,
        googleId: googleId || undefined,
        cin: cin || undefined,
        matricule: matricule || undefined,
      })
      router.push('/dashboard')
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
                      setSelectedTunisianSchool(null)
                      setSchoolName('')
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

          {/* OAuth error */}
          {oauthError && (
            <div className="mb-4 rounded-md bg-danger-dim p-3 text-sm text-danger">
              {t(`auth.${oauthError}` as Parameters<typeof t>[0])}
            </div>
          )}

          {/* Google OAuth */}
          {googleEnabled && (
            <>
              <button
                type="button"
                onClick={() => signInWithGoogle('signup', role)}
                className="flex w-full items-center justify-center gap-3 rounded-md border border-border-default bg-bg-elevated px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-surface"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('auth.google')}
              </button>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border-subtle" />
                <span className="text-xs text-text-muted">{t('app.or')}</span>
                <div className="h-px flex-1 bg-border-subtle" />
              </div>
            </>
          )}

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

            {/* Director: School Name with autocomplete */}
            {role === 'DIRECTOR' && (
              <div>
                <label htmlFor="school" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  {t('auth.school_name')}
                </label>
                <div className="relative" ref={suggestionsRef}>
                  {selectedTunisianSchool ? (
                    <div className="flex items-center gap-2 rounded-md border border-accent bg-accent-dim px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{selectedTunisianSchool.nameAr}</p>
                        <p className="text-xs text-text-muted">{selectedTunisianSchool.governorate} — {selectedTunisianSchool.code}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearTunisianSchool}
                        className="shrink-0 text-text-muted hover:text-text-primary"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <input
                          id="school"
                          type="text"
                          required
                          value={schoolName}
                          onChange={(e) => handleSchoolNameChange(e.target.value)}
                          onFocus={() => tunisianResults.length > 0 && setShowSuggestions(true)}
                          className={inputClass}
                          placeholder={t('auth.school_name_placeholder')}
                          autoComplete="off"
                        />
                        {searchingSchools && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-text-muted" />
                        )}
                      </div>
                      {showSuggestions && tunisianResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border-default bg-bg-card shadow-lg">
                          {tunisianResults.map((school) => (
                            <button
                              key={school.id}
                              type="button"
                              disabled={school.isClaimed}
                              onClick={() => !school.isClaimed && handleSelectTunisianSchool(school)}
                              className={`flex w-full items-start gap-2 px-3 py-2 text-start transition ${
                                school.isClaimed
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'hover:bg-bg-elevated cursor-pointer'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-text-primary truncate">{school.nameAr}</p>
                                <p className="text-xs text-text-muted">{school.governorate} — {school.code}</p>
                              </div>
                              {school.isClaimed && (
                                <span className="shrink-0 rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                                  {t('auth.school_already_registered')}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Non-Director: School Search */}
            {role !== 'DIRECTOR' && (
              <div>
                <label htmlFor="schoolCode" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  {t('auth.school_code')}
                </label>
                <div className="relative" ref={schoolSearchRef}>
                  {schoolLookup ? (
                    <div className="flex items-center gap-2 rounded-md border border-accent bg-accent-dim px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{schoolLookup.name}</p>
                        <p className="text-xs text-text-muted">{schoolLookup.slug}</p>
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
                          {schoolSearchResults.map((school) => (
                            <button
                              key={school.id}
                              type="button"
                              onClick={() => handleSelectSchool(school)}
                              className="flex w-full items-start gap-2 px-3 py-2 text-start transition hover:bg-bg-elevated cursor-pointer"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-text-primary truncate">{school.name}</p>
                                <p className="text-xs text-text-muted">{school.slug}</p>
                              </div>
                              {!school.hasDirector && (
                                <span className="shrink-0 flex items-center gap-1 rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                                  <AlertTriangle className="h-3 w-3" />
                                  {t('auth.no_director')}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* Unclaimed school warning */}
                {schoolLookup && !schoolLookup.hasDirector && (
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
            )}

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

            {/* Student: Class picker */}
            {role === 'STUDENT' && schoolLookup && (
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
                readOnly={!!googleId}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputClass}${googleId ? ' opacity-60 cursor-not-allowed' : ''}`}
                placeholder={role === 'DIRECTOR' ? 'admin@school.com' : 'name@email.com'}
              />
            </div>

            {/* Password fields (hidden for Google signup) */}
            {!googleId && (
              <>
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
              </>
            )}

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

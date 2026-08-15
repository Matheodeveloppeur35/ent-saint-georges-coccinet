import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import './AdminPages.css'

type PeriodType =
  | 'trimester'
  | 'semester'
  | 'custom'

type DateFormat =
  | 'DD/MM/YYYY'
  | 'YYYY-MM-DD'

type SchoolSettings = {
  id: string
  singleton_key: boolean
  school_name: string
  school_type: string
  ent_name: string
  academic_year: string
  address_line1: string | null
  address_line2: string | null
  postal_code: string | null
  city: string | null
  country: string
  phone: string | null
  email: string | null
  website: string | null
  principal_first_name: string | null
  principal_last_name: string | null
  timezone: string
  locale: string
  date_format: DateFormat
  maintenance_mode: boolean
  maintenance_message: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

type AcademicPeriod = {
  id: string
  name: string
  academic_year: string
  period_type: PeriodType
  position: number
  starts_on: string
  ends_on: string
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

type ModuleSetting = {
  id: string
  module_key: string
  display_name: string
  description: string | null
  is_enabled: boolean
  position: number
  updated_by: string | null
  created_at: string
  updated_at: string
}

type SettingsPageProps = {
  onBack: () => void
}

const PERIOD_TYPE_LABELS: Record<
  PeriodType,
  string
> = {
  trimester: 'Trimestre',
  semester: 'Semestre',
  custom: 'Période personnalisée',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export function SettingsPage({
  onBack,
}: SettingsPageProps) {
  const [settingsId, setSettingsId] = useState('')

  const [schoolName, setSchoolName] = useState('')
  const [schoolType, setSchoolType] = useState('')
  const [entName, setEntName] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('France')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [principalFirstName, setPrincipalFirstName] =
    useState('')
  const [principalLastName, setPrincipalLastName] =
    useState('')
  const [timezone, setTimezone] =
    useState('Europe/Paris')
  const [locale, setLocale] = useState('fr-FR')
  const [dateFormat, setDateFormat] =
    useState<DateFormat>('DD/MM/YYYY')
  const [maintenanceMode, setMaintenanceMode] =
    useState(false)
  const [maintenanceMessage, setMaintenanceMessage] =
    useState('')

  const [periods, setPeriods] =
    useState<AcademicPeriod[]>([])
  const [modules, setModules] =
    useState<ModuleSetting[]>([])

  const [periodName, setPeriodName] = useState('')
  const [periodYear, setPeriodYear] =
    useState('2026-2027')
  const [periodType, setPeriodType] =
    useState<PeriodType>('trimester')
  const [periodPosition, setPeriodPosition] =
    useState('1')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [periodIsActive, setPeriodIsActive] =
    useState(true)

  const [isLoading, setIsLoading] = useState(true)
  const [isSavingSettings, setIsSavingSettings] =
    useState(false)
  const [isCreatingPeriod, setIsCreatingPeriod] =
    useState(false)
  const [updatingModuleId, setUpdatingModuleId] =
    useState<string | null>(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')

    const [
      settingsResult,
      periodsResult,
      modulesResult,
    ] = await Promise.all([
      supabase
        .from('school_settings')
        .select(`
          id,
          singleton_key,
          school_name,
          school_type,
          ent_name,
          academic_year,
          address_line1,
          address_line2,
          postal_code,
          city,
          country,
          phone,
          email,
          website,
          principal_first_name,
          principal_last_name,
          timezone,
          locale,
          date_format,
          maintenance_mode,
          maintenance_message,
          updated_by,
          created_at,
          updated_at
        `)
        .eq('singleton_key', true)
        .single(),

      supabase
        .from('academic_periods')
        .select(`
          id,
          name,
          academic_year,
          period_type,
          position,
          starts_on,
          ends_on,
          is_active,
          created_by,
          created_at,
          updated_at
        `)
        .order('academic_year', {
          ascending: false,
        })
        .order('position'),

      supabase
        .from('module_settings')
        .select(`
          id,
          module_key,
          display_name,
          description,
          is_enabled,
          position,
          updated_by,
          created_at,
          updated_at
        `)
        .order('position'),
    ])

    if (
      settingsResult.error ||
      periodsResult.error ||
      modulesResult.error
    ) {
      console.error(
        'Erreur de chargement des paramètres :',
        {
          settings: settingsResult.error,
          periods: periodsResult.error,
          modules: modulesResult.error,
        },
      )

      setError(
        'Les paramètres de l’ENT n’ont pas pu être chargés.',
      )
      setIsLoading(false)
      return
    }

    const loadedSettings =
      settingsResult.data as SchoolSettings

    setSettingsId(loadedSettings.id)
    setSchoolName(loadedSettings.school_name)
    setSchoolType(loadedSettings.school_type)
    setEntName(loadedSettings.ent_name)
    setAcademicYear(loadedSettings.academic_year)
    setAddressLine1(
      loadedSettings.address_line1 ?? '',
    )
    setAddressLine2(
      loadedSettings.address_line2 ?? '',
    )
    setPostalCode(loadedSettings.postal_code ?? '')
    setCity(loadedSettings.city ?? '')
    setCountry(loadedSettings.country)
    setPhone(loadedSettings.phone ?? '')
    setEmail(loadedSettings.email ?? '')
    setWebsite(loadedSettings.website ?? '')
    setPrincipalFirstName(
      loadedSettings.principal_first_name ?? '',
    )
    setPrincipalLastName(
      loadedSettings.principal_last_name ?? '',
    )
    setTimezone(loadedSettings.timezone)
    setLocale(loadedSettings.locale)
    setDateFormat(loadedSettings.date_format)
    setMaintenanceMode(
      loadedSettings.maintenance_mode,
    )
    setMaintenanceMessage(
      loadedSettings.maintenance_message ?? '',
    )

    setPeriodYear(loadedSettings.academic_year)

    setPeriods(
      (periodsResult.data ?? []) as AcademicPeriod[],
    )
    setModules(
      (modulesResult.data ?? []) as ModuleSetting[],
    )

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const activePeriodsCount = periods.filter(
    (period) => period.is_active,
  ).length

  const enabledModulesCount = modules.filter(
    (module) => module.is_enabled,
  ).length

  const disabledModulesCount =
    modules.length - enabledModulesCount

  const periodsByYear = useMemo(() => {
    const groups = new Map<
      string,
      AcademicPeriod[]
    >()

    for (const period of periods) {
      const existing = groups.get(
        period.academic_year,
      )

      if (existing) {
        existing.push(period)
      } else {
        groups.set(period.academic_year, [period])
      }
    }

    return Array.from(groups.entries()).sort(
      ([firstYear], [secondYear]) =>
        secondYear.localeCompare(firstYear, 'fr'),
    )
  }, [periods])

  async function getCurrentUserId() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error(
        'La session utilisateur est introuvable.',
      )
    }

    return user.id
  }

  async function handleSaveSettings(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const normalizedSchoolName = schoolName.trim()
    const normalizedSchoolType = schoolType.trim()
    const normalizedEntName = entName.trim()
    const normalizedAcademicYear =
      academicYear.trim()
    const normalizedCountry = country.trim()
    const normalizedTimezone = timezone.trim()
    const normalizedLocale = locale.trim()

    if (
      !normalizedSchoolName ||
      !normalizedSchoolType ||
      !normalizedEntName ||
      !normalizedAcademicYear ||
      !normalizedCountry ||
      !normalizedTimezone ||
      !normalizedLocale
    ) {
      setError(
        'Les informations principales de l’établissement sont obligatoires.',
      )
      return
    }

    if (
      maintenanceMode &&
      !maintenanceMessage.trim()
    ) {
      setError(
        'Un message est obligatoire lorsque le mode maintenance est actif.',
      )
      return
    }

    if (!settingsId) {
      setError(
        'La configuration générale est introuvable.',
      )
      return
    }

    setIsSavingSettings(true)

    try {
      const userId = await getCurrentUserId()

      const { error: updateError } = await supabase
        .from('school_settings')
        .update({
          school_name: normalizedSchoolName,
          school_type: normalizedSchoolType,
          ent_name: normalizedEntName,
          academic_year:
            normalizedAcademicYear,
          address_line1:
            addressLine1.trim() || null,
          address_line2:
            addressLine2.trim() || null,
          postal_code: postalCode.trim() || null,
          city: city.trim() || null,
          country: normalizedCountry,
          phone: phone.trim() || null,
          email: email.trim() || null,
          website: website.trim() || null,
          principal_first_name:
            principalFirstName.trim() || null,
          principal_last_name:
            principalLastName.trim() || null,
          timezone: normalizedTimezone,
          locale: normalizedLocale,
          date_format: dateFormat,
          maintenance_mode: maintenanceMode,
          maintenance_message: maintenanceMode
            ? maintenanceMessage.trim()
            : null,
          updated_by: userId,
        })
        .eq('id', settingsId)

      if (updateError) {
        throw new Error(
          `Les paramètres n’ont pas pu être enregistrés : ${updateError.message}`,
        )
      }

      setSuccess(
        'Les paramètres généraux ont été enregistrés.',
      )

      await loadData()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Les paramètres n’ont pas pu être enregistrés.',
      )
    } finally {
      setIsSavingSettings(false)
    }
  }

  async function handleCreatePeriod(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const normalizedName = periodName.trim()
    const normalizedYear = periodYear.trim()
    const parsedPosition = Number(periodPosition)

    if (!normalizedName || !normalizedYear) {
      setError(
        'Le nom et l’année scolaire sont obligatoires.',
      )
      return
    }

    if (
      !Number.isInteger(parsedPosition) ||
      parsedPosition <= 0
    ) {
      setError(
        'La position doit être un nombre entier supérieur à zéro.',
      )
      return
    }

    if (!periodStart || !periodEnd) {
      setError(
        'Les dates de début et de fin sont obligatoires.',
      )
      return
    }

    if (periodEnd < periodStart) {
      setError(
        'La date de fin doit être postérieure ou égale à la date de début.',
      )
      return
    }

    setIsCreatingPeriod(true)

    try {
      const userId = await getCurrentUserId()

      const { error: createError } = await supabase
        .from('academic_periods')
        .insert({
          name: normalizedName,
          academic_year: normalizedYear,
          period_type: periodType,
          position: parsedPosition,
          starts_on: periodStart,
          ends_on: periodEnd,
          is_active: periodIsActive,
          created_by: userId,
        })

      if (createError) {
        if (createError.code === '23505') {
          throw new Error(
            'Une période portant ce nom ou cette position existe déjà pour cette année.',
          )
        }

        throw new Error(
          `La période n’a pas pu être créée : ${createError.message}`,
        )
      }

      setPeriodName('')
      setPeriodType('trimester')
      setPeriodPosition('1')
      setPeriodStart('')
      setPeriodEnd('')
      setPeriodIsActive(true)

      setSuccess(
        'La période scolaire a été créée.',
      )

      await loadData()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'La période n’a pas pu être créée.',
      )
    } finally {
      setIsCreatingPeriod(false)
    }
  }

  async function togglePeriod(
    period: AcademicPeriod,
  ) {
    setError('')
    setSuccess('')

    const { error: updateError } = await supabase
      .from('academic_periods')
      .update({
        is_active: !period.is_active,
      })
      .eq('id', period.id)

    if (updateError) {
      setError(
        `La période n’a pas pu être modifiée : ${updateError.message}`,
      )
      return
    }

    setSuccess(
      period.is_active
        ? 'La période a été désactivée.'
        : 'La période a été activée.',
    )

    await loadData()
  }

  async function toggleModule(
    module: ModuleSetting,
  ) {
    setError('')
    setSuccess('')
    setUpdatingModuleId(module.id)

    try {
      const userId = await getCurrentUserId()

      const { error: updateError } = await supabase
        .from('module_settings')
        .update({
          is_enabled: !module.is_enabled,
          updated_by: userId,
        })
        .eq('id', module.id)

      if (updateError) {
        throw new Error(
          `Le module n’a pas pu être modifié : ${updateError.message}`,
        )
      }

      setSuccess(
        module.is_enabled
          ? `Le module « ${module.display_name} » a été désactivé.`
          : `Le module « ${module.display_name} » a été activé.`,
      )

      await loadData()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Le module n’a pas pu être modifié.',
      )
    } finally {
      setUpdatingModuleId(null)
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p>Administration</p>

          <h1>Paramètres</h1>

          <p>
            Configurez l’établissement, les périodes
            scolaires et les modules de l’ENT.
          </p>
        </div>

        <button
          className="admin-button"
          type="button"
          onClick={onBack}
        >
          ← Retour au tableau de bord
        </button>
      </header>

      <div className="admin-page-content">
        <section className="admin-stats-grid">
          <article className="admin-stat-card">
            <span>Année scolaire</span>
            <strong className="admin-stat-text">
              {academicYear || '—'}
            </strong>
          </article>

          <article className="admin-stat-card">
            <span>Périodes actives</span>
            <strong>{activePeriodsCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Modules actifs</span>
            <strong>{enabledModulesCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Modules désactivés</span>
            <strong>{disabledModulesCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Maintenance</span>
            <strong className="admin-stat-text">
              {maintenanceMode
                ? 'Activée'
                : 'Désactivée'}
            </strong>
          </article>
        </section>

        {isLoading && (
          <section className="admin-card">
            <p className="admin-empty">
              Chargement des paramètres…
            </p>
          </section>
        )}

        {!isLoading && (
          <>
            <section className="admin-card">
              <h2>Informations de l’établissement</h2>

              <form
                className="admin-form"
                onSubmit={handleSaveSettings}
              >
                <label htmlFor="settings-school-name">
                  Nom de l’établissement

                  <input
                    id="settings-school-name"
                    type="text"
                    value={schoolName}
                    onChange={(event) =>
                      setSchoolName(event.target.value)
                    }
                    required
                  />
                </label>

                <label htmlFor="settings-school-type">
                  Type d’établissement

                  <input
                    id="settings-school-type"
                    type="text"
                    value={schoolType}
                    onChange={(event) =>
                      setSchoolType(event.target.value)
                    }
                    required
                  />
                </label>

                <label htmlFor="settings-ent-name">
                  Nom de l’ENT

                  <input
                    id="settings-ent-name"
                    type="text"
                    value={entName}
                    onChange={(event) =>
                      setEntName(event.target.value)
                    }
                    required
                  />
                </label>

                <label htmlFor="settings-year">
                  Année scolaire active

                  <input
                    id="settings-year"
                    type="text"
                    value={academicYear}
                    onChange={(event) =>
                      setAcademicYear(
                        event.target.value,
                      )
                    }
                    placeholder="2026-2027"
                    required
                  />
                </label>

                <label htmlFor="settings-address-1">
                  Adresse

                  <input
                    id="settings-address-1"
                    type="text"
                    value={addressLine1}
                    onChange={(event) =>
                      setAddressLine1(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label htmlFor="settings-address-2">
                  Complément d’adresse

                  <input
                    id="settings-address-2"
                    type="text"
                    value={addressLine2}
                    onChange={(event) =>
                      setAddressLine2(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label htmlFor="settings-postal-code">
                  Code postal

                  <input
                    id="settings-postal-code"
                    type="text"
                    value={postalCode}
                    onChange={(event) =>
                      setPostalCode(event.target.value)
                    }
                  />
                </label>

                <label htmlFor="settings-city">
                  Ville

                  <input
                    id="settings-city"
                    type="text"
                    value={city}
                    onChange={(event) =>
                      setCity(event.target.value)
                    }
                  />
                </label>

                <label htmlFor="settings-country">
                  Pays

                  <input
                    id="settings-country"
                    type="text"
                    value={country}
                    onChange={(event) =>
                      setCountry(event.target.value)
                    }
                    required
                  />
                </label>

                <label htmlFor="settings-phone">
                  Téléphone

                  <input
                    id="settings-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                  />
                </label>

                <label htmlFor="settings-email">
                  E-mail

                  <input
                    id="settings-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                  />
                </label>

                <label htmlFor="settings-website">
                  Site internet

                  <input
                    id="settings-website"
                    type="url"
                    value={website}
                    onChange={(event) =>
                      setWebsite(event.target.value)
                    }
                    placeholder="https://..."
                  />
                </label>

                <label htmlFor="settings-principal-first">
                  Prénom de la direction

                  <input
                    id="settings-principal-first"
                    type="text"
                    value={principalFirstName}
                    onChange={(event) =>
                      setPrincipalFirstName(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label htmlFor="settings-principal-last">
                  Nom de la direction

                  <input
                    id="settings-principal-last"
                    type="text"
                    value={principalLastName}
                    onChange={(event) =>
                      setPrincipalLastName(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label htmlFor="settings-timezone">
                  Fuseau horaire

                  <input
                    id="settings-timezone"
                    type="text"
                    value={timezone}
                    onChange={(event) =>
                      setTimezone(event.target.value)
                    }
                    required
                  />
                </label>

                <label htmlFor="settings-locale">
                  Langue et région

                  <select
                    id="settings-locale"
                    value={locale}
                    onChange={(event) =>
                      setLocale(event.target.value)
                    }
                    required
                  >
                    <option value="fr-FR">
                      Français — France
                    </option>
                    <option value="fr-BE">
                      Français — Belgique
                    </option>
                    <option value="fr-CH">
                      Français — Suisse
                    </option>
                  </select>
                </label>

                <label htmlFor="settings-date-format">
                  Format des dates

                  <select
                    id="settings-date-format"
                    value={dateFormat}
                    onChange={(event) =>
                      setDateFormat(
                        event.target
                          .value as DateFormat,
                      )
                    }
                  >
                    <option value="DD/MM/YYYY">
                      JJ/MM/AAAA
                    </option>
                    <option value="YYYY-MM-DD">
                      AAAA-MM-JJ
                    </option>
                  </select>
                </label>

                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={maintenanceMode}
                    onChange={(event) =>
                      setMaintenanceMode(
                        event.target.checked,
                      )
                    }
                  />

                  <span>Activer le mode maintenance</span>
                </label>

                {maintenanceMode && (
                  <label
                    className="full-width"
                    htmlFor="maintenance-message"
                  >
                    Message de maintenance

                    <textarea
                      id="maintenance-message"
                      value={maintenanceMessage}
                      onChange={(event) =>
                        setMaintenanceMessage(
                          event.target.value,
                        )
                      }
                      rows={3}
                      placeholder="L’ENT est temporairement indisponible…"
                      required
                    />
                  </label>
                )}

                <div className="full-width">
                  <button
                    className="admin-button primary"
                    type="submit"
                    disabled={isSavingSettings}
                  >
                    {isSavingSettings
                      ? 'Enregistrement…'
                      : 'Enregistrer les paramètres'}
                  </button>
                </div>
              </form>
            </section>

            <section className="admin-card">
              <h2>Créer une période scolaire</h2>

              <form
                className="admin-form"
                onSubmit={handleCreatePeriod}
              >
                <label htmlFor="period-name">
                  Nom de la période

                  <input
                    id="period-name"
                    type="text"
                    value={periodName}
                    onChange={(event) =>
                      setPeriodName(event.target.value)
                    }
                    placeholder="Exemple : Trimestre 1"
                    required
                  />
                </label>

                <label htmlFor="period-year">
                  Année scolaire

                  <input
                    id="period-year"
                    type="text"
                    value={periodYear}
                    onChange={(event) =>
                      setPeriodYear(event.target.value)
                    }
                    required
                  />
                </label>

                <label htmlFor="period-type">
                  Type de période

                  <select
                    id="period-type"
                    value={periodType}
                    onChange={(event) =>
                      setPeriodType(
                        event.target
                          .value as PeriodType,
                      )
                    }
                  >
                    {Object.entries(
                      PERIOD_TYPE_LABELS,
                    ).map(([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label htmlFor="period-position">
                  Position

                  <input
                    id="period-position"
                    type="number"
                    min="1"
                    step="1"
                    value={periodPosition}
                    onChange={(event) =>
                      setPeriodPosition(
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label htmlFor="period-start">
                  Date de début

                  <input
                    id="period-start"
                    type="date"
                    value={periodStart}
                    onChange={(event) =>
                      setPeriodStart(
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label htmlFor="period-end">
                  Date de fin

                  <input
                    id="period-end"
                    type="date"
                    min={periodStart || undefined}
                    value={periodEnd}
                    onChange={(event) =>
                      setPeriodEnd(event.target.value)
                    }
                    required
                  />
                </label>

                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={periodIsActive}
                    onChange={(event) =>
                      setPeriodIsActive(
                        event.target.checked,
                      )
                    }
                  />

                  <span>Période active</span>
                </label>

                <div className="full-width">
                  <button
                    className="admin-button primary"
                    type="submit"
                    disabled={isCreatingPeriod}
                  >
                    {isCreatingPeriod
                      ? 'Création en cours…'
                      : 'Créer la période'}
                  </button>
                </div>
              </form>
            </section>

            <section className="admin-card">
              <div className="admin-section-heading">
                <div>
                  <h2>Périodes scolaires</h2>

                  <p>
                    {periods.length}{' '}
                    {periods.length > 1
                      ? 'périodes enregistrées'
                      : 'période enregistrée'}
                  </p>
                </div>
              </div>

              {periods.length === 0 && (
                <p className="admin-empty">
                  Aucune période scolaire n’est
                  enregistrée.
                </p>
              )}

              {periodsByYear.map(
                ([year, yearPeriods]) => (
                  <div
                    className="admin-period-group"
                    key={year}
                  >
                    <h3>{year}</h3>

                    <div className="admin-table-wrapper">
                      <table className="admin-table-common">
                        <thead>
                          <tr>
                            <th>Position</th>
                            <th>Période</th>
                            <th>Type</th>
                            <th>Dates</th>
                            <th>Statut</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {yearPeriods.map((period) => (
                            <tr key={period.id}>
                              <td>
                                <span className="admin-badge blue">
                                  {period.position}
                                </span>
                              </td>

                              <td>
                                <strong>
                                  {period.name}
                                </strong>
                              </td>

                              <td>
                                {
                                  PERIOD_TYPE_LABELS[
                                    period.period_type
                                  ]
                                }
                              </td>

                              <td>
                                {formatDate(
                                  period.starts_on,
                                )}
                                {' – '}
                                {formatDate(
                                  period.ends_on,
                                )}
                              </td>

                              <td>
                                <span
                                  className={
                                    period.is_active
                                      ? 'admin-badge green'
                                      : 'admin-badge orange'
                                  }
                                >
                                  {period.is_active
                                    ? 'Active'
                                    : 'Inactive'}
                                </span>
                              </td>

                              <td>
                                <button
                                  className="admin-button"
                                  type="button"
                                  onClick={() =>
                                    void togglePeriod(
                                      period,
                                    )
                                  }
                                >
                                  {period.is_active
                                    ? 'Désactiver'
                                    : 'Activer'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ),
              )}
            </section>

            <section className="admin-card">
              <div className="admin-section-heading">
                <div>
                  <h2>Modules de l’ENT</h2>

                  <p>
                    Activez ou désactivez les services
                    disponibles.
                  </p>
                </div>
              </div>

              <div className="admin-settings-modules">
                {modules.map((module) => (
                  <article
                    className="admin-settings-module"
                    key={module.id}
                  >
                    <div>
                      <span className="admin-settings-module-position">
                        {module.position}
                      </span>

                      <h3>{module.display_name}</h3>

                      <p>
                        {module.description ||
                          'Aucune description.'}
                      </p>
                    </div>

                    <div className="admin-settings-module-footer">
                      <span
                        className={
                          module.is_enabled
                            ? 'admin-badge green'
                            : 'admin-badge orange'
                        }
                      >
                        {module.is_enabled
                          ? 'Activé'
                          : 'Désactivé'}
                      </span>

                      <button
                        className="admin-button"
                        type="button"
                        disabled={
                          updatingModuleId === module.id
                        }
                        onClick={() =>
                          void toggleModule(module)
                        }
                      >
                        {updatingModuleId === module.id
                          ? 'Modification…'
                          : module.is_enabled
                            ? 'Désactiver'
                            : 'Activer'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {success && (
          <p
            className="admin-message success"
            role="status"
          >
            {success}
          </p>
        )}

        {error && (
          <p
            className="admin-message error"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </main>
  )
}

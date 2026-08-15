import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import './AdminPages.css'

type InternshipStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

type ConventionStatus =
  | 'not_started'
  | 'preparing'
  | 'sent'
  | 'signed'
  | 'refused'

type ReportStatus =
  | 'not_required'
  | 'expected'
  | 'submitted'
  | 'validated'
  | 'late'

type Company = {
  id: string
  name: string
  registration_number: string | null
  activity_sector: string | null
  address_line1: string | null
  address_line2: string | null
  postal_code: string | null
  city: string | null
  country: string
  phone: string | null
  email: string | null
  website: string | null
  contact_first_name: string | null
  contact_last_name: string | null
  contact_job_title: string | null
  contact_phone: string | null
  contact_email: string | null
  notes: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

type Student = {
  id: string
  student_number: string
  first_name: string
  last_name: string
  class_id: string | null
  is_active: boolean
}

type Teacher = {
  id: string
  employee_number: string
  first_name: string
  last_name: string
  email: string | null
  is_active: boolean
}

type SchoolClass = {
  id: string
  name: string
  school_year: string
}

type Internship = {
  id: string
  student_id: string
  company_id: string
  teacher_id: string | null
  title: string
  description: string | null
  start_date: string
  end_date: string
  academic_year: string
  status: InternshipStatus
  company_tutor_first_name: string | null
  company_tutor_last_name: string | null
  company_tutor_job_title: string | null
  company_tutor_email: string | null
  company_tutor_phone: string | null
  convention_status: ConventionStatus
  convention_signed_at: string | null
  objectives: string | null
  student_report_status: ReportStatus
  teacher_comment: string | null
  company_evaluation: string | null
  final_grade: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

type InternshipView = Internship & {
  studentName: string
  studentNumber: string
  className: string
  companyName: string
  companyCity: string
  teacherName: string
}

type InternshipsPageProps = {
  onBack: () => void
}

const INTERNSHIP_STATUS_LABELS: Record<
  InternshipStatus,
  string
> = {
  planned: 'Planifié',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

const CONVENTION_STATUS_LABELS: Record<
  ConventionStatus,
  string
> = {
  not_started: 'Non commencée',
  preparing: 'En préparation',
  sent: 'Envoyée',
  signed: 'Signée',
  refused: 'Refusée',
}

const REPORT_STATUS_LABELS: Record<
  ReportStatus,
  string
> = {
  not_required: 'Non requis',
  expected: 'Attendu',
  submitted: 'Remis',
  validated: 'Validé',
  late: 'En retard',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value)
}

export function InternshipsPage({
  onBack,
}: InternshipsPageProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [internships, setInternships] = useState<
    Internship[]
  >([])
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])

  const [companyName, setCompanyName] = useState('')
  const [registrationNumber, setRegistrationNumber] =
    useState('')
  const [activitySector, setActivitySector] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('France')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [contactFirstName, setContactFirstName] =
    useState('')
  const [contactLastName, setContactLastName] = useState('')
  const [contactJobTitle, setContactJobTitle] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [companyNotes, setCompanyNotes] = useState('')

  const [studentId, setStudentId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [internshipTitle, setInternshipTitle] = useState('')
  const [internshipDescription, setInternshipDescription] =
    useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [academicYear, setAcademicYear] =
    useState('2026-2027')
  const [internshipStatus, setInternshipStatus] =
    useState<InternshipStatus>('planned')
  const [tutorFirstName, setTutorFirstName] = useState('')
  const [tutorLastName, setTutorLastName] = useState('')
  const [tutorJobTitle, setTutorJobTitle] = useState('')
  const [tutorEmail, setTutorEmail] = useState('')
  const [tutorPhone, setTutorPhone] = useState('')
  const [conventionStatus, setConventionStatus] =
    useState<ConventionStatus>('not_started')
  const [conventionSignedAt, setConventionSignedAt] =
    useState('')
  const [objectives, setObjectives] = useState('')
  const [reportStatus, setReportStatus] =
    useState<ReportStatus>('not_required')
  const [teacherComment, setTeacherComment] = useState('')
  const [companyEvaluation, setCompanyEvaluation] =
    useState('')
  const [finalGrade, setFinalGrade] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<'ALL' | InternshipStatus>('ALL')
  const [classFilter, setClassFilter] = useState('ALL')
  const [companyFilter, setCompanyFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')

  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingCompany, setIsCreatingCompany] =
    useState(false)
  const [isCreatingInternship, setIsCreatingInternship] =
    useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')

    const [
      companiesResult,
      internshipsResult,
      studentsResult,
      teachersResult,
      classesResult,
    ] = await Promise.all([
      supabase
        .from('companies')
        .select(`
          id,
          name,
          registration_number,
          activity_sector,
          address_line1,
          address_line2,
          postal_code,
          city,
          country,
          phone,
          email,
          website,
          contact_first_name,
          contact_last_name,
          contact_job_title,
          contact_phone,
          contact_email,
          notes,
          is_active,
          created_by,
          created_at,
          updated_at
        `)
        .order('name'),

      supabase
        .from('internships')
        .select(`
          id,
          student_id,
          company_id,
          teacher_id,
          title,
          description,
          start_date,
          end_date,
          academic_year,
          status,
          company_tutor_first_name,
          company_tutor_last_name,
          company_tutor_job_title,
          company_tutor_email,
          company_tutor_phone,
          convention_status,
          convention_signed_at,
          objectives,
          student_report_status,
          teacher_comment,
          company_evaluation,
          final_grade,
          created_by,
          created_at,
          updated_at
        `)
        .order('start_date', { ascending: false }),

      supabase
        .from('students')
        .select(`
          id,
          student_number,
          first_name,
          last_name,
          class_id,
          is_active
        `)
        .eq('is_active', true)
        .order('last_name')
        .order('first_name'),

      supabase
        .from('teachers')
        .select(`
          id,
          employee_number,
          first_name,
          last_name,
          email,
          is_active
        `)
        .eq('is_active', true)
        .order('last_name')
        .order('first_name'),

      supabase
        .from('classes')
        .select('id, name, school_year')
        .eq('is_active', true)
        .order('name'),
    ])

    if (
      companiesResult.error ||
      internshipsResult.error ||
      studentsResult.error ||
      teachersResult.error ||
      classesResult.error
    ) {
      console.error(
        'Erreur de chargement des stages :',
        {
          companies: companiesResult.error,
          internships: internshipsResult.error,
          students: studentsResult.error,
          teachers: teachersResult.error,
          classes: classesResult.error,
        },
      )

      setError(
        'Les données des entreprises et stages n’ont pas pu être chargées.',
      )
      setIsLoading(false)
      return
    }

    setCompanies(
      (companiesResult.data ?? []) as Company[],
    )
    setInternships(
      (internshipsResult.data ?? []) as Internship[],
    )
    setStudents(
      (studentsResult.data ?? []) as Student[],
    )
    setTeachers(
      (teachersResult.data ?? []) as Teacher[],
    )
    setClasses(
      (classesResult.data ?? []) as SchoolClass[],
    )

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const companyMap = useMemo(
    () =>
      new Map(
        companies.map((company) => [
          company.id,
          company,
        ]),
      ),
    [companies],
  )

  const studentMap = useMemo(
    () =>
      new Map(
        students.map((student) => [
          student.id,
          student,
        ]),
      ),
    [students],
  )

  const teacherMap = useMemo(
    () =>
      new Map(
        teachers.map((teacher) => [
          teacher.id,
          teacher,
        ]),
      ),
    [teachers],
  )

  const classMap = useMemo(
    () =>
      new Map(
        classes.map((schoolClass) => [
          schoolClass.id,
          schoolClass,
        ]),
      ),
    [classes],
  )

  const internshipViews = useMemo<InternshipView[]>(
    () =>
      internships.map((internship) => {
        const student = studentMap.get(
          internship.student_id,
        )
        const company = companyMap.get(
          internship.company_id,
        )
        const teacher = internship.teacher_id
          ? teacherMap.get(internship.teacher_id)
          : null
        const schoolClass = student?.class_id
          ? classMap.get(student.class_id)
          : null

        return {
          ...internship,
          studentName: student
            ? `${student.last_name} ${student.first_name}`
            : 'Élève introuvable',
          studentNumber:
            student?.student_number ?? '—',
          className:
            schoolClass?.name ?? 'Non affecté',
          companyName:
            company?.name ?? 'Entreprise introuvable',
          companyCity: company?.city ?? '',
          teacherName: teacher
            ? `${teacher.last_name} ${teacher.first_name}`
            : 'Non attribué',
        }
      }),
    [
      internships,
      studentMap,
      companyMap,
      teacherMap,
      classMap,
    ],
  )

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          internshipViews.map(
            (internship) =>
              internship.academic_year,
          ),
        ),
      ).sort((a, b) => b.localeCompare(a, 'fr')),
    [internshipViews],
  )

  const filteredInternships = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase('fr')

    return internshipViews.filter((internship) => {
      const searchableText = [
        internship.title,
        internship.description ?? '',
        internship.studentName,
        internship.studentNumber,
        internship.className,
        internship.companyName,
        internship.companyCity,
        internship.teacherName,
        internship.objectives ?? '',
        internship.teacher_comment ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase('fr')

      const matchesSearch =
        normalizedSearch === '' ||
        searchableText.includes(normalizedSearch)

      const matchesStatus =
        statusFilter === 'ALL' ||
        internship.status === statusFilter

      const matchesClass =
        classFilter === 'ALL' ||
        internship.className === classFilter

      const matchesCompany =
        companyFilter === 'ALL' ||
        internship.company_id === companyFilter

      const matchesYear =
        yearFilter === 'ALL' ||
        internship.academic_year === yearFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesClass &&
        matchesCompany &&
        matchesYear
      )
    })
  }, [
    internshipViews,
    search,
    statusFilter,
    classFilter,
    companyFilter,
    yearFilter,
  ])

  const plannedCount = internshipViews.filter(
    (internship) => internship.status === 'planned',
  ).length

  const inProgressCount = internshipViews.filter(
    (internship) => internship.status === 'in_progress',
  ).length

  const completedCount = internshipViews.filter(
    (internship) => internship.status === 'completed',
  ).length

  const signedConventionCount =
    internshipViews.filter(
      (internship) =>
        internship.convention_status === 'signed',
    ).length

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

  async function handleCreateCompany(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const normalizedName = companyName.trim()
    const normalizedCountry = country.trim()

    if (!normalizedName) {
      setError(
        'Le nom de l’entreprise est obligatoire.',
      )
      return
    }

    if (!normalizedCountry) {
      setError('Le pays est obligatoire.')
      return
    }

    setIsCreatingCompany(true)

    try {
      const userId = await getCurrentUserId()

      const { error: createError } = await supabase
        .from('companies')
        .insert({
          name: normalizedName,
          registration_number:
            registrationNumber.trim() || null,
          activity_sector:
            activitySector.trim() || null,
          address_line1:
            addressLine1.trim() || null,
          postal_code: postalCode.trim() || null,
          city: city.trim() || null,
          country: normalizedCountry,
          phone: companyPhone.trim() || null,
          email: companyEmail.trim() || null,
          website: website.trim() || null,
          contact_first_name:
            contactFirstName.trim() || null,
          contact_last_name:
            contactLastName.trim() || null,
          contact_job_title:
            contactJobTitle.trim() || null,
          contact_phone:
            contactPhone.trim() || null,
          contact_email:
            contactEmail.trim() || null,
          notes: companyNotes.trim() || null,
          created_by: userId,
        })

      if (createError) {
        if (createError.code === '23505') {
          throw new Error(
            'Ce numéro d’immatriculation est déjà utilisé.',
          )
        }

        throw new Error(
          `L’entreprise n’a pas pu être créée : ${createError.message}`,
        )
      }

      setCompanyName('')
      setRegistrationNumber('')
      setActivitySector('')
      setAddressLine1('')
      setPostalCode('')
      setCity('')
      setCountry('France')
      setCompanyPhone('')
      setCompanyEmail('')
      setWebsite('')
      setContactFirstName('')
      setContactLastName('')
      setContactJobTitle('')
      setContactPhone('')
      setContactEmail('')
      setCompanyNotes('')

      setSuccess(
        'L’entreprise a été créée avec succès.',
      )

      await loadData()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'L’entreprise n’a pas pu être créée.',
      )
    } finally {
      setIsCreatingCompany(false)
    }
  }

  async function handleCreateInternship(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const normalizedTitle = internshipTitle.trim()
    const normalizedYear = academicYear.trim()

    if (!studentId || !companyId) {
      setError(
        'L’élève et l’entreprise sont obligatoires.',
      )
      return
    }

    if (!normalizedTitle) {
      setError('Le titre du stage est obligatoire.')
      return
    }

    if (!startDate || !endDate) {
      setError(
        'Les dates de début et de fin sont obligatoires.',
      )
      return
    }

    if (endDate < startDate) {
      setError(
        'La date de fin doit être postérieure ou égale à la date de début.',
      )
      return
    }

    if (!normalizedYear) {
      setError('L’année scolaire est obligatoire.')
      return
    }

    const parsedFinalGrade =
      finalGrade.trim() === ''
        ? null
        : Number(finalGrade)

    if (
      parsedFinalGrade !== null &&
      (!Number.isFinite(parsedFinalGrade) ||
        parsedFinalGrade < 0 ||
        parsedFinalGrade > 20)
    ) {
      setError(
        'La note finale doit être comprise entre 0 et 20.',
      )
      return
    }

    if (
      conventionStatus === 'signed' &&
      !conventionSignedAt
    ) {
      setError(
        'La date de signature est obligatoire pour une convention signée.',
      )
      return
    }

    setIsCreatingInternship(true)

    try {
      const userId = await getCurrentUserId()

      const { error: createError } = await supabase
        .from('internships')
        .insert({
          student_id: studentId,
          company_id: companyId,
          teacher_id: teacherId || null,
          title: normalizedTitle,
          description:
            internshipDescription.trim() || null,
          start_date: startDate,
          end_date: endDate,
          academic_year: normalizedYear,
          status: internshipStatus,
          company_tutor_first_name:
            tutorFirstName.trim() || null,
          company_tutor_last_name:
            tutorLastName.trim() || null,
          company_tutor_job_title:
            tutorJobTitle.trim() || null,
          company_tutor_email:
            tutorEmail.trim() || null,
          company_tutor_phone:
            tutorPhone.trim() || null,
          convention_status: conventionStatus,
          convention_signed_at:
            conventionStatus === 'signed'
              ? conventionSignedAt
              : null,
          objectives: objectives.trim() || null,
          student_report_status: reportStatus,
          teacher_comment:
            teacherComment.trim() || null,
          company_evaluation:
            companyEvaluation.trim() || null,
          final_grade: parsedFinalGrade,
          created_by: userId,
        })

      if (createError) {
        if (createError.code === '23505') {
          throw new Error(
            'Un stage existe déjà pour cet élève sur cette période.',
          )
        }

        throw new Error(
          `Le stage n’a pas pu être créé : ${createError.message}`,
        )
      }

      setStudentId('')
      setCompanyId('')
      setTeacherId('')
      setInternshipTitle('')
      setInternshipDescription('')
      setStartDate('')
      setEndDate('')
      setAcademicYear('2026-2027')
      setInternshipStatus('planned')
      setTutorFirstName('')
      setTutorLastName('')
      setTutorJobTitle('')
      setTutorEmail('')
      setTutorPhone('')
      setConventionStatus('not_started')
      setConventionSignedAt('')
      setObjectives('')
      setReportStatus('not_required')
      setTeacherComment('')
      setCompanyEvaluation('')
      setFinalGrade('')

      setSuccess(
        'Le stage a été créé avec succès.',
      )

      await loadData()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Le stage n’a pas pu être créé.',
      )
    } finally {
      setIsCreatingInternship(false)
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p>Administration</p>

          <h1>Entreprises et stages</h1>

          <p>
            Gérez les entreprises partenaires, les
            conventions et le suivi des stages.
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
            <span>Entreprises</span>
            <strong>{companies.length}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Stages planifiés</span>
            <strong>{plannedCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Stages en cours</span>
            <strong>{inProgressCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Stages terminés</span>
            <strong>{completedCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Conventions signées</span>
            <strong>{signedConventionCount}</strong>
          </article>
        </section>

        <section className="admin-card">
          <h2>Ajouter une entreprise</h2>

          <form
            className="admin-form"
            onSubmit={handleCreateCompany}
          >
            <label htmlFor="company-name">
              Nom de l’entreprise

              <input
                id="company-name"
                type="text"
                value={companyName}
                onChange={(event) =>
                  setCompanyName(event.target.value)
                }
                placeholder="Exemple : Atelier Martin"
                maxLength={150}
                required
              />
            </label>

            <label htmlFor="company-registration">
              Numéro d’immatriculation

              <input
                id="company-registration"
                type="text"
                value={registrationNumber}
                onChange={(event) =>
                  setRegistrationNumber(
                    event.target.value,
                  )
                }
                placeholder="SIRET ou identifiant"
              />
            </label>

            <label htmlFor="company-sector">
              Secteur d’activité

              <input
                id="company-sector"
                type="text"
                value={activitySector}
                onChange={(event) =>
                  setActivitySector(event.target.value)
                }
                placeholder="Exemple : Informatique"
              />
            </label>

            <label htmlFor="company-address">
              Adresse

              <input
                id="company-address"
                type="text"
                value={addressLine1}
                onChange={(event) =>
                  setAddressLine1(event.target.value)
                }
                placeholder="Numéro et voie"
              />
            </label>

            <label htmlFor="company-postal-code">
              Code postal

              <input
                id="company-postal-code"
                type="text"
                value={postalCode}
                onChange={(event) =>
                  setPostalCode(event.target.value)
                }
              />
            </label>

            <label htmlFor="company-city">
              Ville

              <input
                id="company-city"
                type="text"
                value={city}
                onChange={(event) =>
                  setCity(event.target.value)
                }
              />
            </label>

            <label htmlFor="company-country">
              Pays

              <input
                id="company-country"
                type="text"
                value={country}
                onChange={(event) =>
                  setCountry(event.target.value)
                }
                required
              />
            </label>

            <label htmlFor="company-phone">
              Téléphone

              <input
                id="company-phone"
                type="tel"
                value={companyPhone}
                onChange={(event) =>
                  setCompanyPhone(event.target.value)
                }
              />
            </label>

            <label htmlFor="company-email">
              E-mail

              <input
                id="company-email"
                type="email"
                value={companyEmail}
                onChange={(event) =>
                  setCompanyEmail(event.target.value)
                }
              />
            </label>

            <label htmlFor="company-website">
              Site internet

              <input
                id="company-website"
                type="url"
                value={website}
                onChange={(event) =>
                  setWebsite(event.target.value)
                }
                placeholder="https://..."
              />
            </label>

            <label htmlFor="contact-first-name">
              Prénom du contact

              <input
                id="contact-first-name"
                type="text"
                value={contactFirstName}
                onChange={(event) =>
                  setContactFirstName(
                    event.target.value,
                  )
                }
              />
            </label>

            <label htmlFor="contact-last-name">
              Nom du contact

              <input
                id="contact-last-name"
                type="text"
                value={contactLastName}
                onChange={(event) =>
                  setContactLastName(
                    event.target.value,
                  )
                }
              />
            </label>

            <label htmlFor="contact-job-title">
              Fonction du contact

              <input
                id="contact-job-title"
                type="text"
                value={contactJobTitle}
                onChange={(event) =>
                  setContactJobTitle(
                    event.target.value,
                  )
                }
              />
            </label>

            <label htmlFor="contact-phone">
              Téléphone du contact

              <input
                id="contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(event) =>
                  setContactPhone(event.target.value)
                }
              />
            </label>

            <label htmlFor="contact-email">
              E-mail du contact

              <input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(event) =>
                  setContactEmail(event.target.value)
                }
              />
            </label>

            <label
              className="full-width"
              htmlFor="company-notes"
            >
              Notes

              <textarea
                id="company-notes"
                value={companyNotes}
                onChange={(event) =>
                  setCompanyNotes(event.target.value)
                }
                rows={3}
                placeholder="Informations complémentaires…"
              />
            </label>

            <div className="full-width">
              <button
                className="admin-button primary"
                type="submit"
                disabled={isCreatingCompany}
              >
                {isCreatingCompany
                  ? 'Création en cours…'
                  : 'Ajouter l’entreprise'}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-card">
          <h2>Créer un stage</h2>

          {(!students.length || !companies.length) &&
            !isLoading && (
              <p className="admin-message warning">
                Un élève et une entreprise active sont
                nécessaires pour créer un stage.
              </p>
            )}

          <form
            className="admin-form"
            onSubmit={handleCreateInternship}
          >
            <label htmlFor="internship-student">
              Élève

              <select
                id="internship-student"
                value={studentId}
                onChange={(event) =>
                  setStudentId(event.target.value)
                }
                disabled={students.length === 0}
                required
              >
                <option value="">
                  Choisir un élève
                </option>

                {students.map((student) => (
                  <option
                    key={student.id}
                    value={student.id}
                  >
                    {student.last_name}{' '}
                    {student.first_name} —{' '}
                    {student.student_number}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="internship-company">
              Entreprise

              <select
                id="internship-company"
                value={companyId}
                onChange={(event) =>
                  setCompanyId(event.target.value)
                }
                disabled={companies.length === 0}
                required
              >
                <option value="">
                  Choisir une entreprise
                </option>

                {companies
                  .filter((company) => company.is_active)
                  .map((company) => (
                    <option
                      key={company.id}
                      value={company.id}
                    >
                      {company.name}
                      {company.city
                        ? ` — ${company.city}`
                        : ''}
                    </option>
                  ))}
              </select>
            </label>

            <label htmlFor="internship-teacher">
              Professeur référent

              <select
                id="internship-teacher"
                value={teacherId}
                onChange={(event) =>
                  setTeacherId(event.target.value)
                }
              >
                <option value="">
                  Aucun professeur attribué
                </option>

                {teachers.map((teacher) => (
                  <option
                    key={teacher.id}
                    value={teacher.id}
                  >
                    {teacher.last_name}{' '}
                    {teacher.first_name}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="internship-title">
              Intitulé du stage

              <input
                id="internship-title"
                type="text"
                value={internshipTitle}
                onChange={(event) =>
                  setInternshipTitle(
                    event.target.value,
                  )
                }
                placeholder="Exemple : Découverte du développement web"
                required
              />
            </label>

            <label htmlFor="internship-start">
              Date de début

              <input
                id="internship-start"
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
                required
              />
            </label>

            <label htmlFor="internship-end">
              Date de fin

              <input
                id="internship-end"
                type="date"
                value={endDate}
                onChange={(event) =>
                  setEndDate(event.target.value)
                }
                min={startDate || undefined}
                required
              />
            </label>

            <label htmlFor="internship-year">
              Année scolaire

              <input
                id="internship-year"
                type="text"
                value={academicYear}
                onChange={(event) =>
                  setAcademicYear(event.target.value)
                }
                required
              />
            </label>

            <label htmlFor="internship-status">
              Statut du stage

              <select
                id="internship-status"
                value={internshipStatus}
                onChange={(event) =>
                  setInternshipStatus(
                    event.target
                      .value as InternshipStatus,
                  )
                }
              >
                {Object.entries(
                  INTERNSHIP_STATUS_LABELS,
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="tutor-first-name">
              Prénom du tuteur

              <input
                id="tutor-first-name"
                type="text"
                value={tutorFirstName}
                onChange={(event) =>
                  setTutorFirstName(
                    event.target.value,
                  )
                }
              />
            </label>

            <label htmlFor="tutor-last-name">
              Nom du tuteur

              <input
                id="tutor-last-name"
                type="text"
                value={tutorLastName}
                onChange={(event) =>
                  setTutorLastName(
                    event.target.value,
                  )
                }
              />
            </label>

            <label htmlFor="tutor-job-title">
              Fonction du tuteur

              <input
                id="tutor-job-title"
                type="text"
                value={tutorJobTitle}
                onChange={(event) =>
                  setTutorJobTitle(event.target.value)
                }
              />
            </label>

            <label htmlFor="tutor-email">
              E-mail du tuteur

              <input
                id="tutor-email"
                type="email"
                value={tutorEmail}
                onChange={(event) =>
                  setTutorEmail(event.target.value)
                }
              />
            </label>

            <label htmlFor="tutor-phone">
              Téléphone du tuteur

              <input
                id="tutor-phone"
                type="tel"
                value={tutorPhone}
                onChange={(event) =>
                  setTutorPhone(event.target.value)
                }
              />
            </label>

            <label htmlFor="convention-status">
              Convention

              <select
                id="convention-status"
                value={conventionStatus}
                onChange={(event) => {
                  const nextStatus =
                    event.target
                      .value as ConventionStatus

                  setConventionStatus(nextStatus)

                  if (nextStatus !== 'signed') {
                    setConventionSignedAt('')
                  }
                }}
              >
                {Object.entries(
                  CONVENTION_STATUS_LABELS,
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            {conventionStatus === 'signed' && (
              <label htmlFor="convention-date">
                Date de signature

                <input
                  id="convention-date"
                  type="date"
                  value={conventionSignedAt}
                  onChange={(event) =>
                    setConventionSignedAt(
                      event.target.value,
                    )
                  }
                  required
                />
              </label>
            )}

            <label htmlFor="report-status">
              Rapport de stage

              <select
                id="report-status"
                value={reportStatus}
                onChange={(event) =>
                  setReportStatus(
                    event.target.value as ReportStatus,
                  )
                }
              >
                {Object.entries(
                  REPORT_STATUS_LABELS,
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="final-grade">
              Note finale / 20

              <input
                id="final-grade"
                type="number"
                min="0"
                max="20"
                step="0.01"
                value={finalGrade}
                onChange={(event) =>
                  setFinalGrade(event.target.value)
                }
              />
            </label>

            <label
              className="full-width"
              htmlFor="internship-description"
            >
              Description

              <textarea
                id="internship-description"
                value={internshipDescription}
                onChange={(event) =>
                  setInternshipDescription(
                    event.target.value,
                  )
                }
                rows={3}
              />
            </label>

            <label
              className="full-width"
              htmlFor="internship-objectives"
            >
              Objectifs

              <textarea
                id="internship-objectives"
                value={objectives}
                onChange={(event) =>
                  setObjectives(event.target.value)
                }
                rows={3}
              />
            </label>

            <label
              className="full-width"
              htmlFor="teacher-comment"
            >
              Commentaire du professeur

              <textarea
                id="teacher-comment"
                value={teacherComment}
                onChange={(event) =>
                  setTeacherComment(
                    event.target.value,
                  )
                }
                rows={3}
              />
            </label>

            <label
              className="full-width"
              htmlFor="company-evaluation"
            >
              Évaluation de l’entreprise

              <textarea
                id="company-evaluation"
                value={companyEvaluation}
                onChange={(event) =>
                  setCompanyEvaluation(
                    event.target.value,
                  )
                }
                rows={3}
              />
            </label>

            <div className="full-width">
              <button
                className="admin-button primary"
                type="submit"
                disabled={
                  isCreatingInternship ||
                  students.length === 0 ||
                  companies.length === 0
                }
              >
                {isCreatingInternship
                  ? 'Création en cours…'
                  : 'Créer le stage'}
              </button>
            </div>
          </form>

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
        </section>

        <section className="admin-card">
          <div className="admin-section-heading">
            <div>
              <h2>Stages enregistrés</h2>

              {!isLoading && (
                <p>
                  {filteredInternships.length}{' '}
                  {filteredInternships.length > 1
                    ? 'stages affichés'
                    : 'stage affiché'}
                </p>
              )}
            </div>

            <button
              className="admin-button"
              type="button"
              onClick={() => void loadData()}
              disabled={isLoading}
            >
              {isLoading
                ? 'Chargement…'
                : 'Actualiser'}
            </button>
          </div>

          <div className="admin-filter-grid admin-internship-filters">
            <input
              className="admin-input"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher un élève, une entreprise ou un stage…"
            />

            <select
              className="admin-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | 'ALL'
                    | InternshipStatus,
                )
              }
            >
              <option value="ALL">
                Tous les statuts
              </option>

              {Object.entries(
                INTERNSHIP_STATUS_LABELS,
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="admin-select"
              value={classFilter}
              onChange={(event) =>
                setClassFilter(event.target.value)
              }
            >
              <option value="ALL">
                Toutes les classes
              </option>

              {classes.map((schoolClass) => (
                <option
                  key={schoolClass.id}
                  value={schoolClass.name}
                >
                  {schoolClass.name}
                </option>
              ))}
            </select>

            <select
              className="admin-select"
              value={companyFilter}
              onChange={(event) =>
                setCompanyFilter(event.target.value)
              }
            >
              <option value="ALL">
                Toutes les entreprises
              </option>

              {companies.map((company) => (
                <option
                  key={company.id}
                  value={company.id}
                >
                  {company.name}
                </option>
              ))}
            </select>

            <select
              className="admin-select"
              value={yearFilter}
              onChange={(event) =>
                setYearFilter(event.target.value)
              }
            >
              <option value="ALL">
                Toutes les années
              </option>

              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {isLoading && (
            <p className="admin-empty">
              Chargement des stages…
            </p>
          )}

          {!isLoading &&
            internshipViews.length === 0 && (
              <p className="admin-empty">
                Aucun stage n’est enregistré.
              </p>
            )}

          {!isLoading &&
            internshipViews.length > 0 &&
            filteredInternships.length === 0 && (
              <p className="admin-empty">
                Aucun stage ne correspond aux filtres.
              </p>
            )}

          {!isLoading &&
            filteredInternships.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table-common admin-internship-table">
                  <thead>
                    <tr>
                      <th>Élève</th>
                      <th>Stage</th>
                      <th>Entreprise</th>
                      <th>Période</th>
                      <th>Professeur référent</th>
                      <th>Convention</th>
                      <th>Rapport</th>
                      <th>Statut</th>
                      <th>Note</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredInternships.map(
                      (internship) => (
                        <tr key={internship.id}>
                          <td>
                            <div className="admin-cell-stack">
                              <strong>
                                {internship.studentName}
                              </strong>
                              <small>
                                {internship.studentNumber} —{' '}
                                {internship.className}
                              </small>
                            </div>
                          </td>

                          <td>
                            <div className="admin-cell-stack">
                              <strong>
                                {internship.title}
                              </strong>
                              <small>
                                {
                                  internship.academic_year
                                }
                              </small>
                            </div>
                          </td>

                          <td>
                            <div className="admin-cell-stack">
                              <strong>
                                {internship.companyName}
                              </strong>
                              {internship.companyCity && (
                                <small>
                                  {internship.companyCity}
                                </small>
                              )}
                            </div>
                          </td>

                          <td>
                            {formatDate(
                              internship.start_date,
                            )}
                            <br />
                            au{' '}
                            {formatDate(
                              internship.end_date,
                            )}
                          </td>

                          <td>
                            {internship.teacherName}
                          </td>

                          <td>
                            <span
                              className={
                                internship.convention_status ===
                                'signed'
                                  ? 'admin-badge green'
                                  : internship.convention_status ===
                                      'refused'
                                    ? 'admin-badge red'
                                    : 'admin-badge orange'
                              }
                            >
                              {
                                CONVENTION_STATUS_LABELS[
                                  internship
                                    .convention_status
                                ]
                              }
                            </span>
                          </td>

                          <td>
                            <span className="admin-badge blue">
                              {
                                REPORT_STATUS_LABELS[
                                  internship
                                    .student_report_status
                                ]
                              }
                            </span>
                          </td>

                          <td>
                            <span
                              className={
                                internship.status ===
                                'completed'
                                  ? 'admin-badge green'
                                  : internship.status ===
                                      'cancelled'
                                    ? 'admin-badge red'
                                    : internship.status ===
                                        'in_progress'
                                      ? 'admin-badge blue'
                                      : 'admin-badge orange'
                              }
                            >
                              {
                                INTERNSHIP_STATUS_LABELS[
                                  internship.status
                                ]
                              }
                            </span>
                          </td>

                          <td>
                            {internship.final_grade !==
                            null ? (
                              <strong>
                                {formatNumber(
                                  internship.final_grade,
                                )}{' '}
                                / 20
                              </strong>
                            ) : (
                              <span className="admin-muted">
                                Non noté
                              </span>
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      </div>
    </main>
  )
}

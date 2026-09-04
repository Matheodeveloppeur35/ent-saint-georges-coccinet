import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../lib/supabase'
import './ParentDashboardPage.css'

type ParentDashboardPageProps = {
  firstName: string
  lastName: string
  onSignOut: () => void
}

type ParentStudentLink = {
  student_id: string
  relationship:
    | 'mother'
    | 'father'
    | 'guardian'
    | 'other'
  is_primary: boolean
  can_view_attendance: boolean
  can_view_grades: boolean
  can_view_lessons: boolean
  can_view_internships: boolean
}

type SchoolClass = {
  id: string
  name: string
  level: string
  school_year: string
}

type Student = {
  id: string
  student_number: string
  first_name: string
  last_name: string
  birth_date: string | null
  class_id: string | null
  classes: SchoolClass | SchoolClass[] | null
}

type ChildView = {
  id: string
  studentNumber: string
  firstName: string
  lastName: string
  birthDate: string | null
  className: string
  classLevel: string
  schoolYear: string
  relationship: ParentStudentLink['relationship']
  isPrimary: boolean
  canViewAttendance: boolean
  canViewGrades: boolean
  canViewLessons: boolean
  canViewInternships: boolean
}

type AttendanceRecord = {
  id: string
  student_id: string
  attendance_date: string
  status: string
  minutes_late: number | null
  reason: string | null
  is_justified: boolean
}

type Assessment = {
  id: string
  title: string
  assessment_date: string
  coefficient: number | null
  maximum_score: number | null
}

type AssessmentResult = {
  id: string
  student_id: string
  score: number | null
  assessment_id: string
  assessments: Assessment | Assessment[] | null
}

type Lesson = {
  id: string
  title: string
  description: string | null
  published_at: string | null
}

type LessonEntry = {
  id: string
  work_text: string | null
  note: string | null
  homework_due_date: string | null
  lessons: Lesson | Lesson[] | null
}

type Company = {
  name: string
}

type Internship = {
  id: string
  student_id: string
  title: string
  start_date: string
  end_date: string
  status: string
  companies: Company | Company[] | null
}

type ParentSection =
  | 'overview'
  | 'attendance'
  | 'grades'
  | 'lessons'
  | 'internships'

const RELATIONSHIP_LABELS: Record<
  ParentStudentLink['relationship'],
  string
> = {
  mother: 'Mère',
  father: 'Père',
  guardian: 'Responsable légal',
  other: 'Autre responsable',
}

const ATTENDANCE_LABELS: Record<string, string> = {
  present: 'Présent',
  absent: 'Absent',
  late: 'En retard',
  excused: 'Excusé',
}

const INTERNSHIP_STATUS_LABELS: Record<
  string,
  string
> = {
  planned: 'Prévu',
  ongoing: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

function firstRelation<T>(
  relation: T | T[] | null,
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null
  }

  return relation
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Non renseignée'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function normalizeStudent(
  student: Student,
  link: ParentStudentLink,
): ChildView {
  const schoolClass = firstRelation(student.classes)

  return {
    id: student.id,
    studentNumber: student.student_number,
    firstName: student.first_name,
    lastName: student.last_name,
    birthDate: student.birth_date,
    className: schoolClass?.name ?? 'Non affecté',
    classLevel: schoolClass?.level ?? '',
    schoolYear: schoolClass?.school_year ?? '',
    relationship: link.relationship,
    isPrimary: link.is_primary,
    canViewAttendance: link.can_view_attendance,
    canViewGrades: link.can_view_grades,
    canViewLessons: link.can_view_lessons,
    canViewInternships: link.can_view_internships,
  }
}

export function ParentDashboardPage({
  firstName,
  lastName,
  onSignOut,
}: ParentDashboardPageProps) {
  const [children, setChildren] = useState<ChildView[]>([])
  const [selectedChildId, setSelectedChildId] =
    useState('')

  const [currentSection, setCurrentSection] =
    useState<ParentSection>('overview')

  const [attendanceRecords, setAttendanceRecords] =
    useState<AttendanceRecord[]>([])

  const [results, setResults] =
    useState<AssessmentResult[]>([])

  const [lessonEntries, setLessonEntries] =
    useState<LessonEntry[]>([])

  const [internships, setInternships] =
    useState<Internship[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isContentLoading, setIsContentLoading] =
    useState(false)

  const [error, setError] = useState('')

  const selectedChild = useMemo(
    () =>
      children.find(
        (child) => child.id === selectedChildId,
      ) ?? null,
    [children, selectedChildId],
  )

  const loadChildren = useCallback(async () => {
    setIsLoading(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError(
        'La session du responsable est introuvable.',
      )
      setIsLoading(false)
      return
    }

    const { data: linksData, error: linksError } =
      await supabase
        .from('parent_students')
        .select(`
          student_id,
          relationship,
          is_primary,
          can_view_attendance,
          can_view_grades,
          can_view_lessons,
          can_view_internships
        `)
        .eq('parent_id', user.id)
        .order('is_primary', { ascending: false })

    if (linksError) {
      console.error(
        'Erreur de chargement des liens parent/élève :',
        linksError,
      )

      setError(
        `Les enfants associés sont inaccessibles : ${linksError.message}`,
      )

      setIsLoading(false)
      return
    }

    const links =
      (linksData ?? []) as ParentStudentLink[]

    if (links.length === 0) {
      setChildren([])
      setSelectedChildId('')
      setIsLoading(false)
      return
    }

    const studentIds = links.map(
      (link) => link.student_id,
    )

    const { data: studentsData, error: studentsError } =
      await supabase
        .from('students')
        .select(`
          id,
          student_number,
          first_name,
          last_name,
          birth_date,
          class_id,
          classes (
            id,
            name,
            level,
            school_year
          )
        `)
        .in('id', studentIds)
        .eq('is_active', true)
        .order('last_name')
        .order('first_name')

    if (studentsError) {
      console.error(
        'Erreur de chargement des élèves :',
        studentsError,
      )

      setError(
        `Les dossiers des enfants sont inaccessibles : ${studentsError.message}`,
      )

      setIsLoading(false)
      return
    }

    const students =
      (studentsData ?? []) as unknown as Student[]

    const normalizedChildren = links
      .map((link) => {
        const student = students.find(
          (item) => item.id === link.student_id,
        )

        return student
          ? normalizeStudent(student, link)
          : null
      })
      .filter(
        (child): child is ChildView => child !== null,
      )

    setChildren(normalizedChildren)

    setSelectedChildId((currentId) => {
      const currentChildStillExists =
        normalizedChildren.some(
          (child) => child.id === currentId,
        )

      return currentChildStillExists
        ? currentId
        : normalizedChildren[0]?.id ?? ''
    })

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadChildren()
  }, [loadChildren])

  const loadChildContent = useCallback(async () => {
    if (!selectedChild) {
      setAttendanceRecords([])
      setResults([])
      setLessonEntries([])
      setInternships([])
      return
    }

    setIsContentLoading(true)
    setError('')

    const attendancePromise =
      selectedChild.canViewAttendance
        ? supabase
            .from('attendance_records')
            .select(`
              id,
              student_id,
              attendance_date,
              status,
              minutes_late,
              reason,
              is_justified
            `)
            .eq('student_id', selectedChild.id)
            .order('attendance_date', {
              ascending: false,
            })
            .limit(20)
        : Promise.resolve({
            data: [],
            error: null,
          })

    const resultsPromise =
      selectedChild.canViewGrades
        ? supabase
            .from('assessment_results')
            .select(`
              id,
              student_id,
              score,
              assessment_id,
              assessments (
                id,
                title,
                assessment_date,
                coefficient,
                maximum_score
              )
            `)
            .eq('student_id', selectedChild.id)
            .limit(20)
        : Promise.resolve({
            data: [],
            error: null,
          })

    const lessonsPromise =
      selectedChild.canViewLessons
        ? supabase
            .from('lesson_entries')
            .select(`
              id,
              work_text,
              note,
              homework_due_date,
              lessons!inner (
                id,
                title,
                description,
                published_at
              )
            `)
            .order('homework_due_date', {
              ascending: true,
              nullsFirst: false,
            })
            .limit(20)
        : Promise.resolve({
            data: [],
            error: null,
          })

    const internshipsPromise =
      selectedChild.canViewInternships
        ? supabase
            .from('internships')
            .select(`
              id,
              student_id,
              title,
              start_date,
              end_date,
              status,
              companies (
                name
              )
            `)
            .eq('student_id', selectedChild.id)
            .order('start_date', {
              ascending: false,
            })
        : Promise.resolve({
            data: [],
            error: null,
          })

    const [
      attendanceResult,
      resultsResult,
      lessonsResult,
      internshipsResult,
    ] = await Promise.all([
      attendancePromise,
      resultsPromise,
      lessonsPromise,
      internshipsPromise,
    ])

    const contentError =
      attendanceResult.error ||
      resultsResult.error ||
      lessonsResult.error ||
      internshipsResult.error

    if (contentError) {
      console.error(
        'Erreur de chargement de l’espace parent :',
        contentError,
      )

      setError(
        `Certaines informations sont inaccessibles : ${contentError.message}`,
      )
    }

    setAttendanceRecords(
      (attendanceResult.data ??
        []) as AttendanceRecord[],
    )

    setResults(
      (resultsResult.data ??
        []) as unknown as AssessmentResult[],
    )

    setLessonEntries(
      (lessonsResult.data ??
        []) as unknown as LessonEntry[],
    )

    setInternships(
      (internshipsResult.data ??
        []) as unknown as Internship[],
    )

    setIsContentLoading(false)
  }, [selectedChild])

  useEffect(() => {
    void loadChildContent()
  }, [loadChildContent])

  async function handleSignOut() {
    const { error: signOutError } =
      await supabase.auth.signOut()

    if (signOutError) {
      setError(
        'La déconnexion a échoué. Veuillez réessayer.',
      )
      return
    }

    onSignOut()
  }

  const absenceCount = attendanceRecords.filter(
    (record) => record.status === 'absent',
  ).length

  const lateCount = attendanceRecords.filter(
    (record) => record.status === 'late',
  ).length

  const scoredResults = results.filter(
    (result) => result.score !== null,
  )

  const averageScore =
    scoredResults.length > 0
      ? scoredResults.reduce(
          (total, result) =>
            total + (result.score ?? 0),
          0,
        ) / scoredResults.length
      : null

  function renderOverview() {
    if (!selectedChild) {
      return null
    }

    return (
      <>
        <section className="parent-stats">
          <article>
            <span>Absences récentes</span>

            <strong>
              {selectedChild.canViewAttendance
                ? absenceCount
                : '—'}
            </strong>
          </article>

          <article>
            <span>Retards récents</span>

            <strong>
              {selectedChild.canViewAttendance
                ? lateCount
                : '—'}
            </strong>
          </article>

          <article>
            <span>Moyenne indicative</span>

            <strong>
              {selectedChild.canViewGrades &&
              averageScore !== null
                ? averageScore.toFixed(2)
                : '—'}
            </strong>
          </article>

          <article>
            <span>Devoirs affichés</span>

            <strong>
              {selectedChild.canViewLessons
                ? lessonEntries.filter(
                    (entry) =>
                      entry.homework_due_date !== null,
                  ).length
                : '—'}
            </strong>
          </article>
        </section>

        <section className="parent-card">
          <div className="parent-section-heading">
            <div>
              <p className="parent-kicker">
                Dossier scolaire
              </p>

              <h2>
                {selectedChild.firstName}{' '}
                {selectedChild.lastName}
              </h2>
            </div>

            {selectedChild.isPrimary && (
              <span className="parent-badge">
                Responsable principal
              </span>
            )}
          </div>

          <dl className="parent-information-grid">
            <div>
              <dt>Numéro d’élève</dt>
              <dd>{selectedChild.studentNumber}</dd>
            </div>

            <div>
              <dt>Classe</dt>
              <dd>{selectedChild.className}</dd>
            </div>

            <div>
              <dt>Niveau</dt>
              <dd>
                {selectedChild.classLevel || '—'}
              </dd>
            </div>

            <div>
              <dt>Année scolaire</dt>
              <dd>
                {selectedChild.schoolYear || '—'}
              </dd>
            </div>

            <div>
              <dt>Date de naissance</dt>
              <dd>
                {formatDate(selectedChild.birthDate)}
              </dd>
            </div>

            <div>
              <dt>Lien avec l’élève</dt>
              <dd>
                {
                  RELATIONSHIP_LABELS[
                    selectedChild.relationship
                  ]
                }
              </dd>
            </div>
          </dl>
        </section>
      </>
    )
  }

  function renderAttendance() {
    if (!selectedChild?.canViewAttendance) {
      return (
        <section className="parent-empty">
          Vous n’êtes pas autorisé à consulter les
          absences et les retards de cet élève.
        </section>
      )
    }

    return (
      <section className="parent-card">
        <div className="parent-section-heading">
          <div>
            <p className="parent-kicker">
              Vie scolaire
            </p>

            <h2>Absences et retards</h2>
          </div>
        </div>

        {attendanceRecords.length === 0 ? (
          <p className="parent-empty">
            Aucun événement de présence enregistré.
          </p>
        ) : (
          <div className="parent-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Retard</th>
                  <th>Justification</th>
                  <th>Motif</th>
                </tr>
              </thead>

              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.id}>
                    <td>
                      {formatDate(
                        record.attendance_date,
                      )}
                    </td>

                    <td>
                      <span
                        className={`parent-status ${record.status}`}
                      >
                        {ATTENDANCE_LABELS[
                          record.status
                        ] ?? record.status}
                      </span>
                    </td>

                    <td>
                      {record.minutes_late
                        ? `${record.minutes_late} min`
                        : '—'}
                    </td>

                    <td>
                      {record.is_justified
                        ? 'Justifiée'
                        : 'Non justifiée'}
                    </td>

                    <td>{record.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  function renderGrades() {
    if (!selectedChild?.canViewGrades) {
      return (
        <section className="parent-empty">
          Vous n’êtes pas autorisé à consulter les
          résultats de cet élève.
        </section>
      )
    }

    return (
      <section className="parent-card">
        <div className="parent-section-heading">
          <div>
            <p className="parent-kicker">
              Résultats scolaires
            </p>

            <h2>Notes et évaluations</h2>
          </div>
        </div>

        {results.length === 0 ? (
          <p className="parent-empty">
            Aucun résultat publié.
          </p>
        ) : (
          <div className="parent-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Évaluation</th>
                  <th>Date</th>
                  <th>Note</th>
                  <th>Coefficient</th>
                </tr>
              </thead>

              <tbody>
                {results.map((result) => {
                  const assessment = firstRelation(
                    result.assessments,
                  )

                  return (
                    <tr key={result.id}>
                      <td>
                        {assessment?.title ??
                          'Évaluation'}
                      </td>

                      <td>
                        {formatDate(
                          assessment?.assessment_date ??
                            null,
                        )}
                      </td>

                      <td>
                        <strong>
                          {result.score ?? '—'}

                          {assessment?.maximum_score
                            ? ` / ${assessment.maximum_score}`
                            : ''}
                        </strong>
                      </td>

                      <td>
                        {assessment?.coefficient ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  function renderLessons() {
    if (!selectedChild?.canViewLessons) {
      return (
        <section className="parent-empty">
          Vous n’êtes pas autorisé à consulter le cahier
          de texte de cet élève.
        </section>
      )
    }

    return (
      <section className="parent-card">
        <div className="parent-section-heading">
          <div>
            <p className="parent-kicker">
              Suivi pédagogique
            </p>

            <h2>Cahier de texte</h2>
          </div>
        </div>

        {lessonEntries.length === 0 ? (
          <p className="parent-empty">
            Aucune séance publiée.
          </p>
        ) : (
          <div className="parent-lesson-list">
            {lessonEntries.map((entry) => {
              const lesson = firstRelation(
                entry.lessons,
              )

              return (
                <article key={entry.id}>
                  <div>
                    <h3>
                      {lesson?.title ??
                        'Cours sans titre'}
                    </h3>

                    {lesson?.description && (
                      <p>{lesson.description}</p>
                    )}
                  </div>

                  {entry.work_text && (
                    <p>
                      <strong>
                        Travail réalisé :
                      </strong>{' '}
                      {entry.work_text}
                    </p>
                  )}

                  {entry.note && (
                    <p>
                      <strong>Note :</strong>{' '}
                      {entry.note}
                    </p>
                  )}

                  <p>
                    <strong>Devoir pour le :</strong>{' '}
                    {formatDate(
                      entry.homework_due_date,
                    )}
                  </p>
                </article>
              )
            })}
          </div>
        )}
      </section>
    )
  }

  function renderInternships() {
    if (!selectedChild?.canViewInternships) {
      return (
        <section className="parent-empty">
          Vous n’êtes pas autorisé à consulter les stages
          de cet élève.
        </section>
      )
    }

    return (
      <section className="parent-card">
        <div className="parent-section-heading">
          <div>
            <p className="parent-kicker">
              Parcours professionnel
            </p>

            <h2>Stages</h2>
          </div>
        </div>

        {internships.length === 0 ? (
          <p className="parent-empty">
            Aucun stage enregistré.
          </p>
        ) : (
          <div className="parent-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Stage</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Statut</th>
                </tr>
              </thead>

              <tbody>
                {internships.map((internship) => {
                  const company = firstRelation(
                    internship.companies,
                  )

                  return (
                    <tr key={internship.id}>
                      <td>
                        {company?.name ??
                          'Entreprise inconnue'}
                      </td>

                      <td>{internship.title}</td>

                      <td>
                        {formatDate(
                          internship.start_date,
                        )}
                      </td>

                      <td>
                        {formatDate(
                          internship.end_date,
                        )}
                      </td>

                      <td>
                        {INTERNSHIP_STATUS_LABELS[
                          internship.status
                        ] ?? internship.status}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  return (
    <main className="parent-dashboard">
      <header className="parent-header">
        <div>
          <p className="parent-kicker">
            ENT Saint Georges Coccinet
          </p>

          <h1>
            Bonjour, {firstName} {lastName}
          </h1>

          <p className="parent-subtitle">
            Espace Parent
          </p>
        </div>

        <div className="parent-header-actions">
          <button
            type="button"
            className="parent-secondary-button"
            onClick={() => void loadChildren()}
            disabled={isLoading}
          >
            Actualiser
          </button>

          <button
            type="button"
            className="parent-signout-button"
            onClick={() => void handleSignOut()}
          >
            Se déconnecter
          </button>
        </div>
      </header>

      {error && (
        <section
          className="parent-error"
          role="alert"
        >
          <p>{error}</p>
        </section>
      )}

      {isLoading ? (
        <section className="parent-loading">
          Chargement de l’espace parent…
        </section>
      ) : children.length === 0 ? (
        <section className="parent-empty">
          Aucun élève n’est actuellement associé à votre
          compte. Contactez l’administration.
        </section>
      ) : (
        <>
          <section className="parent-child-selector">
            <label htmlFor="parent-child">
              Élève suivi
            </label>

            <select
              id="parent-child"
              value={selectedChildId}
              onChange={(event) => {
                setSelectedChildId(event.target.value)
                setCurrentSection('overview')
              }}
            >
              {children.map((child) => (
                <option
                  key={child.id}
                  value={child.id}
                >
                  {child.firstName} {child.lastName} —{' '}
                  {child.className}
                </option>
              ))}
            </select>
          </section>

          <nav
            className="parent-navigation"
            aria-label="Navigation de l’espace parent"
          >
            <button
              type="button"
              className={
                currentSection === 'overview'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setCurrentSection('overview')
              }
            >
              Vue d’ensemble
            </button>

            <button
              type="button"
              className={
                currentSection === 'attendance'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setCurrentSection('attendance')
              }
              disabled={
                !selectedChild?.canViewAttendance
              }
            >
              Absences
            </button>

            <button
              type="button"
              className={
                currentSection === 'grades'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setCurrentSection('grades')
              }
              disabled={!selectedChild?.canViewGrades}
            >
              Notes
            </button>

            <button
              type="button"
              className={
                currentSection === 'lessons'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setCurrentSection('lessons')
              }
              disabled={
                !selectedChild?.canViewLessons
              }
            >
              Cahier de texte
            </button>

            <button
              type="button"
              className={
                currentSection === 'internships'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setCurrentSection('internships')
              }
              disabled={
                !selectedChild?.canViewInternships
              }
            >
              Stages
            </button>
          </nav>

          {isContentLoading ? (
            <section className="parent-loading">
              Chargement des informations…
            </section>
          ) : (
            <>
              {currentSection === 'overview' &&
                renderOverview()}

              {currentSection === 'attendance' &&
                renderAttendance()}

              {currentSection === 'grades' &&
                renderGrades()}

              {currentSection === 'lessons' &&
                renderLessons()}

              {currentSection === 'internships' &&
                renderInternships()}
            </>
          )}
        </>
      )}
    </main>
  )
}

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../lib/supabase'
import './DirectionDashboardPage.css'

type SchoolClass = {
  id: string
  name: string
  level: string
  school_year: string
  is_active: boolean
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

type Subject = {
  id: string
  name: string
  short_name: string
  color: string
  is_active: boolean
}

type ClassSubject = {
  id: string
  teacher_id: string
  class_id: string
  subject_id: string
  academic_year: string
}

type Timetable = {
  id: string
  class_subject_id: string
  academic_year: string
  day_of_week: number
  starts_at: string
  ends_at: string
  room: string | null
  is_active: boolean
}

type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused'

type AttendanceRecord = {
  id: string
  student_id: string
  attendance_date: string
  status: AttendanceStatus
  minutes_late: number | null
  reason: string | null
  is_justified: boolean
}

type Assessment = {
  id: string
  class_subject_id: string
  title: string
  assessment_date: string
  maximum_score: number
  coefficient: number
  period: string
  is_published: boolean
}

type AssessmentResult = {
  id: string
  assessment_id: string
  student_id: string
  score: number | null
  status:
    | 'graded'
    | 'absent'
    | 'excused'
    | 'not_submitted'
}

type Company = {
  id: string
  name: string
  city: string | null
  is_active: boolean
}

type Internship = {
  id: string
  student_id: string
  company_id: string
  teacher_id: string | null
  title: string
  start_date: string
  end_date: string
  academic_year: string
  status:
    | 'planned'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
  convention_status:
    | 'not_started'
    | 'preparing'
    | 'sent'
    | 'signed'
    | 'refused'
  final_grade: number | null
}

type AcademicPeriod = {
  id: string
  name: string
  academic_year: string
  period_type:
    | 'trimester'
    | 'semester'
    | 'custom'
  position: number
  starts_on: string
  ends_on: string
  is_active: boolean
}

type ModuleSetting = {
  id: string
  module_key: string
  display_name: string
  description: string | null
  is_enabled: boolean
  position: number
}

type SchoolSettings = {
  id: string
  school_name: string
  ent_name: string
  academic_year: string
  maintenance_mode: boolean
}

type DirectionDashboardPageProps = {
  firstName: string
  lastName: string
  onSignOut: () => void
}

type ClassSummary = SchoolClass & {
  studentCount: number
  teacherCount: number
  courseCount: number
  absenceCount: number
  lateCount: number
}

type AssessmentSummary = Assessment & {
  className: string
  subjectName: string
  subjectColor: string
  resultCount: number
  averageOnTwenty: number | null
}

type InternshipSummary = Internship & {
  studentName: string
  className: string
  companyName: string
  teacherName: string
}

const DAY_LABELS: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
}

const ATTENDANCE_LABELS: Record<
  AttendanceStatus,
  string
> = {
  present: 'Présent',
  absent: 'Absent',
  late: 'En retard',
  excused: 'Absence autorisée',
}

const INTERNSHIP_STATUS_LABELS: Record<
  Internship['status'],
  string
> = {
  planned: 'Planifié',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function formatTime(value: string) {
  return value ? value.slice(0, 5) : '—'
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value)
}

export function DirectionDashboardPage({
  firstName,
  lastName,
  onSignOut,
}: DirectionDashboardPageProps) {
  const [schoolSettings, setSchoolSettings] =
    useState<SchoolSettings | null>(null)

  const [classes, setClasses] =
    useState<SchoolClass[]>([])

  const [students, setStudents] =
    useState<Student[]>([])

  const [teachers, setTeachers] =
    useState<Teacher[]>([])

  const [subjects, setSubjects] =
    useState<Subject[]>([])

  const [classSubjects, setClassSubjects] =
    useState<ClassSubject[]>([])

  const [timetables, setTimetables] =
    useState<Timetable[]>([])

  const [attendanceRecords, setAttendanceRecords] =
    useState<AttendanceRecord[]>([])

  const [assessments, setAssessments] =
    useState<Assessment[]>([])

  const [assessmentResults, setAssessmentResults] =
    useState<AssessmentResult[]>([])

  const [companies, setCompanies] =
    useState<Company[]>([])

  const [internships, setInternships] =
    useState<Internship[]>([])

  const [periods, setPeriods] =
    useState<AcademicPeriod[]>([])

  const [modules, setModules] =
    useState<ModuleSetting[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] =
    useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')

    const [
      settingsResult,
      classesResult,
      studentsResult,
      teachersResult,
      subjectsResult,
      assignmentsResult,
      timetablesResult,
      attendanceResult,
      assessmentsResult,
      assessmentResultsResult,
      companiesResult,
      internshipsResult,
      periodsResult,
      modulesResult,
    ] = await Promise.all([
      supabase
        .from('school_settings')
        .select(`
          id,
          school_name,
          ent_name,
          academic_year,
          maintenance_mode
        `)
        .eq('singleton_key', true)
        .single(),

      supabase
        .from('classes')
        .select(`
          id,
          name,
          level,
          school_year,
          is_active
        `)
        .order('name'),

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
        .order('last_name')
        .order('first_name'),

      supabase
        .from('subjects')
        .select(`
          id,
          name,
          short_name,
          color,
          is_active
        `)
        .order('name'),

      supabase
        .from('class_subjects')
        .select(`
          id,
          teacher_id,
          class_id,
          subject_id,
          academic_year
        `),

      supabase
        .from('timetables')
        .select(`
          id,
          class_subject_id,
          academic_year,
          day_of_week,
          starts_at,
          ends_at,
          room,
          is_active
        `)
        .order('day_of_week')
        .order('starts_at'),

      supabase
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
        .order('attendance_date', {
          ascending: false,
        })
        .limit(100),

      supabase
        .from('assessments')
        .select(`
          id,
          class_subject_id,
          title,
          assessment_date,
          maximum_score,
          coefficient,
          period,
          is_published
        `)
        .order('assessment_date', {
          ascending: false,
        }),

      supabase
        .from('assessment_results')
        .select(`
          id,
          assessment_id,
          student_id,
          score,
          status
        `),

      supabase
        .from('companies')
        .select(`
          id,
          name,
          city,
          is_active
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
          start_date,
          end_date,
          academic_year,
          status,
          convention_status,
          final_grade
        `)
        .order('start_date', {
          ascending: false,
        }),

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
          is_active
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
          position
        `)
        .order('position'),
    ])

    const errors = [
      settingsResult.error,
      classesResult.error,
      studentsResult.error,
      teachersResult.error,
      subjectsResult.error,
      assignmentsResult.error,
      timetablesResult.error,
      attendanceResult.error,
      assessmentsResult.error,
      assessmentResultsResult.error,
      companiesResult.error,
      internshipsResult.error,
      periodsResult.error,
      modulesResult.error,
    ].filter(Boolean)

    if (settingsResult.data) {
      setSchoolSettings(
        settingsResult.data as SchoolSettings,
      )
    }

    setClasses(
      (classesResult.data ?? []) as SchoolClass[],
    )

    setStudents(
      (studentsResult.data ?? []) as Student[],
    )

    setTeachers(
      (teachersResult.data ?? []) as Teacher[],
    )

    setSubjects(
      (subjectsResult.data ?? []) as Subject[],
    )

    setClassSubjects(
      (assignmentsResult.data ??
        []) as ClassSubject[],
    )

    setTimetables(
      (timetablesResult.data ?? []) as Timetable[],
    )

    setAttendanceRecords(
      (attendanceResult.data ??
        []) as AttendanceRecord[],
    )

    setAssessments(
      (assessmentsResult.data ??
        []) as Assessment[],
    )

    setAssessmentResults(
      (assessmentResultsResult.data ??
        []) as AssessmentResult[],
    )

    setCompanies(
      (companiesResult.data ?? []) as Company[],
    )

    setInternships(
      (internshipsResult.data ??
        []) as Internship[],
    )

    setPeriods(
      (periodsResult.data ?? []) as AcademicPeriod[],
    )

    setModules(
      (modulesResult.data ?? []) as ModuleSetting[],
    )

    if (errors.length > 0) {
      console.error(
        'Erreur de chargement de l’espace direction :',
        errors,
      )

      setError(
        'Certaines données de pilotage n’ont pas pu être chargées.',
      )
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

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

  const subjectMap = useMemo(
    () =>
      new Map(
        subjects.map((subject) => [
          subject.id,
          subject,
        ]),
      ),
    [subjects],
  )

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

  const assignmentMap = useMemo(
    () =>
      new Map(
        classSubjects.map((assignment) => [
          assignment.id,
          assignment,
        ]),
      ),
    [classSubjects],
  )

  const classSummaries = useMemo<ClassSummary[]>(
    () =>
      classes
        .filter((schoolClass) => schoolClass.is_active)
        .map((schoolClass) => {
          const classAssignments =
            classSubjects.filter(
              (assignment) =>
                assignment.class_id === schoolClass.id,
            )

          const assignmentIds = new Set(
            classAssignments.map(
              (assignment) => assignment.id,
            ),
          )

          const classStudents = students.filter(
            (student) =>
              student.class_id === schoolClass.id &&
              student.is_active,
          )

          const studentIds = new Set(
            classStudents.map((student) => student.id),
          )

          const teacherIds = new Set(
            classAssignments.map(
              (assignment) =>
                assignment.teacher_id,
            ),
          )

          const classAttendance =
            attendanceRecords.filter((record) =>
              studentIds.has(record.student_id),
            )

          return {
            ...schoolClass,
            studentCount: classStudents.length,
            teacherCount: teacherIds.size,
            courseCount: timetables.filter(
              (timetable) =>
                assignmentIds.has(
                  timetable.class_subject_id,
                ) && timetable.is_active,
            ).length,
            absenceCount: classAttendance.filter(
              (record) =>
                record.status === 'absent' ||
                record.status === 'excused',
            ).length,
            lateCount: classAttendance.filter(
              (record) =>
                record.status === 'late',
            ).length,
          }
        }),
    [
      classes,
      students,
      classSubjects,
      timetables,
      attendanceRecords,
    ],
  )

  const assessmentSummaries = useMemo<
    AssessmentSummary[]
  >(
    () =>
      assessments.map((assessment) => {
        const assignment = assignmentMap.get(
          assessment.class_subject_id,
        )

        const schoolClass = assignment
          ? classMap.get(assignment.class_id)
          : null

        const subject = assignment
          ? subjectMap.get(assignment.subject_id)
          : null

        const results = assessmentResults.filter(
          (result) =>
            result.assessment_id === assessment.id,
        )

        const gradedResults = results.filter(
          (result) =>
            result.status === 'graded' &&
            result.score !== null,
        )

        const averageOnTwenty =
          gradedResults.length > 0 &&
          assessment.maximum_score > 0
            ? gradedResults.reduce(
                (sum, result) =>
                  sum +
                  ((result.score ?? 0) /
                    assessment.maximum_score) *
                    20,
                0,
              ) / gradedResults.length
            : null

        return {
          ...assessment,
          className:
            schoolClass?.name ?? 'Classe inconnue',
          subjectName:
            subject?.name ?? 'Matière inconnue',
          subjectColor:
            subject?.color ?? '#64748b',
          resultCount: results.length,
          averageOnTwenty,
        }
      }),
    [
      assessments,
      assessmentResults,
      assignmentMap,
      classMap,
      subjectMap,
    ],
  )

  const internshipSummaries = useMemo<
    InternshipSummary[]
  >(
    () =>
      internships.map((internship) => {
        const student = studentMap.get(
          internship.student_id,
        )

        const schoolClass = student?.class_id
          ? classMap.get(student.class_id)
          : null

        const company = companyMap.get(
          internship.company_id,
        )

        const teacher = internship.teacher_id
          ? teacherMap.get(internship.teacher_id)
          : null

        return {
          ...internship,
          studentName: student
            ? `${student.last_name} ${student.first_name}`
            : 'Élève inconnu',
          className:
            schoolClass?.name ?? 'Non affecté',
          companyName:
            company?.name ?? 'Entreprise inconnue',
          teacherName: teacher
            ? `${teacher.last_name} ${teacher.first_name}`
            : 'Non attribué',
        }
      }),
    [
      internships,
      studentMap,
      classMap,
      companyMap,
      teacherMap,
    ],
  )

  const activeClasses = classes.filter(
    (schoolClass) => schoolClass.is_active,
  ).length

  const activeStudents = students.filter(
    (student) => student.is_active,
  ).length

  const activeTeachers = teachers.filter(
    (teacher) => teacher.is_active,
  ).length

  const activeCourses = timetables.filter(
    (timetable) => timetable.is_active,
  ).length

  const absenceCount = attendanceRecords.filter(
    (record) =>
      record.status === 'absent' ||
      record.status === 'excused',
  ).length

  const lateCount = attendanceRecords.filter(
    (record) => record.status === 'late',
  ).length

  const publishedAssessments = assessments.filter(
    (assessment) => assessment.is_published,
  ).length

  const activeInternships = internships.filter(
    (internship) =>
      internship.status === 'planned' ||
      internship.status === 'in_progress',
  ).length

  const enabledModules = modules.filter(
    (module) => module.is_enabled,
  )

  const activePeriods = periods.filter(
    (period) => period.is_active,
  )

  const recentAttendance =
    attendanceRecords.slice(0, 12)

  const recentAssessments =
    assessmentSummaries.slice(0, 10)

  const recentInternships =
    internshipSummaries.slice(0, 10)

  async function handleSignOut() {
    setIsSigningOut(true)

    const { error: signOutError } =
      await supabase.auth.signOut()

    if (signOutError) {
      setError('La déconnexion a échoué.')
      setIsSigningOut(false)
      return
    }

    onSignOut()
  }

  return (
    <main className="direction-page">
      <header className="direction-header">
        <div>
          <p className="direction-kicker">
            {schoolSettings?.ent_name ??
              'ENT Saint Georges Coccinet'}
          </p>

          <h1>
            Bonjour, {firstName} {lastName}
          </h1>

          <p>
            Espace Direction —{' '}
            {schoolSettings?.academic_year ??
              'Année scolaire'}
          </p>
        </div>

        <div className="direction-header-actions">
          <button
            className="direction-button"
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            {isLoading
              ? 'Chargement…'
              : 'Actualiser'}
          </button>

          <button
            className="direction-button danger"
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
          >
            {isSigningOut
              ? 'Déconnexion…'
              : 'Se déconnecter'}
          </button>
        </div>
      </header>

      <div className="direction-content">
        {error && (
          <section
            className="direction-message error"
            role="alert"
          >
            {error}
          </section>
        )}

        {schoolSettings?.maintenance_mode && (
          <section className="direction-message warning">
            Le mode maintenance de l’ENT est actuellement
            activé.
          </section>
        )}

        {isLoading && (
          <section className="direction-card">
            <p className="direction-empty">
              Chargement des données de pilotage…
            </p>
          </section>
        )}

        {!isLoading && (
          <>
            <section className="direction-stats">
              <article>
                <span>Classes actives</span>
                <strong>{activeClasses}</strong>
              </article>

              <article>
                <span>Élèves actifs</span>
                <strong>{activeStudents}</strong>
              </article>

              <article>
                <span>Professeurs actifs</span>
                <strong>{activeTeachers}</strong>
              </article>

              <article>
                <span>Cours programmés</span>
                <strong>{activeCourses}</strong>
              </article>

              <article>
                <span>Stages actifs</span>
                <strong>{activeInternships}</strong>
              </article>
            </section>

            <section className="direction-stats secondary">
              <article>
                <span>Absences récentes</span>
                <strong>{absenceCount}</strong>
              </article>

              <article>
                <span>Retards récents</span>
                <strong>{lateCount}</strong>
              </article>

              <article>
                <span>Évaluations publiées</span>
                <strong>
                  {publishedAssessments}
                </strong>
              </article>

              <article>
                <span>Entreprises actives</span>
                <strong>
                  {
                    companies.filter(
                      (company) =>
                        company.is_active,
                    ).length
                  }
                </strong>
              </article>

              <article>
                <span>Modules actifs</span>
                <strong>
                  {enabledModules.length}
                </strong>
              </article>
            </section>

            <section className="direction-card">
              <h2>Vue des classes</h2>

              {classSummaries.length === 0 ? (
                <p className="direction-empty">
                  Aucune classe active.
                </p>
              ) : (
                <div className="direction-grid">
                  {classSummaries.map(
                    (schoolClass) => (
                      <article
                        className="direction-class-card"
                        key={schoolClass.id}
                      >
                        <div>
                          <p>
                            {schoolClass.level}
                          </p>

                          <h3>
                            {schoolClass.name}
                          </h3>

                          <span>
                            {schoolClass.school_year}
                          </span>
                        </div>

                        <dl>
                          <div>
                            <dt>Élèves</dt>
                            <dd>
                              {
                                schoolClass.studentCount
                              }
                            </dd>
                          </div>

                          <div>
                            <dt>Professeurs</dt>
                            <dd>
                              {
                                schoolClass.teacherCount
                              }
                            </dd>
                          </div>

                          <div>
                            <dt>Cours</dt>
                            <dd>
                              {
                                schoolClass.courseCount
                              }
                            </dd>
                          </div>

                          <div>
                            <dt>Absences</dt>
                            <dd>
                              {
                                schoolClass.absenceCount
                              }
                            </dd>
                          </div>

                          <div>
                            <dt>Retards</dt>
                            <dd>
                              {
                                schoolClass.lateCount
                              }
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="direction-card">
              <h2>Vie scolaire récente</h2>

              {recentAttendance.length === 0 ? (
                <p className="direction-empty">
                  Aucun événement récent.
                </p>
              ) : (
                <div className="direction-table-wrap">
                  <table className="direction-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Élève</th>
                        <th>Classe</th>
                        <th>Statut</th>
                        <th>Motif</th>
                        <th>Justification</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentAttendance.map(
                        (record) => {
                          const student =
                            studentMap.get(
                              record.student_id,
                            )

                          const schoolClass =
                            student?.class_id
                              ? classMap.get(
                                  student.class_id,
                                )
                              : null

                          return (
                            <tr key={record.id}>
                              <td>
                                {formatDate(
                                  record
                                    .attendance_date,
                                )}
                              </td>

                              <td>
                                <strong>
                                  {student
                                    ? `${student.last_name} ${student.first_name}`
                                    : 'Élève inconnu'}
                                </strong>
                              </td>

                              <td>
                                {schoolClass?.name ??
                                  '—'}
                              </td>

                              <td>
                                <span
                                  className={
                                    record.status ===
                                    'present'
                                      ? 'direction-badge green'
                                      : record.status ===
                                          'absent'
                                        ? 'direction-badge red'
                                        : record.status ===
                                            'late'
                                          ? 'direction-badge orange'
                                          : 'direction-badge blue'
                                  }
                                >
                                  {
                                    ATTENDANCE_LABELS[
                                      record.status
                                    ]
                                  }

                                  {record.status ===
                                    'late' &&
                                    record.minutes_late && (
                                      <>
                                        {' '}
                                        (
                                        {
                                          record.minutes_late
                                        }{' '}
                                        min)
                                      </>
                                    )}
                                </span>
                              </td>

                              <td>
                                {record.reason || '—'}
                              </td>

                              <td>
                                {record.is_justified
                                  ? 'Justifié'
                                  : 'Non justifié'}
                              </td>
                            </tr>
                          )
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="direction-card">
              <h2>Évaluations récentes</h2>

              {recentAssessments.length === 0 ? (
                <p className="direction-empty">
                  Aucune évaluation enregistrée.
                </p>
              ) : (
                <div className="direction-table-wrap">
                  <table className="direction-table direction-wide-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Évaluation</th>
                        <th>Classe</th>
                        <th>Matière</th>
                        <th>Période</th>
                        <th>Résultats</th>
                        <th>Moyenne / 20</th>
                        <th>Publication</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentAssessments.map(
                        (assessment) => (
                          <tr key={assessment.id}>
                            <td>
                              {formatDate(
                                assessment
                                  .assessment_date,
                              )}
                            </td>

                            <td>
                              <strong>
                                {assessment.title}
                              </strong>
                            </td>

                            <td>
                              {assessment.className}
                            </td>

                            <td>
                              <span
                                className="direction-subject"
                                style={{
                                  borderLeftColor:
                                    assessment
                                      .subjectColor,
                                }}
                              >
                                {
                                  assessment.subjectName
                                }
                              </span>
                            </td>

                            <td>
                              {assessment.period}
                            </td>

                            <td>
                              {assessment.resultCount}
                            </td>

                            <td>
                              {assessment.averageOnTwenty !==
                              null
                                ? formatNumber(
                                    assessment.averageOnTwenty,
                                  )
                                : '—'}
                            </td>

                            <td>
                              <span
                                className={
                                  assessment.is_published
                                    ? 'direction-badge green'
                                    : 'direction-badge orange'
                                }
                              >
                                {assessment.is_published
                                  ? 'Publiée'
                                  : 'Brouillon'}
                              </span>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="direction-card">
              <h2>Stages récents</h2>

              {recentInternships.length === 0 ? (
                <p className="direction-empty">
                  Aucun stage enregistré.
                </p>
              ) : (
                <div className="direction-table-wrap">
                  <table className="direction-table direction-wide-table">
                    <thead>
                      <tr>
                        <th>Élève</th>
                        <th>Classe</th>
                        <th>Stage</th>
                        <th>Entreprise</th>
                        <th>Période</th>
                        <th>Référent</th>
                        <th>Statut</th>
                        <th>Note</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentInternships.map(
                        (internship) => (
                          <tr key={internship.id}>
                            <td>
                              <strong>
                                {
                                  internship.studentName
                                }
                              </strong>
                            </td>

                            <td>
                              {internship.className}
                            </td>

                            <td>
                              {internship.title}
                            </td>

                            <td>
                              {internship.companyName}
                            </td>

                            <td>
                              {formatDate(
                                internship.start_date,
                              )}
                              {' – '}
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
                                  internship.status ===
                                  'completed'
                                    ? 'direction-badge green'
                                    : internship.status ===
                                        'cancelled'
                                      ? 'direction-badge red'
                                      : internship.status ===
                                          'in_progress'
                                        ? 'direction-badge blue'
                                        : 'direction-badge orange'
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
                              null
                                ? `${formatNumber(
                                    internship.final_grade,
                                  )} / 20`
                                : '—'}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="direction-columns">
              <article className="direction-card">
                <h2>Périodes scolaires</h2>

                {activePeriods.length === 0 ? (
                  <p className="direction-empty">
                    Aucune période active.
                  </p>
                ) : (
                  <ul className="direction-list">
                    {activePeriods.map((period) => (
                      <li key={period.id}>
                        <div>
                          <strong>
                            {period.name}
                          </strong>

                          <span>
                            {period.academic_year}
                          </span>
                        </div>

                        <span>
                          {formatDate(
                            period.starts_on,
                          )}
                          {' – '}
                          {formatDate(period.ends_on)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="direction-card">
                <h2>Modules actifs</h2>

                {enabledModules.length === 0 ? (
                  <p className="direction-empty">
                    Aucun module actif.
                  </p>
                ) : (
                  <ul className="direction-list">
                    {enabledModules.map((module) => (
                      <li key={module.id}>
                        <div>
                          <strong>
                            {module.display_name}
                          </strong>

                          <span>
                            {module.description ||
                              'Aucune description'}
                          </span>
                        </div>

                        <span className="direction-badge green">
                          Activé
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </section>

            <section className="direction-card">
              <h2>Aperçu des cours</h2>

              {timetables.length === 0 ? (
                <p className="direction-empty">
                  Aucun cours programmé.
                </p>
              ) : (
                <div className="direction-table-wrap">
                  <table className="direction-table">
                    <thead>
                      <tr>
                        <th>Jour</th>
                        <th>Horaire</th>
                        <th>Classe</th>
                        <th>Matière</th>
                        <th>Professeur</th>
                        <th>Salle</th>
                        <th>Statut</th>
                      </tr>
                    </thead>

                    <tbody>
                      {timetables
                        .slice(0, 20)
                        .map((timetable) => {
                          const assignment =
                            assignmentMap.get(
                              timetable
                                .class_subject_id,
                            )

                          const schoolClass =
                            assignment
                              ? classMap.get(
                                  assignment.class_id,
                                )
                              : null

                          const subject = assignment
                            ? subjectMap.get(
                                assignment.subject_id,
                              )
                            : null

                          const teacher = assignment
                            ? teacherMap.get(
                                assignment.teacher_id,
                              )
                            : null

                          return (
                            <tr key={timetable.id}>
                              <td>
                                <strong>
                                  {DAY_LABELS[
                                    timetable
                                      .day_of_week
                                  ] ??
                                    'Jour inconnu'}
                                </strong>
                              </td>

                              <td>
                                {formatTime(
                                  timetable.starts_at,
                                )}
                                {' – '}
                                {formatTime(
                                  timetable.ends_at,
                                )}
                              </td>

                              <td>
                                {schoolClass?.name ??
                                  '—'}
                              </td>

                              <td>
                                {subject?.name ?? '—'}
                              </td>

                              <td>
                                {teacher
                                  ? `${teacher.last_name} ${teacher.first_name}`
                                  : '—'}
                              </td>

                              <td>
                                {timetable.room || '—'}
                              </td>

                              <td>
                                <span
                                  className={
                                    timetable.is_active
                                      ? 'direction-badge green'
                                      : 'direction-badge orange'
                                  }
                                >
                                  {timetable.is_active
                                    ? 'Actif'
                                    : 'Inactif'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

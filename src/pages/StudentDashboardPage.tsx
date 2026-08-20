import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../lib/supabase'
import './StudentDashboardPage.css'

type Student = {
  id: string
  student_number: string
  first_name: string
  last_name: string
  birth_date: string | null
  class_id: string | null
  classes:
    | {
        id: string
        name: string
        level: string
        school_year: string
      }[]
    | null
}

type ClassSubject = {
  id: string
  teacher_id: string
  class_id: string
  subject_id: string
}

type Timetable = {
  id: string
  class_subject_id: string
  day_of_week: number
  starts_at: string
  ends_at: string
  room: string | null
  academic_year: string
  is_active: boolean
}

type TimetableEntry = {
  id: string
  timetable_id: string
  room: string | null
  teacher_note: string | null
  is_cancelled: boolean
}

type Teacher = {
  id: string
  first_name: string
  last_name: string
}

type Subject = {
  id: string
  name: string
  short_name: string
  color: string
}

type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused'

type AttendanceRecord = {
  id: string
  student_id: string
  timetable_id: string | null
  attendance_date: string
  status: AttendanceStatus
  minutes_late: number | null
  reason: string | null
  is_justified: boolean
  justification_note: string | null
}

type Assessment = {
  id: string
  class_subject_id: string
  title: string
  description: string | null
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
  teacher_comment: string | null
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
  student_report_status:
    | 'not_required'
    | 'expected'
    | 'submitted'
    | 'validated'
    | 'late'
  final_grade: number | null
}

type Company = {
  id: string
  name: string
  city: string | null
}

type Lesson = {
  id: string
  timetable_id: string
  title: string
  description: string | null
  is_published: boolean
  published_at: string | null
}

type LessonEntry = {
  id: string
  lesson_id: string
  work_text: string | null
  note: string | null
  homework_due_date: string | null
}

type StudentDashboardPageProps = {
  firstName: string
  lastName: string
  onSignOut: () => void
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

const RESULT_STATUS_LABELS = {
  graded: 'Noté',
  absent: 'Absent',
  excused: 'Excusé',
  not_submitted: 'Non rendu',
} as const

const INTERNSHIP_STATUS_LABELS = {
  planned: 'Planifié',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
} as const

function formatTime(value: string) {
  return value ? value.slice(0, 5) : '—'
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

export function StudentDashboardPage({
  firstName,
  lastName,
  onSignOut,
}: StudentDashboardPageProps) {
  const [student, setStudent] =
    useState<Student | null>(null)

  const [classSubjects, setClassSubjects] =
    useState<ClassSubject[]>([])

  const [timetables, setTimetables] =
    useState<Timetable[]>([])

  const [timetableEntries, setTimetableEntries] =
    useState<TimetableEntry[]>([])

  const [teachers, setTeachers] =
    useState<Teacher[]>([])

  const [subjects, setSubjects] =
    useState<Subject[]>([])

  const [attendanceRecords, setAttendanceRecords] =
    useState<AttendanceRecord[]>([])

  const [assessments, setAssessments] =
    useState<Assessment[]>([])

  const [assessmentResults, setAssessmentResults] =
    useState<AssessmentResult[]>([])

  const [internships, setInternships] =
    useState<Internship[]>([])

  const [companies, setCompanies] =
    useState<Company[]>([])

  const [lessons, setLessons] =
    useState<Lesson[]>([])

  const [lessonEntries, setLessonEntries] =
    useState<LessonEntry[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] =
    useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError(
        'La session élève est introuvable.',
      )
      setIsLoading(false)
      return
    }

    const { data: studentData, error: studentError } =
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
        .eq('user_id', user.id)
        .single()

    if (studentError || !studentData) {
      console.error(
        'Erreur de chargement du dossier élève :',
        studentError,
      )

      setError(
        'Le dossier scolaire associé à ce compte est inaccessible.',
      )
      setIsLoading(false)
      return
    }

    const loadedStudent =
      studentData as unknown as Student

    setStudent(loadedStudent)

    const [
      classSubjectsResult,
      timetablesResult,
      timetableEntriesResult,
      teachersResult,
      subjectsResult,
      attendanceResult,
      assessmentsResult,
      resultsResult,
      internshipsResult,
      companiesResult,
      lessonsResult,
      lessonEntriesResult,
    ] = await Promise.all([
      loadedStudent.class_id
        ? supabase
            .from('class_subjects')
            .select(`
              id,
              teacher_id,
              class_id,
              subject_id
            `)
            .eq(
              'class_id',
              loadedStudent.class_id,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      supabase
        .from('timetables')
        .select(`
          id,
          class_subject_id,
          day_of_week,
          starts_at,
          ends_at,
          room,
          academic_year,
          is_active
        `)
        .eq('is_active', true)
        .order('day_of_week')
        .order('starts_at'),

      supabase
        .from('timetable_entries')
        .select(`
          id,
          timetable_id,
          room,
          teacher_note,
          is_cancelled
        `),

      supabase
        .from('teachers')
        .select(`
          id,
          first_name,
          last_name
        `)
        .eq('is_active', true),

      supabase
        .from('subjects')
        .select(`
          id,
          name,
          short_name,
          color
        `)
        .eq('is_active', true),

      supabase
        .from('attendance_records')
        .select(`
          id,
          student_id,
          timetable_id,
          attendance_date,
          status,
          minutes_late,
          reason,
          is_justified,
          justification_note
        `)
        .eq('student_id', loadedStudent.id)
        .order('attendance_date', {
          ascending: false,
        }),

      supabase
        .from('assessments')
        .select(`
          id,
          class_subject_id,
          title,
          description,
          assessment_date,
          maximum_score,
          coefficient,
          period,
          is_published
        `)
        .eq('is_published', true)
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
          status,
          teacher_comment
        `)
        .eq('student_id', loadedStudent.id),

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
          student_report_status,
          final_grade
        `)
        .eq('student_id', loadedStudent.id)
        .order('start_date', {
          ascending: false,
        }),

      supabase
        .from('companies')
        .select(`
          id,
          name,
          city
        `),

      supabase
        .from('lessons')
        .select(`
          id,
          timetable_id,
          title,
          description,
          is_published,
          published_at
        `)
        .eq('is_published', true)
        .order('published_at', {
          ascending: false,
        }),

      supabase
        .from('lesson_entries')
        .select(`
          id,
          lesson_id,
          work_text,
          note,
          homework_due_date
        `),
    ])

    const errors = [
      classSubjectsResult.error,
      timetablesResult.error,
      timetableEntriesResult.error,
      teachersResult.error,
      subjectsResult.error,
      attendanceResult.error,
      assessmentsResult.error,
      resultsResult.error,
      internshipsResult.error,
      companiesResult.error,
      lessonsResult.error,
      lessonEntriesResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      console.error(
        'Erreur de chargement de l’espace élève :',
        errors,
      )

      setError(
        'Certaines données de votre espace n’ont pas pu être chargées.',
      )
    }

    setClassSubjects(
      (classSubjectsResult.data ??
        []) as ClassSubject[],
    )

    setTimetables(
      (timetablesResult.data ?? []) as Timetable[],
    )

    setTimetableEntries(
      (timetableEntriesResult.data ??
        []) as TimetableEntry[],
    )

    setTeachers(
      (teachersResult.data ?? []) as Teacher[],
    )

    setSubjects(
      (subjectsResult.data ?? []) as Subject[],
    )

    setAttendanceRecords(
      (attendanceResult.data ??
        []) as AttendanceRecord[],
    )

    setAssessments(
      (assessmentsResult.data ?? []) as Assessment[],
    )

    setAssessmentResults(
      (resultsResult.data ??
        []) as AssessmentResult[],
    )

    setInternships(
      (internshipsResult.data ?? []) as Internship[],
    )

    setCompanies(
      (companiesResult.data ?? []) as Company[],
    )

    setLessons(
      (lessonsResult.data ?? []) as Lesson[],
    )

    setLessonEntries(
      (lessonEntriesResult.data ??
        []) as LessonEntry[],
    )

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const classSubjectMap = useMemo(
    () =>
      new Map(
        classSubjects.map((item) => [
          item.id,
          item,
        ]),
      ),
    [classSubjects],
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

  const timetableMap = useMemo(
    () =>
      new Map(
        timetables.map((timetable) => [
          timetable.id,
          timetable,
        ]),
      ),
    [timetables],
  )

  const timetableEntryMap = useMemo(
    () =>
      new Map(
        timetableEntries.map((entry) => [
          entry.timetable_id,
          entry,
        ]),
      ),
    [timetableEntries],
  )

  const assessmentMap = useMemo(
    () =>
      new Map(
        assessments.map((assessment) => [
          assessment.id,
          assessment,
        ]),
      ),
    [assessments],
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

  const lessonEntryMap = useMemo(
    () =>
      new Map(
        lessonEntries.map((entry) => [
          entry.lesson_id,
          entry,
        ]),
      ),
    [lessonEntries],
  )

  const studentClass = student?.classes?.[0] ?? null

  const studentTimetables = useMemo(() => {
    const allowedLinkIds = new Set(
      classSubjects.map((item) => item.id),
    )

    return timetables.filter((timetable) =>
      allowedLinkIds.has(
        timetable.class_subject_id,
      ),
    )
  }, [classSubjects, timetables])

  const studentLessons = useMemo(() => {
    const allowedTimetableIds = new Set(
      studentTimetables.map(
        (timetable) => timetable.id,
      ),
    )

    return lessons.filter((lesson) =>
      allowedTimetableIds.has(
        lesson.timetable_id,
      ),
    )
  }, [lessons, studentTimetables])

  const studentAssessments = useMemo(() => {
    const allowedLinkIds = new Set(
      classSubjects.map((item) => item.id),
    )

    return assessments.filter((assessment) =>
      allowedLinkIds.has(
        assessment.class_subject_id,
      ),
    )
  }, [assessments, classSubjects])

  const resultByAssessment = useMemo(
    () =>
      new Map(
        assessmentResults.map((result) => [
          result.assessment_id,
          result,
        ]),
      ),
    [assessmentResults],
  )

  const absenceCount = attendanceRecords.filter(
    (record) =>
      record.status === 'absent' ||
      record.status === 'excused',
  ).length

  const lateCount = attendanceRecords.filter(
    (record) => record.status === 'late',
  ).length

  const homeworkCount = studentLessons.filter(
    (lesson) =>
      lessonEntryMap.get(lesson.id)
        ?.homework_due_date,
  ).length

  const normalizedAverage = useMemo(() => {
    const scores = assessmentResults
      .filter(
        (result) =>
          result.status === 'graded' &&
          result.score !== null,
      )
      .map((result) => {
        const assessment = assessmentMap.get(
          result.assessment_id,
        )

        if (
          !assessment ||
          assessment.maximum_score <= 0
        ) {
          return null
        }

        return (
          ((result.score ?? 0) /
            assessment.maximum_score) *
          20
        )
      })
      .filter(
        (score): score is number =>
          score !== null,
      )

    if (scores.length === 0) {
      return null
    }

    return (
      scores.reduce(
        (sum, score) => sum + score,
        0,
      ) / scores.length
    )
  }, [assessmentResults, assessmentMap])

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
    <main className="student-page">
      <header className="student-header">
        <div>
          <p className="student-kicker">
            ENT Saint Georges Coccinet
          </p>

          <h1>
            Bonjour, {firstName} {lastName}
          </h1>

          <p>
            Espace Élève
            {studentClass
              ? ` — ${studentClass.name}`
              : ''}
          </p>
        </div>

        <div className="student-header-actions">
          <button
            className="student-button"
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            {isLoading
              ? 'Chargement…'
              : 'Actualiser'}
          </button>

          <button
            className="student-button danger"
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

      <div className="student-content">
        {error && (
          <section
            className="student-message error"
            role="alert"
          >
            {error}
          </section>
        )}

        {isLoading && (
          <section className="student-card">
            <p className="student-empty">
              Chargement de votre espace…
            </p>
          </section>
        )}

        {!isLoading && student && (
          <>
            <section className="student-profile">
              <div>
                <span>Matricule</span>
                <strong>
                  {student.student_number}
                </strong>
              </div>

              <div>
                <span>Classe</span>
                <strong>
                  {studentClass?.name ??
                    'Non affecté'}
                </strong>
              </div>

              <div>
                <span>Niveau</span>
                <strong>
                  {studentClass?.level ?? '—'}
                </strong>
              </div>

              <div>
                <span>Année scolaire</span>
                <strong>
                  {studentClass?.school_year ?? '—'}
                </strong>
              </div>
            </section>

            <section className="student-stats">
              <article>
                <span>Cours hebdomadaires</span>
                <strong>
                  {studentTimetables.length}
                </strong>
              </article>

              <article>
                <span>Devoirs enregistrés</span>
                <strong>{homeworkCount}</strong>
              </article>

              <article>
                <span>Absences</span>
                <strong>{absenceCount}</strong>
              </article>

              <article>
                <span>Retards</span>
                <strong>{lateCount}</strong>
              </article>

              <article>
                <span>Moyenne / 20</span>
                <strong>
                  {normalizedAverage !== null
                    ? formatNumber(
                        normalizedAverage,
                      )
                    : '—'}
                </strong>
              </article>
            </section>

            <section className="student-card">
              <h2>Mon emploi du temps</h2>

              {studentTimetables.length === 0 ? (
                <p className="student-empty">
                  Aucun cours n’est disponible.
                </p>
              ) : (
                <div className="student-table-wrap">
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th>Jour</th>
                        <th>Horaire</th>
                        <th>Matière</th>
                        <th>Professeur</th>
                        <th>Salle</th>
                        <th>Statut</th>
                      </tr>
                    </thead>

                    <tbody>
                      {studentTimetables.map(
                        (timetable) => {
                          const link =
                            classSubjectMap.get(
                              timetable
                                .class_subject_id,
                            )

                          const teacher = link
                            ? teacherMap.get(
                                link.teacher_id,
                              )
                            : null

                          const subject = link
                            ? subjectMap.get(
                                link.subject_id,
                              )
                            : null

                          const entry =
                            timetableEntryMap.get(
                              timetable.id,
                            )

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
                                <span
                                  className="student-subject"
                                  style={{
                                    borderLeftColor:
                                      subject?.color ??
                                      '#64748b',
                                  }}
                                >
                                  {subject?.name ??
                                    'Matière inconnue'}
                                </span>
                              </td>

                              <td>
                                {teacher
                                  ? `${teacher.last_name} ${teacher.first_name}`
                                  : 'Professeur inconnu'}
                              </td>

                              <td>
                                {entry?.room ||
                                  timetable.room ||
                                  '—'}
                              </td>

                              <td>
                                <span
                                  className={
                                    entry?.is_cancelled
                                      ? 'student-badge red'
                                      : 'student-badge green'
                                  }
                                >
                                  {entry?.is_cancelled
                                    ? 'Annulé'
                                    : 'Maintenu'}
                                </span>
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

            <section className="student-card">
              <h2>Cahier de texte</h2>

              {studentLessons.length === 0 ? (
                <p className="student-empty">
                  Aucune séance publiée.
                </p>
              ) : (
                <div className="student-grid">
                  {studentLessons.map((lesson) => {
                    const timetable =
                      timetableMap.get(
                        lesson.timetable_id,
                      )

                    const link = timetable
                      ? classSubjectMap.get(
                          timetable.class_subject_id,
                        )
                      : null

                    const subject = link
                      ? subjectMap.get(
                          link.subject_id,
                        )
                      : null

                    const entry =
                      lessonEntryMap.get(lesson.id)

                    return (
                      <article
                        className="student-item"
                        key={lesson.id}
                      >
                        <div className="student-item-heading">
                          <span
                            className="student-subject-dot"
                            style={{
                              backgroundColor:
                                subject?.color ??
                                '#64748b',
                            }}
                          />

                          <span>
                            {subject?.name ??
                              'Matière inconnue'}
                          </span>
                        </div>

                        <h3>{lesson.title}</h3>

                        {lesson.description && (
                          <p>
                            {lesson.description}
                          </p>
                        )}

                        {entry?.work_text && (
                          <p>
                            <strong>
                              Travail réalisé :
                            </strong>{' '}
                            {entry.work_text}
                          </p>
                        )}

                        {entry?.note && (
                          <p>
                            <strong>Note :</strong>{' '}
                            {entry.note}
                          </p>
                        )}

                        <footer>
                          <span>
                            Devoir :{' '}
                            {entry?.homework_due_date
                              ? formatDate(
                                  entry.homework_due_date,
                                )
                              : 'Aucun'}
                          </span>
                        </footer>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="student-card">
              <h2>Mes absences et retards</h2>

              {attendanceRecords.length === 0 ? (
                <p className="student-empty">
                  Aucun événement de vie scolaire.
                </p>
              ) : (
                <div className="student-table-wrap">
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Statut</th>
                        <th>Motif</th>
                        <th>Justification</th>
                      </tr>
                    </thead>

                    <tbody>
                      {attendanceRecords.map(
                        (record) => (
                          <tr key={record.id}>
                            <td>
                              {formatDate(
                                record.attendance_date,
                              )}
                            </td>

                            <td>
                              <span
                                className={
                                  record.status ===
                                  'present'
                                    ? 'student-badge green'
                                    : record.status ===
                                        'absent'
                                      ? 'student-badge red'
                                      : record.status ===
                                          'late'
                                        ? 'student-badge orange'
                                        : 'student-badge blue'
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
                              {record.reason ||
                                'Aucun motif'}
                            </td>

                            <td>
                              {record.is_justified ||
                              record.status ===
                                'excused'
                                ? record.justification_note ||
                                  'Justifié'
                                : 'Non justifié'}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="student-card">
              <h2>Mes résultats publiés</h2>

              {studentAssessments.length === 0 ? (
                <p className="student-empty">
                  Aucun résultat publié.
                </p>
              ) : (
                <div className="student-table-wrap">
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Évaluation</th>
                        <th>Matière</th>
                        <th>Période</th>
                        <th>Résultat</th>
                        <th>Commentaire</th>
                      </tr>
                    </thead>

                    <tbody>
                      {studentAssessments.map(
                        (assessment) => {
                          const link =
                            classSubjectMap.get(
                              assessment
                                .class_subject_id,
                            )

                          const subject = link
                            ? subjectMap.get(
                                link.subject_id,
                              )
                            : null

                          const result =
                            resultByAssessment.get(
                              assessment.id,
                            )

                          return (
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
                                {subject?.name ??
                                  'Matière inconnue'}
                              </td>

                              <td>
                                {assessment.period}
                              </td>

                              <td>
                                {result ? (
                                  result.status ===
                                  'graded' ? (
                                    <strong>
                                      {formatNumber(
                                        result.score ?? 0,
                                      )}{' '}
                                      /{' '}
                                      {formatNumber(
                                        assessment.maximum_score,
                                      )}
                                    </strong>
                                  ) : (
                                    <span className="student-badge orange">
                                      {
                                        RESULT_STATUS_LABELS[
                                          result.status
                                        ]
                                      }
                                    </span>
                                  )
                                ) : (
                                  'Non renseigné'
                                )}
                              </td>

                              <td>
                                {result?.teacher_comment ||
                                  '—'}
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

            <section className="student-card">
              <h2>Mes stages</h2>

              {internships.length === 0 ? (
                <p className="student-empty">
                  Aucun stage enregistré.
                </p>
              ) : (
                <div className="student-grid">
                  {internships.map(
                    (internship) => {
                      const company =
                        companyMap.get(
                          internship.company_id,
                        )

                      return (
                        <article
                          className="student-item"
                          key={internship.id}
                        >
                          <div className="student-item-heading">
                            <span className="student-badge blue">
                              {
                                INTERNSHIP_STATUS_LABELS[
                                  internship.status
                                ]
                              }
                            </span>
                          </div>

                          <h3>
                            {internship.title}
                          </h3>

                          <p>
                            <strong>
                              Entreprise :
                            </strong>{' '}
                            {company?.name ??
                              'Entreprise'}
                            {company?.city
                              ? ` — ${company.city}`
                              : ''}
                          </p>

                          <p>
                            <strong>Période :</strong>{' '}
                            {formatDate(
                              internship.start_date,
                            )}{' '}
                            au{' '}
                            {formatDate(
                              internship.end_date,
                            )}
                          </p>

                          <p>
                            <strong>
                              Convention :
                            </strong>{' '}
                            {
                              internship.convention_status
                            }
                          </p>

                          <footer>
                            <span>
                              Note finale :{' '}
                              {internship.final_grade !==
                              null
                                ? `${formatNumber(
                                    internship.final_grade,
                                  )} / 20`
                                : 'Non noté'}
                            </span>
                          </footer>
                        </article>
                      )
                    },
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

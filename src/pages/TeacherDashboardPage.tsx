import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../lib/supabase'
import './TeacherDashboardPage.css'

type SchoolClass = {
  id: string
  name: string
  level: string
  school_year: string
}

type Teacher = {
  id: string
  employee_number: string
  first_name: string
  last_name: string
  email: string | null
  subject_id: string | null
  is_active: boolean
}

type Subject = {
  id: string
  name: string
  short_name: string
  color: string
}

type ClassSubject = {
  id: string
  teacher_id: string
  class_id: string
  subject_id: string
  academic_year: string
}

type Student = {
  id: string
  student_number: string
  first_name: string
  last_name: string
  class_id: string | null
  birth_date: string | null
  is_active: boolean
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

type TimetableEntry = {
  id: string
  timetable_id: string
  room: string | null
  teacher_note: string | null
  is_cancelled: boolean
}

type Lesson = {
  id: string
  timetable_id: string
  title: string
  description: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
}

type LessonEntry = {
  id: string
  lesson_id: string
  work_text: string | null
  note: string | null
  homework_due_date: string | null
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
  published_at: string | null
}

type ResultStatus =
  | 'graded'
  | 'absent'
  | 'excused'
  | 'not_submitted'

type AssessmentResult = {
  id: string
  assessment_id: string
  student_id: string
  score: number | null
  status: ResultStatus
  teacher_comment: string | null
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
}

type TeacherDashboardPageProps = {
  firstName: string
  lastName: string
  onSignOut: () => void
}

type AssignmentView = ClassSubject & {
  className: string
  classLevel: string
  subjectName: string
  subjectShortName: string
  subjectColor: string
}

type TimetableView = Timetable & {
  className: string
  subjectName: string
  subjectColor: string
  effectiveRoom: string
  isCancelled: boolean
  teacherNote: string
}

type LessonView = Lesson & {
  className: string
  subjectName: string
  subjectColor: string
  workText: string
  note: string
  homeworkDueDate: string | null
}

type AssessmentView = Assessment & {
  className: string
  subjectName: string
  subjectColor: string
  resultCount: number
  average: number | null
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

export function TeacherDashboardPage({
  firstName,
  lastName,
  onSignOut,
}: TeacherDashboardPageProps) {
  const [teacher, setTeacher] =
    useState<Teacher | null>(null)

  const [classSubjects, setClassSubjects] = useState<
    ClassSubject[]
  >([])

  const [classes, setClasses] =
    useState<SchoolClass[]>([])

  const [subjects, setSubjects] =
    useState<Subject[]>([])

  const [students, setStudents] =
    useState<Student[]>([])

  const [timetables, setTimetables] =
    useState<Timetable[]>([])

  const [timetableEntries, setTimetableEntries] =
    useState<TimetableEntry[]>([])

  const [lessons, setLessons] =
    useState<Lesson[]>([])

  const [lessonEntries, setLessonEntries] =
    useState<LessonEntry[]>([])

  const [assessments, setAssessments] =
    useState<Assessment[]>([])

  const [assessmentResults, setAssessmentResults] =
    useState<AssessmentResult[]>([])

  const [attendanceRecords, setAttendanceRecords] =
    useState<AttendanceRecord[]>([])

  const [selectedClassId, setSelectedClassId] =
    useState('ALL')

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
        'La session professeur est introuvable.',
      )
      setIsLoading(false)
      return
    }

    const {
      data: teacherData,
      error: teacherError,
    } = await supabase
      .from('teachers')
      .select(`
        id,
        employee_number,
        first_name,
        last_name,
        email,
        subject_id,
        is_active
      `)
      .eq('user_id', user.id)
      .single()

    if (teacherError) {
  console.error(
    'Erreur de chargement du professeur :',
    teacherError,
  )

  setError(
    `Le dossier enseignant est inaccessible : ${teacherError.message}`,
  )
  setIsLoading(false)
  return
}

if (!teacherData) {
  setError(
    'Aucun dossier enseignant n’est associé à ce compte.',
  )
  setIsLoading(false)
  return
}


    const loadedTeacher = teacherData as Teacher
    setTeacher(loadedTeacher)

    const [
      assignmentsResult,
      classesResult,
      subjectsResult,
      studentsResult,
      timetablesResult,
      timetableEntriesResult,
      lessonsResult,
      lessonEntriesResult,
      assessmentsResult,
      resultsResult,
    ] = await Promise.all([
      supabase
        .from('class_subjects')
        .select(`
          id,
          teacher_id,
          class_id,
          subject_id,
          academic_year
        `)
        .eq('teacher_id', loadedTeacher.id)
        .order('academic_year', {
          ascending: false,
        }),

      supabase
        .from('classes')
        .select(`
          id,
          name,
          level,
          school_year
        `)
        .eq('is_active', true)
        .order('name'),

      supabase
        .from('subjects')
        .select(`
          id,
          name,
          short_name,
          color
        `)
        .eq('is_active', true)
        .order('name'),

      supabase
        .from('students')
        .select(`
          id,
          student_number,
          first_name,
          last_name,
          class_id,
          birth_date,
          is_active
        `)
        .eq('is_active', true)
        .order('last_name')
        .order('first_name'),

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
        .from('timetable_entries')
        .select(`
          id,
          timetable_id,
          room,
          teacher_note,
          is_cancelled
        `),

      supabase
        .from('lessons')
        .select(`
          id,
          timetable_id,
          title,
          description,
          is_published,
          published_at,
          created_at
        `)
        .order('created_at', {
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
          is_published,
          published_at
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
          status,
          teacher_comment
        `),
    ])

    const initialErrors = [
      assignmentsResult.error,
      classesResult.error,
      subjectsResult.error,
      studentsResult.error,
      timetablesResult.error,
      timetableEntriesResult.error,
      lessonsResult.error,
      lessonEntriesResult.error,
      assessmentsResult.error,
      resultsResult.error,
    ].filter(Boolean)

    const loadedAssignments =
      (assignmentsResult.data ?? []) as ClassSubject[]

    const loadedClasses =
      (classesResult.data ?? []) as SchoolClass[]

    const loadedSubjects =
      (subjectsResult.data ?? []) as Subject[]

    const loadedStudents =
      (studentsResult.data ?? []) as Student[]

    const loadedTimetables =
      (timetablesResult.data ?? []) as Timetable[]

    const loadedEntries =
      (timetableEntriesResult.data ??
        []) as TimetableEntry[]

    const loadedLessons =
      (lessonsResult.data ?? []) as Lesson[]

    const loadedLessonEntries =
      (lessonEntriesResult.data ??
        []) as LessonEntry[]

    const loadedAssessments =
      (assessmentsResult.data ??
        []) as Assessment[]

    const loadedResults =
      (resultsResult.data ??
        []) as AssessmentResult[]

    setClassSubjects(loadedAssignments)
    setClasses(loadedClasses)
    setSubjects(loadedSubjects)
    setStudents(loadedStudents)
    setTimetables(loadedTimetables)
    setTimetableEntries(loadedEntries)
    setLessons(loadedLessons)
    setLessonEntries(loadedLessonEntries)
    setAssessments(loadedAssessments)
    setAssessmentResults(loadedResults)

    const assignedClassIds = new Set(
      loadedAssignments.map(
        (assignment) => assignment.class_id,
      ),
    )

    const visibleStudentIds = loadedStudents
      .filter(
        (student) =>
          student.class_id !== null &&
          assignedClassIds.has(student.class_id),
      )
      .map((student) => student.id)

    if (visibleStudentIds.length > 0) {
      const { data, error: attendanceError } =
        await supabase
          .from('attendance_records')
          .select(`
            id,
            student_id,
            timetable_id,
            attendance_date,
            status,
            minutes_late,
            reason,
            is_justified
          `)
          .in('student_id', visibleStudentIds)
          .order('attendance_date', {
            ascending: false,
          })
          .limit(100)

      if (attendanceError) {
        initialErrors.push(attendanceError)
      } else {
        setAttendanceRecords(
          (data ?? []) as AttendanceRecord[],
        )
      }
    } else {
      setAttendanceRecords([])
    }

    if (initialErrors.length > 0) {
      console.error(
        'Erreur de chargement de l’espace professeur :',
        initialErrors,
      )

      setError(
        'Certaines données de votre espace n’ont pas pu être chargées.',
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

  const assignmentViews = useMemo<AssignmentView[]>(
    () =>
      classSubjects.map((assignment) => {
        const schoolClass = classMap.get(
          assignment.class_id,
        )

        const subject = subjectMap.get(
          assignment.subject_id,
        )

        return {
          ...assignment,
          className:
            schoolClass?.name ?? 'Classe inconnue',
          classLevel:
            schoolClass?.level ?? '',
          subjectName:
            subject?.name ?? 'Matière inconnue',
          subjectShortName:
            subject?.short_name ?? '',
          subjectColor:
            subject?.color ?? '#64748b',
        }
      }),
    [classSubjects, classMap, subjectMap],
  )

  const visibleClassIds = useMemo(
    () =>
      new Set(
        classSubjects.map(
          (assignment) => assignment.class_id,
        ),
      ),
    [classSubjects],
  )

  const visibleStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          student.class_id !== null &&
          visibleClassIds.has(student.class_id),
      ),
    [students, visibleClassIds],
  )

  const filteredStudents = useMemo(
    () =>
      selectedClassId === 'ALL'
        ? visibleStudents
        : visibleStudents.filter(
            (student) =>
              student.class_id === selectedClassId,
          ),
    [visibleStudents, selectedClassId],
  )

  const timetableViews = useMemo<TimetableView[]>(
    () =>
      timetables
        .filter((timetable) =>
          assignmentMap.has(
            timetable.class_subject_id,
          ),
        )
        .map((timetable) => {
          const assignment =
            assignmentMap.get(
              timetable.class_subject_id,
            )

          const schoolClass = assignment
            ? classMap.get(assignment.class_id)
            : null

          const subject = assignment
            ? subjectMap.get(assignment.subject_id)
            : null

          const entry = timetableEntryMap.get(
            timetable.id,
          )

          return {
            ...timetable,
            className:
              schoolClass?.name ?? 'Classe inconnue',
            subjectName:
              subject?.name ?? 'Matière inconnue',
            subjectColor:
              subject?.color ?? '#64748b',
            effectiveRoom:
              entry?.room || timetable.room || '—',
            isCancelled:
              entry?.is_cancelled ?? false,
            teacherNote:
              entry?.teacher_note ?? '',
          }
        }),
    [
      timetables,
      assignmentMap,
      classMap,
      subjectMap,
      timetableEntryMap,
    ],
  )

  const lessonViews = useMemo<LessonView[]>(
    () =>
      lessons
        .filter((lesson) => {
          const timetable = timetableMap.get(
            lesson.timetable_id,
          )

          return timetable
            ? assignmentMap.has(
                timetable.class_subject_id,
              )
            : false
        })
        .map((lesson) => {
          const timetable = timetableMap.get(
            lesson.timetable_id,
          )

          const assignment = timetable
            ? assignmentMap.get(
                timetable.class_subject_id,
              )
            : null

          const schoolClass = assignment
            ? classMap.get(assignment.class_id)
            : null

          const subject = assignment
            ? subjectMap.get(assignment.subject_id)
            : null

          const entry = lessonEntryMap.get(lesson.id)

          return {
            ...lesson,
            className:
              schoolClass?.name ?? 'Classe inconnue',
            subjectName:
              subject?.name ?? 'Matière inconnue',
            subjectColor:
              subject?.color ?? '#64748b',
            workText: entry?.work_text ?? '',
            note: entry?.note ?? '',
            homeworkDueDate:
              entry?.homework_due_date ?? null,
          }
        }),
    [
      lessons,
      timetableMap,
      assignmentMap,
      classMap,
      subjectMap,
      lessonEntryMap,
    ],
  )

  const assessmentViews = useMemo<
    AssessmentView[]
  >(
    () =>
      assessments
        .filter((assessment) =>
          assignmentMap.has(
            assessment.class_subject_id,
          ),
        )
        .map((assessment) => {
          const assignment =
            assignmentMap.get(
              assessment.class_subject_id,
            )

          const schoolClass = assignment
            ? classMap.get(assignment.class_id)
            : null

          const subject = assignment
            ? subjectMap.get(assignment.subject_id)
            : null

          const relatedResults =
            assessmentResults.filter(
              (result) =>
                result.assessment_id ===
                assessment.id,
            )

          const gradedResults =
            relatedResults.filter(
              (result) =>
                result.status === 'graded' &&
                result.score !== null,
            )

          const average =
            gradedResults.length > 0
              ? gradedResults.reduce(
                  (sum, result) =>
                    sum + (result.score ?? 0),
                  0,
                ) / gradedResults.length
              : null

          return {
            ...assessment,
            className:
              schoolClass?.name ??
              'Classe inconnue',
            subjectName:
              subject?.name ??
              'Matière inconnue',
            subjectColor:
              subject?.color ?? '#64748b',
            resultCount: relatedResults.length,
            average,
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

  const uniqueClasses = useMemo(
    () =>
      Array.from(visibleClassIds)
        .map((classId) => classMap.get(classId))
        .filter(
          (
            schoolClass,
          ): schoolClass is SchoolClass =>
            schoolClass !== undefined,
        )
        .sort((firstClass, secondClass) =>
          firstClass.name.localeCompare(
            secondClass.name,
            'fr',
          ),
        ),
    [visibleClassIds, classMap],
  )

  const mainSubject = teacher?.subject_id
    ? subjectMap.get(teacher.subject_id) ?? null
    : null

  const publishedLessonCount =
    lessonViews.filter(
      (lesson) => lesson.is_published,
    ).length

  const publishedAssessmentCount =
    assessmentViews.filter(
      (assessment) => assessment.is_published,
    ).length

  const recentAttendance =
    attendanceRecords.slice(0, 12)

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
    <main className="teacher-page">
      <header className="teacher-header">
        <div>
          <p className="teacher-kicker">
            ENT Saint Georges Coccinet
          </p>

          <h1>
            Bonjour, {firstName} {lastName}
          </h1>

          <p>
            Espace Professeur
            {mainSubject
              ? ` — ${mainSubject.name}`
              : ''}
          </p>
        </div>

        <div className="teacher-header-actions">
          <button
            className="teacher-button"
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            {isLoading
              ? 'Chargement…'
              : 'Actualiser'}
          </button>

          <button
            className="teacher-button danger"
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

      <div className="teacher-content">
        {error && (
          <section
            className="teacher-message error"
            role="alert"
          >
            {error}
          </section>
        )}

        {isLoading && (
          <section className="teacher-card">
            <p className="teacher-empty">
              Chargement de votre espace…
            </p>
          </section>
        )}

        {!isLoading && teacher && (
          <>
            <section className="teacher-profile">
              <div>
                <span>Matricule</span>
                <strong>
                  {teacher.employee_number}
                </strong>
              </div>

              <div>
                <span>Matière principale</span>
                <strong>
                  {mainSubject?.name ?? '—'}
                </strong>
              </div>

              <div>
                <span>Adresse e-mail</span>
                <strong>
                  {teacher.email ?? 'Non renseignée'}
                </strong>
              </div>

              <div>
                <span>Classes attribuées</span>
                <strong>
                  {uniqueClasses.length}
                </strong>
              </div>
            </section>

            <section className="teacher-stats">
              <article>
                <span>Affectations</span>
                <strong>
                  {assignmentViews.length}
                </strong>
              </article>

              <article>
                <span>Élèves suivis</span>
                <strong>
                  {visibleStudents.length}
                </strong>
              </article>

              <article>
                <span>Cours programmés</span>
                <strong>
                  {timetableViews.length}
                </strong>
              </article>

              <article>
                <span>Séances publiées</span>
                <strong>
                  {publishedLessonCount}
                </strong>
              </article>

              <article>
                <span>Évaluations publiées</span>
                <strong>
                  {publishedAssessmentCount}
                </strong>
              </article>
            </section>

            <section className="teacher-card">
              <h2>Mes affectations</h2>

              {assignmentViews.length === 0 ? (
                <p className="teacher-empty">
                  Aucune affectation n’est disponible.
                </p>
              ) : (
                <div className="teacher-grid">
                  {assignmentViews.map(
                    (assignment) => (
                      <article
                        className="teacher-item"
                        key={assignment.id}
                      >
                        <span
                          className="teacher-subject-dot"
                          style={{
                            backgroundColor:
                              assignment.subjectColor,
                          }}
                        />

                        <h3>
                          {assignment.subjectName}
                        </h3>

                        <p>
                          <strong>Classe :</strong>{' '}
                          {assignment.className}
                          {assignment.classLevel
                            ? ` — ${assignment.classLevel}`
                            : ''}
                        </p>

                        <footer>
                          {assignment.academic_year}
                        </footer>
                      </article>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="teacher-card">
              <h2>Mon emploi du temps</h2>

              {timetableViews.length === 0 ? (
                <p className="teacher-empty">
                  Aucun cours n’est programmé.
                </p>
              ) : (
                <div className="teacher-table-wrap">
                  <table className="teacher-table">
                    <thead>
                      <tr>
                        <th>Jour</th>
                        <th>Horaire</th>
                        <th>Classe</th>
                        <th>Matière</th>
                        <th>Salle</th>
                        <th>Statut</th>
                        <th>Note</th>
                      </tr>
                    </thead>

                    <tbody>
                      {timetableViews.map(
                        (timetable) => (
                          <tr key={timetable.id}>
                            <td>
                              <strong>
                                {DAY_LABELS[
                                  timetable.day_of_week
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
                              {timetable.className}
                            </td>

                            <td>
                              <span
                                className="teacher-subject"
                                style={{
                                  borderLeftColor:
                                    timetable
                                      .subjectColor,
                                }}
                              >
                                {
                                  timetable.subjectName
                                }
                              </span>
                            </td>

                            <td>
                              {
                                timetable.effectiveRoom
                              }
                            </td>

                            <td>
                              <span
                                className={
                                  timetable.isCancelled
                                    ? 'teacher-badge red'
                                    : timetable.is_active
                                      ? 'teacher-badge green'
                                      : 'teacher-badge orange'
                                }
                              >
                                {timetable.isCancelled
                                  ? 'Annulé'
                                  : timetable.is_active
                                    ? 'Actif'
                                    : 'Inactif'}
                              </span>
                            </td>

                            <td>
                              {timetable.teacherNote ||
                                '—'}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="teacher-card">
              <div className="teacher-section-heading">
                <div>
                  <h2>Élèves de mes classes</h2>

                  <p>
                    {filteredStudents.length}{' '}
                    {filteredStudents.length > 1
                      ? 'élèves affichés'
                      : 'élève affiché'}
                  </p>
                </div>

                <select
                  className="teacher-select"
                  value={selectedClassId}
                  onChange={(event) =>
                    setSelectedClassId(
                      event.target.value,
                    )
                  }
                >
                  <option value="ALL">
                    Toutes mes classes
                  </option>

                  {uniqueClasses.map(
                    (schoolClass) => (
                      <option
                        key={schoolClass.id}
                        value={schoolClass.id}
                      >
                        {schoolClass.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {filteredStudents.length === 0 ? (
                <p className="teacher-empty">
                  Aucun élève n’est disponible.
                </p>
              ) : (
                <div className="teacher-table-wrap">
                  <table className="teacher-table">
                    <thead>
                      <tr>
                        <th>Matricule</th>
                        <th>Nom</th>
                        <th>Prénom</th>
                        <th>Classe</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredStudents.map(
                        (student) => (
                          <tr key={student.id}>
                            <td>
                              <span className="teacher-badge blue">
                                {
                                  student.student_number
                                }
                              </span>
                            </td>

                            <td>
                              <strong>
                                {student.last_name}
                              </strong>
                            </td>

                            <td>
                              {student.first_name}
                            </td>

                            <td>
                              {student.class_id
                                ? classMap.get(
                                    student.class_id,
                                  )?.name ??
                                  'Classe inconnue'
                                : 'Non affecté'}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="teacher-card">
              <h2>Mon cahier de texte</h2>

              {lessonViews.length === 0 ? (
                <p className="teacher-empty">
                  Aucune séance n’est enregistrée.
                </p>
              ) : (
                <div className="teacher-grid">
                  {lessonViews.map((lesson) => (
                    <article
                      className="teacher-item"
                      key={lesson.id}
                    >
                      <div className="teacher-item-heading">
                        <span
                          className="teacher-subject-dot"
                          style={{
                            backgroundColor:
                              lesson.subjectColor,
                          }}
                        />

                        <span>
                          {lesson.subjectName} —{' '}
                          {lesson.className}
                        </span>
                      </div>

                      <h3>{lesson.title}</h3>

                      {lesson.description && (
                        <p>
                          {lesson.description}
                        </p>
                      )}

                      {lesson.workText && (
                        <p>
                          <strong>
                            Travail réalisé :
                          </strong>{' '}
                          {lesson.workText}
                        </p>
                      )}

                      {lesson.note && (
                        <p>
                          <strong>Note :</strong>{' '}
                          {lesson.note}
                        </p>
                      )}

                      <footer className="teacher-item-footer">
                        <span
                          className={
                            lesson.is_published
                              ? 'teacher-badge green'
                              : 'teacher-badge orange'
                          }
                        >
                          {lesson.is_published
                            ? 'Publié'
                            : 'Brouillon'}
                        </span>

                        <span>
                          Devoir :{' '}
                          {lesson.homeworkDueDate
                            ? formatDate(
                                lesson.homeworkDueDate,
                              )
                            : 'Aucun'}
                        </span>
                      </footer>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="teacher-card">
              <h2>Mes évaluations</h2>

              {assessmentViews.length === 0 ? (
                <p className="teacher-empty">
                  Aucune évaluation n’est enregistrée.
                </p>
              ) : (
                <div className="teacher-table-wrap">
                  <table className="teacher-table teacher-assessment-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Évaluation</th>
                        <th>Classe</th>
                        <th>Matière</th>
                        <th>Barème</th>
                        <th>Coefficient</th>
                        <th>Résultats</th>
                        <th>Moyenne</th>
                        <th>Publication</th>
                      </tr>
                    </thead>

                    <tbody>
                      {assessmentViews.map(
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
                              <br />
                              <small>
                                {assessment.period}
                              </small>
                            </td>

                            <td>
                              {assessment.className}
                            </td>

                            <td>
                              <span
                                className="teacher-subject"
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
                              /{' '}
                              {formatNumber(
                                assessment.maximum_score,
                              )}
                            </td>

                            <td>
                              ×{' '}
                              {formatNumber(
                                assessment.coefficient,
                              )}
                            </td>

                            <td>
                              {assessment.resultCount}
                            </td>

                            <td>
                              {assessment.average !==
                              null
                                ? `${formatNumber(
                                    assessment.average,
                                  )} / ${formatNumber(
                                    assessment.maximum_score,
                                  )}`
                                : '—'}
                            </td>

                            <td>
                              <span
                                className={
                                  assessment.is_published
                                    ? 'teacher-badge green'
                                    : 'teacher-badge orange'
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

            <section className="teacher-card">
              <h2>Vie scolaire récente</h2>

              {recentAttendance.length === 0 ? (
                <p className="teacher-empty">
                  Aucun événement récent.
                </p>
              ) : (
                <div className="teacher-table-wrap">
                  <table className="teacher-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Élève</th>
                        <th>Classe</th>
                        <th>Statut</th>
                        <th>Motif</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentAttendance.map(
                        (record) => {
                          const student =
                            visibleStudents.find(
                              (item) =>
                                item.id ===
                                record.student_id,
                            )

                          return (
                            <tr key={record.id}>
                              <td>
                                {formatDate(
                                  record
                                    .attendance_date,
                                )}
                              </td>

                              <td>
                                {student
                                  ? `${student.last_name} ${student.first_name}`
                                  : 'Élève inconnu'}
                              </td>

                              <td>
                                {student?.class_id
                                  ? classMap.get(
                                      student.class_id,
                                    )?.name ??
                                    'Classe inconnue'
                                  : '—'}
                              </td>

                              <td>
                                <span
                                  className={
                                    record.status ===
                                    'present'
                                      ? 'teacher-badge green'
                                      : record.status ===
                                          'absent'
                                        ? 'teacher-badge red'
                                        : record.status ===
                                            'late'
                                          ? 'teacher-badge orange'
                                          : 'teacher-badge blue'
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
                            </tr>
                          )
                        },
                      )}
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

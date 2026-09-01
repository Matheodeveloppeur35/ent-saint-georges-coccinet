import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import './SchoolLifeDashboardPage.css'

type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused'

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
  first_name: string
  last_name: string
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
  recorded_by: string | null
  created_at: string
  updated_at: string
}

type AttendanceView = AttendanceRecord & {
  studentName: string
  studentNumber: string
  className: string
  courseLabel: string
}

type SchoolLifeDashboardPageProps = {
  firstName: string
  lastName: string
  onSignOut: () => void
}

const STATUS_LABELS: Record<
  AttendanceStatus,
  string
> = {
  present: 'Présent',
  absent: 'Absent',
  late: 'En retard',
  excused: 'Absence autorisée',
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

function getLocalDateValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset()

  return new Date(now.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10)
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

function getStatusClass(status: AttendanceStatus) {
  if (status === 'present') {
    return 'school-life-badge green'
  }

  if (status === 'absent') {
    return 'school-life-badge red'
  }

  if (status === 'late') {
    return 'school-life-badge orange'
  }

  return 'school-life-badge blue'
}

export function SchoolLifeDashboardPage({
  firstName,
  lastName,
  onSignOut,
}: SchoolLifeDashboardPageProps) {
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

  const [records, setRecords] =
    useState<AttendanceRecord[]>([])

  const [studentId, setStudentId] = useState('')
  const [timetableId, setTimetableId] = useState('')

  const [attendanceDate, setAttendanceDate] =
    useState(getLocalDateValue())

  const [status, setStatus] =
    useState<AttendanceStatus>('present')

  const [minutesLate, setMinutesLate] = useState('')
  const [reason, setReason] = useState('')

  const [isJustified, setIsJustified] =
    useState(false)

  const [justificationNote, setJustificationNote] =
    useState('')

  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] =
    useState('ALL')

  const [statusFilter, setStatusFilter] =
    useState<'ALL' | AttendanceStatus>('ALL')

  const [dateFilter, setDateFilter] =
    useState(getLocalDateValue())

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [isSigningOut, setIsSigningOut] =
    useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')

    const [
      classesResult,
      studentsResult,
      teachersResult,
      subjectsResult,
      assignmentsResult,
      timetablesResult,
      attendanceResult,
    ] = await Promise.all([
      supabase
        .from('classes')
        .select(`
          id,
          name,
          level,
          school_year,
          is_active
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
          is_active
        `)
        .eq('is_active', true)
        .order('last_name')
        .order('first_name'),

      supabase
        .from('teachers')
        .select(`
          id,
          first_name,
          last_name
        `)
        .eq('is_active', true)
        .order('last_name')
        .order('first_name'),

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
        .from('class_subjects')
        .select(`
          id,
          teacher_id,
          class_id,
          subject_id
        `),

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
          justification_note,
          recorded_by,
          created_at,
          updated_at
        `)
        .order('attendance_date', {
          ascending: false,
        })
        .order('created_at', {
          ascending: false,
        }),
    ])

    const errors = [
      classesResult.error,
      studentsResult.error,
      teachersResult.error,
      subjectsResult.error,
      assignmentsResult.error,
      timetablesResult.error,
      attendanceResult.error,
    ].filter(Boolean)

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

    setRecords(
      (attendanceResult.data ??
        []) as AttendanceRecord[],
    )

    if (errors.length > 0) {
      console.error(
        'Erreur de chargement de la vie scolaire :',
        errors,
      )

      setError(
        'Certaines données de la vie scolaire n’ont pas pu être chargées.',
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

  function getCourseLabel(
    selectedTimetableId: string,
  ) {
    const timetable = timetableMap.get(
      selectedTimetableId,
    )

    if (!timetable) {
      return 'Cours introuvable'
    }

    const assignment = assignmentMap.get(
      timetable.class_subject_id,
    )

    const schoolClass = assignment
      ? classMap.get(assignment.class_id)
      : null

    const teacher = assignment
      ? teacherMap.get(assignment.teacher_id)
      : null

    const subject = assignment
      ? subjectMap.get(assignment.subject_id)
      : null

    return [
      DAY_LABELS[timetable.day_of_week] ??
        'Jour inconnu',
      `${formatTime(timetable.starts_at)}–${formatTime(
        timetable.ends_at,
      )}`,
      schoolClass?.name ?? 'Classe inconnue',
      subject?.name ?? 'Matière inconnue',
      teacher
        ? `${teacher.last_name} ${teacher.first_name}`
        : 'Professeur inconnu',
    ].join(' — ')
  }

  const attendanceViews = useMemo<
    AttendanceView[]
  >(
    () =>
      records.map((record) => {
        const student = studentMap.get(
          record.student_id,
        )

        const schoolClass = student?.class_id
          ? classMap.get(student.class_id)
          : null

        return {
          ...record,
          studentName: student
            ? `${student.last_name} ${student.first_name}`
            : 'Élève inconnu',
          studentNumber:
            student?.student_number ?? '—',
          className:
            schoolClass?.name ?? 'Non affecté',
          courseLabel: record.timetable_id
            ? getCourseLabel(record.timetable_id)
            : 'Aucun cours associé',
        }
      }),
    [
      records,
      studentMap,
      classMap,
      timetableMap,
      assignmentMap,
      teacherMap,
      subjectMap,
    ],
  )

  const availableTimetables = useMemo(() => {
    if (!studentId) {
      return timetables
    }

    const selectedStudent =
      studentMap.get(studentId)

    if (!selectedStudent?.class_id) {
      return []
    }

    return timetables.filter((timetable) => {
      const assignment = assignmentMap.get(
        timetable.class_subject_id,
      )

      return (
        assignment?.class_id ===
        selectedStudent.class_id
      )
    })
  }, [
    studentId,
    timetables,
    studentMap,
    assignmentMap,
  ])

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase('fr')

    return attendanceViews.filter((record) => {
      const searchableText = [
        record.studentName,
        record.studentNumber,
        record.className,
        record.courseLabel,
        record.reason ?? '',
        record.justification_note ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase('fr')

      const matchesSearch =
        normalizedSearch === '' ||
        searchableText.includes(normalizedSearch)

      const matchesClass =
        classFilter === 'ALL' ||
        record.className === classFilter

      const matchesStatus =
        statusFilter === 'ALL' ||
        record.status === statusFilter

      const matchesDate =
        dateFilter === '' ||
        record.attendance_date === dateFilter

      return (
        matchesSearch &&
        matchesClass &&
        matchesStatus &&
        matchesDate
      )
    })
  }, [
    attendanceViews,
    search,
    classFilter,
    statusFilter,
    dateFilter,
  ])

  const today = getLocalDateValue()

  const todayRecords = attendanceViews.filter(
    (record) => record.attendance_date === today,
  )

  const presentCount = todayRecords.filter(
    (record) => record.status === 'present',
  ).length

  const absentCount = todayRecords.filter(
    (record) => record.status === 'absent',
  ).length

  const lateCount = todayRecords.filter(
    (record) => record.status === 'late',
  ).length

  const justifiedCount = todayRecords.filter(
    (record) =>
      record.is_justified ||
      record.status === 'excused',
  ).length

  function handleStatusChange(
    nextStatus: AttendanceStatus,
  ) {
    setStatus(nextStatus)

    if (nextStatus !== 'late') {
      setMinutesLate('')
    }

    if (nextStatus === 'present') {
      setIsJustified(false)
      setJustificationNote('')
    }

    if (nextStatus === 'excused') {
      setIsJustified(true)
    }
  }

  async function handleSaveAttendance(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!studentId) {
      setError('Choisissez un élève.')
      return
    }

    if (!attendanceDate) {
      setError('La date est obligatoire.')
      return
    }

    const parsedMinutes =
      status === 'late'
        ? Number(minutesLate)
        : null

    if (
      status === 'late' &&
      (
        minutesLate.trim() === '' ||
        !Number.isInteger(parsedMinutes) ||
        parsedMinutes === null ||
        parsedMinutes <= 0
      )
    ) {
      setError(
        'Indiquez un nombre de minutes de retard supérieur à zéro.',
      )
      return
    }

    const recordIsJustified =
      status === 'excused' || isJustified

    if (
      recordIsJustified &&
      !justificationNote.trim()
    ) {
      setError(
        'Ajoutez une note de justification.',
      )
      return
    }

    setIsSaving(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError(
        'La session de vie scolaire est introuvable.',
      )
      setIsSaving(false)
      return
    }

    const payload = {
      student_id: studentId,
      timetable_id: timetableId || null,
      attendance_date: attendanceDate,
      status,
      minutes_late: parsedMinutes,
      reason: reason.trim() || null,
      is_justified: recordIsJustified,
      justification_note:
        justificationNote.trim() || null,
      recorded_by: user.id,
    }

    let existingQuery = supabase
      .from('attendance_records')
      .select('id')
      .eq('student_id', studentId)
      .eq('attendance_date', attendanceDate)

    existingQuery = timetableId
      ? existingQuery.eq(
          'timetable_id',
          timetableId,
        )
      : existingQuery.is('timetable_id', null)

    const {
      data: existingRecords,
      error: checkError,
    } = await existingQuery.limit(1)

    if (checkError) {
      setError(
        `La vérification a échoué : ${checkError.message}`,
      )
      setIsSaving(false)
      return
    }

    const existingRecord = existingRecords?.[0]

    const { error: saveError } = existingRecord
      ? await supabase
          .from('attendance_records')
          .update(payload)
          .eq('id', existingRecord.id)
      : await supabase
          .from('attendance_records')
          .insert(payload)

    if (saveError) {
      console.error(
        'Erreur d’enregistrement de la présence :',
        saveError,
      )

      setError(
        `L’enregistrement a échoué : ${saveError.message}`,
      )
    } else {
      setStudentId('')
      setTimetableId('')
      setAttendanceDate(getLocalDateValue())
      setStatus('present')
      setMinutesLate('')
      setReason('')
      setIsJustified(false)
      setJustificationNote('')

      setSuccess(
        existingRecord
          ? 'L’enregistrement a été mis à jour.'
          : 'La présence a été enregistrée.',
      )

      await loadData()
    }

    setIsSaving(false)
  }

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
    <main className="school-life-page">
      <header className="school-life-header">
        <div>
          <p className="school-life-kicker">
            ENT Saint Georges Coccinet
          </p>

          <h1>
            Bonjour, {firstName} {lastName}
          </h1>

          <p>
            Espace Vie scolaire — Suivi des présences
          </p>
        </div>

        <div className="school-life-header-actions">
          <button
            className="school-life-button"
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            {isLoading
              ? 'Chargement…'
              : 'Actualiser'}
          </button>

          <button
            className="school-life-button danger"
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

      <div className="school-life-content">
        {error && (
          <section
            className="school-life-message error"
            role="alert"
          >
            {error}
          </section>
        )}

        {success && (
          <section
            className="school-life-message success"
            role="status"
          >
            {success}
          </section>
        )}

        {isLoading && (
          <section className="school-life-card">
            <p className="school-life-empty">
              Chargement de la vie scolaire…
            </p>
          </section>
        )}

        {!isLoading && (
          <>
            <section className="school-life-stats">
              <article>
                <span>Élèves actifs</span>
                <strong>{students.length}</strong>
              </article>

              <article>
                <span>Présents aujourd’hui</span>
                <strong>{presentCount}</strong>
              </article>

              <article>
                <span>Absents aujourd’hui</span>
                <strong>{absentCount}</strong>
              </article>

              <article>
                <span>Retards aujourd’hui</span>
                <strong>{lateCount}</strong>
              </article>

              <article>
                <span>Justifiés aujourd’hui</span>
                <strong>{justifiedCount}</strong>
              </article>
            </section>

            <section className="school-life-card">
              <h2>Enregistrer une présence</h2>

              <form
                className="school-life-form"
                onSubmit={handleSaveAttendance}
              >
                <label htmlFor="school-life-student">
                  Élève

                  <select
                    id="school-life-student"
                    value={studentId}
                    onChange={(event) => {
                      setStudentId(
                        event.target.value,
                      )
                      setTimetableId('')
                    }}
                    required
                  >
                    <option value="">
                      Choisir un élève
                    </option>

                    {students.map((student) => {
                      const schoolClass =
                        student.class_id
                          ? classMap.get(
                              student.class_id,
                            )
                          : null

                      return (
                        <option
                          key={student.id}
                          value={student.id}
                        >
                          {student.last_name}{' '}
                          {student.first_name} —{' '}
                          {student.student_number}
                          {schoolClass
                            ? ` — ${schoolClass.name}`
                            : ''}
                        </option>
                      )
                    })}
                  </select>
                </label>

                <label htmlFor="school-life-date">
                  Date

                  <input
                    id="school-life-date"
                    type="date"
                    value={attendanceDate}
                    onChange={(event) =>
                      setAttendanceDate(
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label
                  className="full-width"
                  htmlFor="school-life-course"
                >
                  Cours associé (optionnel)

                  <select
                    id="school-life-course"
                    value={timetableId}
                    onChange={(event) =>
                      setTimetableId(
                        event.target.value,
                      )
                    }
                    disabled={!studentId}
                  >
                    <option value="">
                      Aucun cours associé
                    </option>

                    {availableTimetables.map(
                      (timetable) => (
                        <option
                          key={timetable.id}
                          value={timetable.id}
                        >
                          {getCourseLabel(
                            timetable.id,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label htmlFor="school-life-status">
                  Statut

                  <select
                    id="school-life-status"
                    value={status}
                    onChange={(event) =>
                      handleStatusChange(
                        event.target
                          .value as AttendanceStatus,
                      )
                    }
                    required
                  >
                    <option value="present">
                      Présent
                    </option>
                    <option value="absent">
                      Absent
                    </option>
                    <option value="late">
                      En retard
                    </option>
                    <option value="excused">
                      Absence autorisée
                    </option>
                  </select>
                </label>

                {status === 'late' && (
                  <label htmlFor="school-life-minutes">
                    Minutes de retard

                    <input
                      id="school-life-minutes"
                      type="number"
                      min="1"
                      max="600"
                      step="1"
                      value={minutesLate}
                      onChange={(event) =>
                        setMinutesLate(
                          event.target.value,
                        )
                      }
                      required
                    />
                  </label>
                )}

                <label
                  className="full-width"
                  htmlFor="school-life-reason"
                >
                  Motif ou observation

                  <textarea
                    id="school-life-reason"
                    rows={3}
                    value={reason}
                    onChange={(event) =>
                      setReason(event.target.value)
                    }
                    placeholder="Ajoutez une observation…"
                  />
                </label>

                {status !== 'present' && (
                  <>
                    <label className="school-life-checkbox">
                      <input
                        type="checkbox"
                        checked={
                          status === 'excused' ||
                          isJustified
                        }
                        onChange={(event) =>
                          setIsJustified(
                            event.target.checked,
                          )
                        }
                        disabled={
                          status === 'excused'
                        }
                      />

                      <span>Situation justifiée</span>
                    </label>

                    {(status === 'excused' ||
                      isJustified) && (
                      <label
                        className="full-width"
                        htmlFor="school-life-justification"
                      >
                        Justification

                        <textarea
                          id="school-life-justification"
                          rows={3}
                          value={justificationNote}
                          onChange={(event) =>
                            setJustificationNote(
                              event.target.value,
                            )
                          }
                          placeholder="Précisez la justification…"
                          required
                        />
                      </label>
                    )}
                  </>
                )}

                <div className="full-width">
                  <button
                    className="school-life-button primary"
                    type="submit"
                    disabled={
                      isSaving ||
                      students.length === 0
                    }
                  >
                    {isSaving
                      ? 'Enregistrement…'
                      : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </section>

            <section className="school-life-card">
              <div className="school-life-section-heading">
                <div>
                  <h2>Registre de vie scolaire</h2>

                  <p>
                    {filteredRecords.length}{' '}
                    {filteredRecords.length > 1
                      ? 'événements affichés'
                      : 'événement affiché'}
                  </p>
                </div>

                <button
                  className="school-life-button"
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setClassFilter('ALL')
                    setStatusFilter('ALL')
                    setDateFilter('')
                  }}
                >
                  Réinitialiser les filtres
                </button>
              </div>

              <div className="school-life-filters">
                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Rechercher un élève ou un motif…"
                />

                <select
                  value={classFilter}
                  onChange={(event) =>
                    setClassFilter(
                      event.target.value,
                    )
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
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as
                        | 'ALL'
                        | AttendanceStatus,
                    )
                  }
                >
                  <option value="ALL">
                    Tous les statuts
                  </option>

                  {Object.entries(
                    STATUS_LABELS,
                  ).map(([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(
                      event.target.value,
                    )
                  }
                />
              </div>

              {filteredRecords.length === 0 ? (
                <p className="school-life-empty">
                  Aucun événement ne correspond aux
                  filtres sélectionnés.
                </p>
              ) : (
                <div className="school-life-table-wrap">
                  <table className="school-life-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Élève</th>
                        <th>Classe</th>
                        <th>Cours</th>
                        <th>Statut</th>
                        <th>Motif</th>
                        <th>Justification</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRecords.map(
                        (record) => (
                          <tr key={record.id}>
                            <td>
                              <strong>
                                {formatDate(
                                  record
                                    .attendance_date,
                                )}
                              </strong>
                            </td>

                            <td>
                              <div className="school-life-cell-stack">
                                <strong>
                                  {record.studentName}
                                </strong>

                                <small>
                                  {
                                    record.studentNumber
                                  }
                                </small>
                              </div>
                            </td>

                            <td>
                              {record.className}
                            </td>

                            <td>
                              <span className="school-life-course-label">
                                {record.courseLabel}
                              </span>
                            </td>

                            <td>
                              <span
                                className={getStatusClass(
                                  record.status,
                                )}
                              >
                                {
                                  STATUS_LABELS[
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
                              {record.is_justified ||
                              record.status ===
                                'excused' ? (
                                <div className="school-life-cell-stack">
                                  <span className="school-life-badge green">
                                    Justifié
                                  </span>

                                  {record.justification_note && (
                                    <small>
                                      {
                                        record.justification_note
                                      }
                                    </small>
                                  )}
                                </div>
                              ) : (
                                <span className="school-life-badge orange">
                                  Non justifié
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
          </>
        )}
      </div>
    </main>
  )
}

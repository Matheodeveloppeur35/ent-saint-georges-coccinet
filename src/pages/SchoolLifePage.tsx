import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import './AdminPages.css'

type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused'

type SchoolClass = {
  id: string
  name: string
  school_year: string
}

type Student = {
  id: string
  student_number: string
  first_name: string
  last_name: string
  class_id: string | null
  classes: SchoolClass[] | null
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
}

type ClassSubject = {
  id: string
  teacher_id: string
  class_id: string
  subject_id: string
}

type Timetable = {
  id: string
  day_of_week: number
  starts_at: string
  ends_at: string
  room: string | null
  academic_year: string
  class_subject_id: string
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

type SchoolLifePageProps = {
  onBack: () => void
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

function getLocalDateValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset()

  return new Date(now.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10)
}

export function SchoolLifePage({
  onBack,
}: SchoolLifePageProps) {
  const [records, setRecords] =
    useState<AttendanceRecord[]>([])
  const [students, setStudents] =
    useState<Student[]>([])
  const [classes, setClasses] =
    useState<SchoolClass[]>([])
  const [classSubjects, setClassSubjects] =
    useState<ClassSubject[]>([])
  const [timetables, setTimetables] =
    useState<Timetable[]>([])
  const [teachers, setTeachers] =
    useState<Teacher[]>([])
  const [subjects, setSubjects] =
    useState<Subject[]>([])

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
  const [dateFilter, setDateFilter] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] =
    useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')

    const [
      recordsResult,
      studentsResult,
      classesResult,
      classSubjectsResult,
      timetablesResult,
      teachersResult,
      subjectsResult,
    ] = await Promise.all([
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

      supabase
        .from('students')
        .select(`
          id,
          student_number,
          first_name,
          last_name,
          class_id,
          classes (
            id,
            name,
            school_year
          )
        `)
        .eq('is_active', true)
        .order('last_name')
        .order('first_name'),

      supabase
        .from('classes')
        .select('id, name, school_year')
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
          day_of_week,
          starts_at,
          ends_at,
          room,
          academic_year,
          class_subject_id
        `)
        .eq('is_active', true)
        .order('day_of_week')
        .order('starts_at'),

      supabase
        .from('teachers')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .order('last_name'),

      supabase
        .from('subjects')
        .select('id, name, short_name')
        .eq('is_active', true)
        .order('name'),
    ])

    if (
      recordsResult.error ||
      studentsResult.error ||
      classesResult.error ||
      classSubjectsResult.error ||
      timetablesResult.error ||
      teachersResult.error ||
      subjectsResult.error
    ) {
      console.error(
        'Erreur de chargement de la vie scolaire :',
        {
          records: recordsResult.error,
          students: studentsResult.error,
          classes: classesResult.error,
          classSubjects:
            classSubjectsResult.error,
          timetables: timetablesResult.error,
          teachers: teachersResult.error,
          subjects: subjectsResult.error,
        },
      )

      setError(
        'Les données de la vie scolaire n’ont pas pu être chargées.',
      )
      setIsLoading(false)
      return
    }

    setRecords(
      (recordsResult.data ?? []) as AttendanceRecord[],
    )
    setStudents(
      (studentsResult.data ?? []) as Student[],
    )
    setClasses(
      (classesResult.data ?? []) as SchoolClass[],
    )
    setClassSubjects(
      (classSubjectsResult.data ?? []) as ClassSubject[],
    )
    setTimetables(
      (timetablesResult.data ?? []) as Timetable[],
    )
    setTeachers(
      (teachersResult.data ?? []) as Teacher[],
    )
    setSubjects(
      (subjectsResult.data ?? []) as Subject[],
    )

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

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

  const timetableMap = useMemo(
    () =>
      new Map(
        timetables.map((item) => [
          item.id,
          item,
        ]),
      ),
    [timetables],
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

  function getTimetableLabel(
    selectedTimetableId: string,
  ) {
    const timetable = timetableMap.get(
      selectedTimetableId,
    )

    if (!timetable) {
      return 'Cours introuvable'
    }

    const link = classSubjectMap.get(
      timetable.class_subject_id,
    )

    const teacher = link
      ? teacherMap.get(link.teacher_id)
      : null

    const subject = link
      ? subjectMap.get(link.subject_id)
      : null

    const schoolClass = link
      ? classMap.get(link.class_id)
      : null

    const teacherLabel = teacher
      ? `${teacher.last_name} ${teacher.first_name}`
      : 'Professeur inconnu'

    const subjectLabel = subject
      ? `${subject.name} (${subject.short_name})`
      : 'Matière inconnue'

    const classLabel =
      schoolClass?.name ?? 'Classe inconnue'

    return `${DAY_LABELS[timetable.day_of_week] ?? 'Jour inconnu'} ${formatTime(timetable.starts_at)}–${formatTime(timetable.ends_at)} | ${classLabel} — ${subjectLabel} — ${teacherLabel}`
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
          : student?.classes?.[0]

        return {
          ...record,
          studentName: student
            ? `${student.last_name} ${student.first_name}`
            : 'Élève introuvable',
          studentNumber:
            student?.student_number ?? '—',
          className:
            schoolClass?.name ?? 'Non affecté',
          courseLabel: record.timetable_id
            ? getTimetableLabel(record.timetable_id)
            : 'Aucun cours associé',
        }
      }),
    [
      records,
      studentMap,
      classMap,
      timetableMap,
      classSubjectMap,
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
      return timetables
    }

    return timetables.filter((timetable) => {
      const link = classSubjectMap.get(
        timetable.class_subject_id,
      )

      return (
        link?.class_id === selectedStudent.class_id
      )
    })
  }, [
    studentId,
    students,
    timetables,
    studentMap,
    classSubjectMap,
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

  const presentCount = attendanceViews.filter(
    (record) => record.status === 'present',
  ).length

  const absentCount = attendanceViews.filter(
    (record) => record.status === 'absent',
  ).length

  const lateCount = attendanceViews.filter(
    (record) => record.status === 'late',
  ).length

  const justifiedCount = attendanceViews.filter(
    (record) =>
      record.is_justified ||
      record.status === 'excused',
  ).length

  async function handleCreateRecord(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!studentId) {
      setError('L’élève est obligatoire.')
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
      (!Number.isInteger(parsedMinutes) ||
        parsedMinutes === null ||
        parsedMinutes <= 0)
    ) {
      setError(
        'Indiquez un nombre de minutes de retard supérieur à zéro.',
      )
      return
    }

    if (
      isJustified &&
      !justificationNote.trim()
    ) {
      setError(
        'Ajoutez une note lorsque l’absence ou le retard est justifié.',
      )
      return
    }

    setIsCreating(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError(
        'La session utilisateur est introuvable.',
      )
      setIsCreating(false)
      return
    }

    const payload = {
      student_id: studentId,
      timetable_id: timetableId || null,
      attendance_date: attendanceDate,
      status,
      minutes_late: parsedMinutes,
      reason: reason.trim() || null,
      is_justified:
        status === 'excused' || isJustified,
      justification_note:
        justificationNote.trim() || null,
      recorded_by: user.id,
    }

    let query = supabase
      .from('attendance_records')
      .select('id')
      .eq('student_id', studentId)
      .eq('attendance_date', attendanceDate)

    query = timetableId
      ? query.eq('timetable_id', timetableId)
      : query.is('timetable_id', null)

    const {
      data: existingRecords,
      error: checkError,
    } = await query.limit(1)

    if (checkError) {
      setError(
        'La vérification de l’enregistrement a échoué.',
      )
      setIsCreating(false)
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
        'Erreur d’enregistrement :',
        saveError,
      )

      setError(
        `L’enregistrement n’a pas pu être sauvegardé : ${saveError.message}`,
      )
    } else {
      setStudentId('')
      setTimetableId('')
      setStatus('present')
      setMinutesLate('')
      setReason('')
      setIsJustified(false)
      setJustificationNote('')

      setSuccess(
        existingRecord
          ? 'L’enregistrement a été mis à jour.'
          : 'La présence a été enregistrée avec succès.',
      )

      await loadData()
    }

    setIsCreating(false)
  }

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

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p>Administration</p>

          <h1>Vie scolaire</h1>

          <p>
            Enregistrez les présences, les absences et les
            retards des élèves.
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
            <span>Total</span>
            <strong>{attendanceViews.length}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Présences</span>
            <strong>{presentCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Absences</span>
            <strong>{absentCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Retards</span>
            <strong>{lateCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Justifiés</span>
            <strong>{justifiedCount}</strong>
          </article>
        </section>

        <section className="admin-card">
          <h2>Enregistrer une présence</h2>

          {students.length === 0 && !isLoading && (
            <p
              className="admin-message warning"
              role="status"
            >
              Créez d’abord un élève avant d’enregistrer une
              présence.
            </p>
          )}

          <form
            className="admin-form"
            onSubmit={handleCreateRecord}
          >
            <label htmlFor="attendance-student">
              Élève

              <select
                id="attendance-student"
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value)
                  setTimetableId('')
                }}
                disabled={
                  isLoading || students.length === 0
                }
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

            <label htmlFor="attendance-date">
              Date

              <input
                id="attendance-date"
                type="date"
                value={attendanceDate}
                onChange={(event) =>
                  setAttendanceDate(event.target.value)
                }
                required
              />
            </label>

            <label
              className="full-width"
              htmlFor="attendance-course"
            >
              Cours (optionnel)

              <select
                id="attendance-course"
                value={timetableId}
                onChange={(event) =>
                  setTimetableId(event.target.value)
                }
                disabled={isLoading}
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
                      {getTimetableLabel(timetable.id)}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label htmlFor="attendance-status">
              Statut

              <select
                id="attendance-status"
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
              <label htmlFor="attendance-minutes">
                Minutes de retard

                <input
                  id="attendance-minutes"
                  type="number"
                  min={1}
                  max={600}
                  value={minutesLate}
                  onChange={(event) =>
                    setMinutesLate(
                      event.target.value,
                    )
                  }
                  placeholder="Exemple : 10"
                  required
                />
              </label>
            )}

            <label
              className="full-width"
              htmlFor="attendance-reason"
            >
              Motif ou observation

              <textarea
                id="attendance-reason"
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value)
                }
                rows={3}
                placeholder="Ajoutez une observation…"
              />
            </label>

            {status !== 'present' && (
              <>
                <label className="admin-checkbox">
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
                    disabled={status === 'excused'}
                  />

                  <span>Situation justifiée</span>
                </label>

                {(isJustified ||
                  status === 'excused') && (
                  <label
                    className="full-width"
                    htmlFor="attendance-justification"
                  >
                    Justification

                    <textarea
                      id="attendance-justification"
                      value={justificationNote}
                      onChange={(event) =>
                        setJustificationNote(
                          event.target.value,
                        )
                      }
                      rows={3}
                      placeholder="Précisez la justification…"
                      required
                    />
                  </label>
                )}
              </>
            )}

            <div className="full-width">
              <button
                className="admin-button primary"
                type="submit"
                disabled={
                  isCreating ||
                  isLoading ||
                  students.length === 0
                }
              >
                {isCreating
                  ? 'Enregistrement…'
                  : 'Enregistrer la présence'}
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
              <h2>Registre de vie scolaire</h2>

              {!isLoading && (
                <p>
                  {filteredRecords.length}{' '}
                  {filteredRecords.length > 1
                    ? 'enregistrements affichés'
                    : 'enregistrement affiché'}
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

          <div className="admin-filter-grid">
            <input
              className="admin-input"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher un élève, une classe ou un motif…"
              aria-label="Rechercher"
            />

            <select
              className="admin-select"
              value={classFilter}
              onChange={(event) =>
                setClassFilter(event.target.value)
              }
              aria-label="Filtrer par classe"
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
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | 'ALL'
                    | AttendanceStatus,
                )
              }
              aria-label="Filtrer par statut"
            >
              <option value="ALL">
                Tous les statuts
              </option>
              <option value="present">
                Présents
              </option>
              <option value="absent">
                Absents
              </option>
              <option value="late">
                En retard
              </option>
              <option value="excused">
                Absences autorisées
              </option>
            </select>

            <input
              className="admin-input"
              type="date"
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(event.target.value)
              }
              aria-label="Filtrer par date"
            />
          </div>

          {isLoading && (
            <p className="admin-empty">
              Chargement du registre…
            </p>
          )}

          {!isLoading &&
            attendanceViews.length === 0 && (
              <p className="admin-empty">
                Aucun enregistrement de vie scolaire.
              </p>
            )}

          {!isLoading &&
            attendanceViews.length > 0 &&
            filteredRecords.length === 0 && (
              <p className="admin-empty">
                Aucun enregistrement ne correspond aux
                filtres sélectionnés.
              </p>
            )}

          {!isLoading &&
            filteredRecords.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table-common admin-attendance-table">
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
                    {filteredRecords.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <strong>
                            {formatDate(
                              record.attendance_date,
                            )}
                          </strong>
                        </td>

                        <td>
                          <div className="admin-cell-stack">
                            <strong>
                              {record.studentName}
                            </strong>

                            <small>
                              {record.studentNumber}
                            </small>
                          </div>
                        </td>

                        <td>{record.className}</td>

                        <td>
                          <span className="admin-attendance-course">
                            {record.courseLabel}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              record.status ===
                              'present'
                                ? 'admin-badge green'
                                : record.status ===
                                    'absent'
                                  ? 'admin-badge red'
                                  : record.status ===
                                      'late'
                                    ? 'admin-badge orange'
                                    : 'admin-badge blue'
                            }
                          >
                            {STATUS_LABELS[
                              record.status
                            ]}

                            {record.status === 'late' &&
                              record.minutes_late && (
                                <>
                                  {' '}
                                  ({record.minutes_late} min)
                                </>
                              )}
                          </span>
                        </td>

                        <td>
                          {record.reason || (
                            <span className="admin-muted">
                              Aucun motif
                            </span>
                          )}
                        </td>

                        <td>
                          {record.is_justified ||
                          record.status === 'excused' ? (
                            <div className="admin-cell-stack">
                              <span className="admin-badge green">
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
                            <span className="admin-badge orange">
                              Non justifié
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      </div>
    </main>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type SchoolClass = {
  id: string
  name: string
  school_year: string
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
  academic_year: string
}

type Timetable = {
  id: string
  academic_year: string
  day_of_week: number
  starts_at: string
  ends_at: string
  room: string | null
  is_active: boolean
  class_subject_id: string
}

type TimetableEntry = {
  id: string
  room: string | null
  teacher_note: string | null
  is_cancelled: boolean
  timetable_id: string
}

type TimetablesPageProps = {
  onBack: () => void
}

export function TimetablesPage({ onBack }: TimetablesPageProps) {
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [timetables, setTimetables] = useState<Timetable[]>([])
  const [entries, setEntries] = useState<TimetableEntry[]>([])

  const [selectedClassSubjectId, setSelectedClassSubjectId] =
    useState('')
  const [dayOfWeek, setDayOfWeek] = useState('1')
  const [startsAt, setStartsAt] = useState('08:00')
  const [endsAt, setEndsAt] = useState('09:00')
  const [room, setRoom] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [academicYear, setAcademicYear] = useState('2026-2027')

  const [selectedTimetableId, setSelectedTimetableId] =
    useState('')
  const [entryRoom, setEntryRoom] = useState('')
  const [teacherNote, setTeacherNote] = useState('')
  const [isCancelled, setIsCancelled] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isEntryCreating, setIsEntryCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData() {
    setIsLoading(true)
    setError('')

    const [
      classSubjectResult,
      classesResult,
      teachersResult,
      subjectsResult,
      timetablesResult,
      entriesResult,
    ] = await Promise.all([
      supabase
        .from('class_subjects')
        .select('id, teacher_id, class_id, subject_id, academic_year')
        .order('academic_year', { ascending: false }),

      supabase
        .from('classes')
        .select('id, name, school_year')
        .eq('is_active', true)
        .order('name'),

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

      supabase
        .from('timetables')
        .select(
          'id, academic_year, day_of_week, starts_at, ends_at, room, is_active, class_subject_id',
        )
        .order('day_of_week')
        .order('starts_at'),

      supabase
        .from('timetable_entries')
        .select('id, room, teacher_note, is_cancelled, timetable_id')
        .order('created_at', { ascending: false }),
    ])

    if (
      classSubjectResult.error ||
      classesResult.error ||
      teachersResult.error ||
      subjectsResult.error ||
      timetablesResult.error ||
      entriesResult.error
    ) {
      setError(
        'Les données de l’emploi du temps n’ont pas pu être chargées.',
      )
      setIsLoading(false)
      return
    }

    setClassSubjects(classSubjectResult.data as ClassSubject[])
    setClasses(classesResult.data as SchoolClass[])
    setTeachers(teachersResult.data as Teacher[])
    setSubjects(subjectsResult.data as Subject[])
    setTimetables(timetablesResult.data as Timetable[])
    setEntries(entriesResult.data as TimetableEntry[])
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function dayLabel(day: number) {
    return [
      '',
      'Lundi',
      'Mardi',
      'Mercredi',
      'Jeudi',
      'Vendredi',
      'Samedi',
      'Dimanche',
    ][day]
  }

  function classNameById(id: string) {
    const found = classes.find((item) => item.id === id)
    return found ? `${found.name} — ${found.school_year}` : '-'
  }

  function teacherNameById(id: string) {
    const found = teachers.find((item) => item.id === id)
    return found ? `${found.last_name} ${found.first_name}` : '-'
  }

  function subjectNameById(id: string) {
    const found = subjects.find((item) => item.id === id)
    return found ? `${found.name} (${found.short_name})` : '-'
  }

  function entryByTimetableId(timetableId: string) {
    return entries.find((entry) => entry.timetable_id === timetableId)
  }

  async function handleCreateTimetable(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const start = startsAt.trim()
    const end = endsAt.trim()

    if (!selectedClassSubjectId) {
      setError("L'affectation prof/classe/matière est obligatoire.")
      return
    }

    if (start >= end) {
      setError('L’horaire de fin doit être plus tard que le début.')
      return
    }

    setIsCreating(true)

    const { error: createError } = await supabase
      .from('timetables')
      .insert({
        class_subject_id: selectedClassSubjectId,
        day_of_week: Number(dayOfWeek),
        starts_at: `${start}:00`,
        ends_at: `${end}:00`,
        room: room.trim() || null,
        is_active: isActive,
        academic_year: academicYear.trim(),
      })

    if (createError) {
      setError("Le cours n’a pas pu être créé.")
    } else {
      setSelectedClassSubjectId('')
      setStartsAt('08:00')
      setEndsAt('09:00')
      setRoom('')
      setIsActive(true)
      setSuccess('Le cours a été créé avec succès.')
      await loadData()
    }

    setIsCreating(false)
  }

  async function handleCreateEntry(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!selectedTimetableId) {
      setError('Choisis d’abord un cours de l’emploi du temps.')
      return
    }

    setIsEntryCreating(true)

    const payload = {
      timetable_id: selectedTimetableId,
      room: entryRoom.trim() || null,
      teacher_note: teacherNote.trim() || null,
      is_cancelled: isCancelled,
    }

    const existing = entryByTimetableId(selectedTimetableId)

    const { error: upsertError } = existing
      ? await supabase
          .from('timetable_entries')
          .update(payload)
          .eq('id', existing.id)
      : await supabase
          .from('timetable_entries')
          .insert(payload)

    if (upsertError) {
      setError("L’entrée d’emploi du temps n’a pas pu être enregistrée.")
    } else {
      setSelectedTimetableId('')
      setEntryRoom('')
      setTeacherNote('')
      setIsCancelled(false)
      setSuccess('L’entrée d’emploi du temps a été enregistrée.')
      await loadData()
    }

    setIsEntryCreating(false)
  }

  return (
    <main>
      <header>
        <div>
          <p>Administration</p>
          <h1>Gestion de l’emploi du temps</h1>
        </div>

        <button type="button" onClick={onBack}>
          Retour au tableau de bord
        </button>
      </header>

      <section>
        <h2>Créer un cours</h2>

        <form onSubmit={handleCreateTimetable}>
          <div>
            <label htmlFor="tt-classsubject">
              Professeur / Classe / Matière
            </label>

            <select
              id="tt-classsubject"
              value={selectedClassSubjectId}
              onChange={(event) =>
                setSelectedClassSubjectId(event.target.value)
              }
              required
            >
              <option value="">Choisir</option>

              {classSubjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {teacherNameById(item.teacher_id)} —{' '}
                  {classNameById(item.class_id)} —{' '}
                  {subjectNameById(item.subject_id)} (
                  {item.academic_year})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tt-day">Jour</label>
            <select
              id="tt-day"
              value={dayOfWeek}
              onChange={(event) =>
                setDayOfWeek(event.target.value)
              }
              required
            >
              <option value="1">Lundi</option>
              <option value="2">Mardi</option>
              <option value="3">Mercredi</option>
              <option value="4">Jeudi</option>
              <option value="5">Vendredi</option>
              <option value="6">Samedi</option>
              <option value="7">Dimanche</option>
            </select>
          </div>

          <div>
            <label htmlFor="tt-start">Début</label>
            <input
              id="tt-start"
              type="time"
              value={startsAt}
              onChange={(event) =>
                setStartsAt(event.target.value)
              }
              required
            />
          </div>

          <div>
            <label htmlFor="tt-end">Fin</label>
            <input
              id="tt-end"
              type="time"
              value={endsAt}
              onChange={(event) =>
                setEndsAt(event.target.value)
              }
              required
            />
          </div>

          <div>
            <label htmlFor="tt-room">Salle</label>
            <input
              id="tt-room"
              type="text"
              value={room}
              onChange={(event) => setRoom(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="tt-year">Année scolaire</label>
            <input
              id="tt-year"
              type="text"
              value={academicYear}
              onChange={(event) =>
                setAcademicYear(event.target.value)
              }
              required
            />
          </div>

          <label>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) =>
                setIsActive(event.target.checked)
              }
            />
            {' '}
            Cours actif
          </label>

          <button type="submit" disabled={isCreating}>
            {isCreating
              ? 'Création en cours...'
              : 'Créer le cours'}
          </button>
        </form>
      </section>

      <section>
        <h2>Entrée de cours (note / salle / annulation)</h2>

        <form onSubmit={handleCreateEntry}>
          <div>
            <label htmlFor="tt-course">Cours</label>
            <select
              id="tt-course"
              value={selectedTimetableId}
              onChange={(event) =>
                setSelectedTimetableId(event.target.value)
              }
              required
            >
              <option value="">Choisir un cours</option>
              {timetables.map((item) => {
                const link = classSubjects.find(
                  (linkItem) =>
                    linkItem.id === item.class_subject_id,
                )
                const classLabel = link
                  ? classNameById(link.class_id)
                  : '-'
                const teacherLabel = link
                  ? teacherNameById(link.teacher_id)
                  : '-'
                const subjectLabel = link
                  ? subjectNameById(link.subject_id)
                  : '-'
                return (
                  <option key={item.id} value={item.id}>
                    {dayLabel(item.day_of_week)} {item.starts_at}-
                    {item.ends_at} | {teacherLabel} — {classLabel} —{' '}
                    {subjectLabel}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label htmlFor="tt-entry-room">Salle complémentaire</label>
            <input
              id="tt-entry-room"
              type="text"
              value={entryRoom}
              onChange={(event) =>
                setEntryRoom(event.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="tt-note">
              Note du professeur
            </label>
            <textarea
              id="tt-note"
              value={teacherNote}
              onChange={(event) =>
                setTeacherNote(event.target.value)
              }
              rows={3}
            />
          </div>

          <label>
            <input
              type="checkbox"
              checked={isCancelled}
              onChange={(event) =>
                setIsCancelled(event.target.checked)
              }
            />
            {' '}
            Cours annulé
          </label>

          <button type="submit" disabled={isEntryCreating}>
            {isEntryCreating
              ? 'Enregistrement...'
              : 'Enregistrer l’entrée'}
          </button>
        </form>

        {success && <p role="status">{success}</p>}
        {error && <p role="alert">{error}</p>}
      </section>

      <section>
        <h2>Liste des cours</h2>

        {isLoading && <p>Chargement...</p>}

        {!isLoading && timetables.length === 0 && (
          <p>Aucun cours programmé.</p>
        )}

        {!isLoading && timetables.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Jour</th>
                <th>Horaire</th>
                <th>Professeur</th>
                <th>Classe</th>
                <th>Matière</th>
                <th>Salle</th>
                <th>Statut</th>
                <th>Note</th>
              </tr>
            </thead>

            <tbody>
              {timetables.map((item) => {
                const link = classSubjects.find(
                  (linkItem) =>
                    linkItem.id === item.class_subject_id,
                )

                const entry = entryByTimetableId(item.id)

                return (
                  <tr key={item.id}>
                    <td>{dayLabel(item.day_of_week)}</td>
                    <td>
                      {item.starts_at} → {item.ends_at}
                    </td>
                    <td>
                      {link
                        ? teacherNameById(link.teacher_id)
                        : '-'}
                    </td>
                    <td>
                      {link ? classNameById(link.class_id) : '-'}
                    </td>
                    <td>
                      {link
                        ? subjectNameById(link.subject_id)
                        : '-'}
                    </td>
                    <td>
                      {entry?.room || item.room || '-'}
                    </td>
                    <td>
                      {item.is_active ? 'Actif' : 'Inactif'}
                    </td>
                    <td>
                      {entry?.is_cancelled
                        ? 'ANNULÉ'
                        : entry?.teacher_note || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}

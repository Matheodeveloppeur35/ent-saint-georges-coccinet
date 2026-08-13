import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import './AdminPages.css'

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

export function TimetablesPage({
  onBack,
}: TimetablesPageProps) {
  const [classSubjects, setClassSubjects] = useState<
    ClassSubject[]
  >([])

  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [timetables, setTimetables] = useState<Timetable[]>([])
  const [entries, setEntries] =
    useState<TimetableEntry[]>([])

  const [
    selectedClassSubjectId,
    setSelectedClassSubjectId,
  ] = useState('')

  const [dayOfWeek, setDayOfWeek] = useState('1')
  const [startsAt, setStartsAt] = useState('08:00')
  const [endsAt, setEndsAt] = useState('09:00')
  const [room, setRoom] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [academicYear, setAcademicYear] =
    useState('2026-2027')

  const [
    selectedTimetableId,
    setSelectedTimetableId,
  ] = useState('')

  const [entryRoom, setEntryRoom] = useState('')
  const [teacherNote, setTeacherNote] = useState('')
  const [isCancelled, setIsCancelled] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  const [isEntryCreating, setIsEntryCreating] =
    useState(false)

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
        .select(
          `
            id,
            teacher_id,
            class_id,
            subject_id,
            academic_year
          `,
        )
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
          `
            id,
            academic_year,
            day_of_week,
            starts_at,
            ends_at,
            room,
            is_active,
            class_subject_id
          `,
        )
        .order('day_of_week')
        .order('starts_at'),

      supabase
        .from('timetable_entries')
        .select(
          `
            id,
            room,
            teacher_note,
            is_cancelled,
            timetable_id
          `,
        )
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

    setClassSubjects(
      (classSubjectResult.data ?? []) as ClassSubject[],
    )

    setClasses(
      (classesResult.data ?? []) as SchoolClass[],
    )

    setTeachers(
      (teachersResult.data ?? []) as Teacher[],
    )

    setSubjects(
      (subjectsResult.data ?? []) as Subject[],
    )

    setTimetables(
      (timetablesResult.data ?? []) as Timetable[],
    )

    setEntries(
      (entriesResult.data ?? []) as TimetableEntry[],
    )

    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
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
    ][day] ?? 'Jour inconnu'
  }

  function formatTime(value: string) {
    return value ? value.slice(0, 5) : '—'
  }

  function classNameById(id: string) {
    const found = classes.find(
      (item) => item.id === id,
    )

    return found
      ? `${found.name} — ${found.school_year}`
      : 'Classe introuvable'
  }

  function teacherNameById(id: string) {
    const found = teachers.find(
      (item) => item.id === id,
    )

    return found
      ? `${found.last_name} ${found.first_name}`
      : 'Professeur introuvable'
  }

  function subjectNameById(id: string) {
    const found = subjects.find(
      (item) => item.id === id,
    )

    return found
      ? `${found.name} (${found.short_name})`
      : 'Matière introuvable'
  }

  function entryByTimetableId(timetableId: string) {
    return entries.find(
      (entry) => entry.timetable_id === timetableId,
    )
  }

  async function handleCreateTimetable(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const start = startsAt.trim()
    const end = endsAt.trim()
    const normalizedAcademicYear = academicYear.trim()

    if (!selectedClassSubjectId) {
      setError(
        'L’affectation professeur, classe et matière est obligatoire.',
      )
      return
    }

    if (!normalizedAcademicYear) {
      setError('L’année scolaire est obligatoire.')
      return
    }

    if (start >= end) {
      setError(
        'L’horaire de fin doit être plus tard que le début.',
      )
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
        academic_year: normalizedAcademicYear,
      })

    if (createError) {
      setError('Le cours n’a pas pu être créé.')
    } else {
      setSelectedClassSubjectId('')
      setDayOfWeek('1')
      setStartsAt('08:00')
      setEndsAt('09:00')
      setRoom('')
      setIsActive(true)

      setSuccess(
        'Le cours a été créé avec succès.',
      )

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
      setError(
        'Choisissez d’abord un cours de l’emploi du temps.',
      )
      return
    }

    setIsEntryCreating(true)

    const payload = {
      timetable_id: selectedTimetableId,
      room: entryRoom.trim() || null,
      teacher_note: teacherNote.trim() || null,
      is_cancelled: isCancelled,
    }

    const existing = entryByTimetableId(
      selectedTimetableId,
    )

    const { error: upsertError } = existing
      ? await supabase
          .from('timetable_entries')
          .update(payload)
          .eq('id', existing.id)
      : await supabase
          .from('timetable_entries')
          .insert(payload)

    if (upsertError) {
      setError(
        'L’entrée d’emploi du temps n’a pas pu être enregistrée.',
      )
    } else {
      setSelectedTimetableId('')
      setEntryRoom('')
      setTeacherNote('')
      setIsCancelled(false)

      setSuccess(
        'L’entrée d’emploi du temps a été enregistrée.',
      )

      await loadData()
    }

    setIsEntryCreating(false)
  }

  const courseFormUnavailable =
    classSubjects.length === 0

  const entryFormUnavailable =
    timetables.length === 0

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p>Administration</p>

          <h1>Gestion de l’emploi du temps</h1>

          <p>
            Programmez les cours et enregistrez les salles,
            les notes et les annulations.
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
        <section className="admin-card">
          <h2>Créer un cours</h2>

          {!isLoading && courseFormUnavailable && (
            <p
              className="admin-message warning"
              role="status"
            >
              Créez d’abord une affectation associant un
              professeur, une classe et une matière.
            </p>
          )}

          <form
            className="admin-form"
            onSubmit={handleCreateTimetable}
          >
            <label
              className="full-width"
              htmlFor="tt-classsubject"
            >
              Professeur / Classe / Matière

              <select
                id="tt-classsubject"
                value={selectedClassSubjectId}
                onChange={(event) =>
                  setSelectedClassSubjectId(
                    event.target.value,
                  )
                }
                disabled={
                  isLoading || courseFormUnavailable
                }
                required
              >
                <option value="">
                  Choisir une affectation
                </option>

                {classSubjects.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {teacherNameById(item.teacher_id)} —{' '}
                    {classNameById(item.class_id)} —{' '}
                    {subjectNameById(item.subject_id)} (
                    {item.academic_year})
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="tt-day">
              Jour

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
            </label>

            <label htmlFor="tt-year">
              Année scolaire

              <input
                id="tt-year"
                type="text"
                value={academicYear}
                onChange={(event) =>
                  setAcademicYear(event.target.value)
                }
                placeholder="Exemple : 2026-2027"
                required
              />
            </label>

            <label htmlFor="tt-start">
              Début

              <input
                id="tt-start"
                type="time"
                value={startsAt}
                onChange={(event) =>
                  setStartsAt(event.target.value)
                }
                required
              />
            </label>

            <label htmlFor="tt-end">
              Fin

              <input
                id="tt-end"
                type="time"
                value={endsAt}
                onChange={(event) =>
                  setEndsAt(event.target.value)
                }
                required
              />
            </label>

            <label htmlFor="tt-room">
              Salle

              <input
                id="tt-room"
                type="text"
                value={room}
                onChange={(event) =>
                  setRoom(event.target.value)
                }
                placeholder="Exemple : Salle 14"
                maxLength={80}
              />
            </label>

            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) =>
                  setIsActive(event.target.checked)
                }
              />

              <span>Cours actif</span>
            </label>

            <div className="full-width">
              <button
                className="admin-button primary"
                type="submit"
                disabled={
                  isCreating ||
                  isLoading ||
                  courseFormUnavailable
                }
              >
                {isCreating
                  ? 'Création en cours…'
                  : 'Créer le cours'}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-card">
          <h2>
            Entrée de cours
          </h2>

          <p className="admin-card-description">
            Ajoutez une salle complémentaire, une note ou
            marquez un cours comme annulé.
          </p>

          {!isLoading && entryFormUnavailable && (
            <p
              className="admin-message warning"
              role="status"
            >
              Programmez d’abord un cours avant d’ajouter une
              entrée.
            </p>
          )}

          <form
            className="admin-form"
            onSubmit={handleCreateEntry}
          >
            <label
              className="full-width"
              htmlFor="tt-course"
            >
              Cours

              <select
                id="tt-course"
                value={selectedTimetableId}
                onChange={(event) => {
                  const timetableId =
                    event.target.value

                  setSelectedTimetableId(timetableId)

                  const existingEntry =
                    entryByTimetableId(timetableId)

                  setEntryRoom(
                    existingEntry?.room ?? '',
                  )

                  setTeacherNote(
                    existingEntry?.teacher_note ?? '',
                  )

                  setIsCancelled(
                    existingEntry?.is_cancelled ?? false,
                  )
                }}
                disabled={
                  isLoading || entryFormUnavailable
                }
                required
              >
                <option value="">
                  Choisir un cours
                </option>

                {timetables.map((item) => {
                  const link = classSubjects.find(
                    (linkItem) =>
                      linkItem.id ===
                      item.class_subject_id,
                  )

                  const classLabel = link
                    ? classNameById(link.class_id)
                    : 'Classe introuvable'

                  const teacherLabel = link
                    ? teacherNameById(link.teacher_id)
                    : 'Professeur introuvable'

                  const subjectLabel = link
                    ? subjectNameById(link.subject_id)
                    : 'Matière introuvable'

                  return (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {dayLabel(item.day_of_week)}{' '}
                      {formatTime(item.starts_at)}–
                      {formatTime(item.ends_at)} |{' '}
                      {teacherLabel} — {classLabel} —{' '}
                      {subjectLabel}
                    </option>
                  )
                })}
              </select>
            </label>

            <label htmlFor="tt-entry-room">
              Salle complémentaire

              <input
                id="tt-entry-room"
                type="text"
                value={entryRoom}
                onChange={(event) =>
                  setEntryRoom(event.target.value)
                }
                placeholder="Laisser vide pour conserver la salle"
                maxLength={80}
              />
            </label>

            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={isCancelled}
                onChange={(event) =>
                  setIsCancelled(event.target.checked)
                }
              />

              <span>Cours annulé</span>
            </label>

            <label
              className="full-width"
              htmlFor="tt-note"
            >
              Note du professeur

              <textarea
                id="tt-note"
                value={teacherNote}
                onChange={(event) =>
                  setTeacherNote(event.target.value)
                }
                rows={4}
                placeholder="Ajoutez une information concernant ce cours…"
              />
            </label>

            <div className="full-width">
              <button
                className="admin-button primary"
                type="submit"
                disabled={
                  isEntryCreating ||
                  isLoading ||
                  entryFormUnavailable
                }
              >
                {isEntryCreating
                  ? 'Enregistrement…'
                  : 'Enregistrer l’entrée'}
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
              <h2>Liste des cours</h2>

              {!isLoading && (
                <p>
                  {timetables.length}{' '}
                  {timetables.length > 1
                    ? 'cours programmés'
                    : 'cours programmé'}
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

          {isLoading && (
            <p className="admin-empty">
              Chargement de l’emploi du temps…
            </p>
          )}

          {!isLoading && timetables.length === 0 && (
            <p className="admin-empty">
              Aucun cours n’est programmé.
            </p>
          )}

          {!isLoading && timetables.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table-common admin-timetable-table">
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
                        linkItem.id ===
                        item.class_subject_id,
                    )

                    const entry =
                      entryByTimetableId(item.id)

                    const isCourseCancelled =
                      entry?.is_cancelled ?? false

                    return (
                      <tr
                        key={item.id}
                        className={
                          isCourseCancelled
                            ? 'admin-row-cancelled'
                            : undefined
                        }
                      >
                        <td>
                          <strong>
                            {dayLabel(
                              item.day_of_week,
                            )}
                          </strong>
                        </td>

                        <td>
                          <span className="admin-time">
                            {formatTime(item.starts_at)}
                            {' – '}
                            {formatTime(item.ends_at)}
                          </span>
                        </td>

                        <td>
                          {link
                            ? teacherNameById(
                                link.teacher_id,
                              )
                            : (
                              <span className="admin-muted">
                                Introuvable
                              </span>
                            )}
                        </td>

                        <td>
                          {link
                            ? classNameById(link.class_id)
                            : (
                              <span className="admin-muted">
                                Introuvable
                              </span>
                            )}
                        </td>

                        <td>
                          {link
                            ? subjectNameById(
                                link.subject_id,
                              )
                            : (
                              <span className="admin-muted">
                                Introuvable
                              </span>
                            )}
                        </td>

                        <td>
                          {entry?.room ||
                            item.room ||
                            (
                              <span className="admin-muted">
                                Non renseignée
                              </span>
                            )}
                        </td>

                        <td>
                          <span
                            className={
                              isCourseCancelled
                                ? 'admin-badge red'
                                : item.is_active
                                  ? 'admin-badge green'
                                  : 'admin-badge orange'
                            }
                          >
                            {isCourseCancelled
                              ? 'Annulé'
                              : item.is_active
                                ? 'Actif'
                                : 'Inactif'}
                          </span>
                        </td>

                        <td>
                          {isCourseCancelled ? (
                            <strong className="admin-cancelled-text">
                              Cours annulé
                            </strong>
                          ) : entry?.teacher_note ? (
                            <span className="admin-note">
                              {entry.teacher_note}
                            </span>
                          ) : (
                            <span className="admin-muted">
                              Aucune note
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

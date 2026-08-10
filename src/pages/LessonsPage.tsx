import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

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

type ClassSubject = {
  id: string
  teacher_id: string | null
  class_id: string | null
  subject_id: string | null
  academic_year: string
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

type LessonsPageProps = {
  onBack: () => void
}

export function LessonsPage({
  onBack,
}: LessonsPageProps) {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([])
  const [timetables, setTimetables] = useState<Timetable[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [lessonEntries, setLessonEntries] = useState<LessonEntry[]>([])

  const [selectedTimetableId, setSelectedTimetableId] =
    useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDescription, setLessonDescription] = useState('')
  const [isPublished, setIsPublished] = useState(true)

  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [workText, setWorkText] = useState('')
  const [note, setNote] = useState('')
  const [homeworkDueDate, setHomeworkDueDate] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingLesson, setIsCreatingLesson] = useState(false)
  const [isSavingEntry, setIsSavingEntry] = useState(false)

  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  async function loadData() {
    setIsLoading(true)
    setError('')

    const [
      classesResult,
      teachersResult,
      subjectsResult,
      classSubjectsResult,
      timetablesResult,
      lessonsResult,
    ] = await Promise.all([
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
        .from('class_subjects')
        .select('id, teacher_id, class_id, subject_id, academic_year')
        .order('academic_year', { ascending: false }),

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
        .eq('is_active', true),

      supabase
        .from('lessons')
        .select(
          `
          id,
          timetable_id,
          title,
          description,
          is_published,
          published_at,
          created_at
        `,
        )
        .order('created_at', { ascending: false }),
    ])

    if (
      classesResult.error ||
      teachersResult.error ||
      subjectsResult.error ||
      classSubjectsResult.error ||
      timetablesResult.error ||
      lessonsResult.error
    ) {
      setError(
        "Les données du cahier de texte n'ont pas pu être chargées.",
      )
      setIsLoading(false)
      return
    }

    const classesData = (classesResult.data ?? []) as SchoolClass[]
    const teachersData = (teachersResult.data ?? []) as Teacher[]
    const subjectsData = (subjectsResult.data ?? []) as Subject[]
    const classSubjectsData =
      (classSubjectsResult.data ?? []) as ClassSubject[]
    const timetablesData =
      (timetablesResult.data ?? []) as Timetable[]
    const lessonsData = (lessonsResult.data ?? []) as Lesson[]

    setClasses(classesData)
    setTeachers(teachersData)
    setSubjects(subjectsData)
    setClassSubjects(classSubjectsData)
    setTimetables(timetablesData)
    setLessons(lessonsData)

    if (lessonsData.length > 0) {
      const lessonIds = lessonsData.map((lesson) => lesson.id)

      const { data: lessonEntriesData, error: entriesError } =
        await supabase
          .from('lesson_entries')
          .select(
            'id, lesson_id, work_text, note, homework_due_date',
          )
          .in('lesson_id', lessonIds)

      if (entriesError) {
        setError(
          "Les compléments des leçons n'ont pas pu être chargés.",
        )
      } else {
        setLessonEntries((lessonEntriesData ?? []) as LessonEntry[])
      }
    } else {
      setLessonEntries([])
    }

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

  function classById(id: string) {
    const item = classSubjects.find((cs) => cs.id === id)
    if (!item?.class_id) return '-'

    const foundClass = classes.find(
      (schoolClass) => schoolClass.id === item.class_id,
    )
    return foundClass
      ? `${foundClass.name} — ${foundClass.school_year}`
      : '-'
  }

  function teacherById(id: string) {
    const item = classSubjects.find((cs) => cs.id === id)
    if (!item?.teacher_id) return '-'

    const foundTeacher = teachers.find(
      (teacher) => teacher.id === item.teacher_id,
    )
    return foundTeacher
      ? `${foundTeacher.last_name} ${foundTeacher.first_name}`
      : '-'
  }

  function subjectById(id: string) {
    const item = classSubjects.find((cs) => cs.id === id)
    if (!item?.subject_id) return '-'

    const foundSubject = subjects.find(
      (subject) => subject.id === item.subject_id,
    )
    return foundSubject
      ? `${foundSubject.name} (${foundSubject.short_name})`
      : '-'
  }

   function entryByLessonId(
    lessonId: string,
  ): LessonEntry | undefined {
    return lessonEntries.find((entry) => entry.lesson_id === lessonId)
  }

  async function handleCreateLesson(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedTimetableId) {
      setError(
        'Tu dois choisir un cours de l’emploi du temps.',
      )
      return
    }

    const title = lessonTitle.trim()
    if (title.length < 2) {
      setError('Le titre doit contenir au moins 2 caractères.')
      return
    }

    setIsCreatingLesson(true)

    const { error: createError } = await supabase
      .from('lessons')
      .insert({
        timetable_id: selectedTimetableId,
        title,
        description: lessonDescription.trim() || null,
        is_published: isPublished,
      })

    if (createError) {
      setError('La leçon n’a pas pu être créée.')
    } else {
      setSelectedTimetableId('')
      setLessonTitle('')
      setLessonDescription('')
      setIsPublished(true)
      setSuccess('La leçon a été créée avec succès.')
      await loadData()
    }

    setIsCreatingLesson(false)
  }

  async function handleCreateOrUpdateEntry(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedLessonId) {
      setError(
        'Sélectionne d’abord une leçon dans la liste.',
      )
      return
    }

    const payload = {
      lesson_id: selectedLessonId,
      work_text: workText.trim() || null,
      note: note.trim() || null,
      homework_due_date: homeworkDueDate || null,
    }

    const existing = entryByLessonId(selectedLessonId)

    setIsSavingEntry(true)

    const { error: saveError } = existing
      ? await supabase
          .from('lesson_entries')
          .update(payload)
          .eq('id', existing.id)
      : await supabase
          .from('lesson_entries')
          .insert(payload)

    if (saveError) {
      setError(
        "L’entrée de cours n’a pas pu être enregistrée.",
      )
    } else {
      setSelectedLessonId('')
      setWorkText('')
      setNote('')
      setHomeworkDueDate('')
      setSuccess('L’entrée a été enregistrée avec succès.')
      await loadData()
    }

    setIsSavingEntry(false)
  }

  return (
    <main>
      <header>
        <div>
          <p>Administration</p>
          <h1>Gestion du cahier de texte</h1>
        </div>

        <button type="button" onClick={onBack}>
          Retour au tableau de bord
        </button>
      </header>

      <section>
        <h2>Créer une séance</h2>

        <form onSubmit={handleCreateLesson}>
          <div>
            <label htmlFor="lesson-timetable">
              Cours de l’emploi du temps
            </label>
            <select
              id="lesson-timetable"
              value={selectedTimetableId}
              onChange={(event) =>
                setSelectedTimetableId(event.target.value)
              }
              required
            >
              <option value="">
                Choisir un cours
              </option>

              {timetables.map((item) => {
                const linkId = item.class_subject_id
                const classLabel = classById(linkId)
                const teacherLabel = teacherById(linkId)
                const subjectLabel = subjectById(linkId)

                return (
                  <option key={item.id} value={item.id}>
                    {item.academic_year} — {dayLabel(item.day_of_week)}{' '}
                    {item.starts_at}-{item.ends_at} | {teacherLabel} —{' '}
                    {classLabel} — {subjectLabel}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label htmlFor="lesson-title">Titre de la séance</label>
            <input
              id="lesson-title"
              type="text"
              value={lessonTitle}
              onChange={(event) =>
                setLessonTitle(event.target.value)
              }
              required
            />
          </div>

          <div>
            <label htmlFor="lesson-description">
              Contenu / description
            </label>
            <textarea
              id="lesson-description"
              rows={4}
              value={lessonDescription}
              onChange={(event) =>
                setLessonDescription(event.target.value)
              }
            />
          </div>

          <label>
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(event) =>
                setIsPublished(event.target.checked)
              }
            />
            Publier la séance
          </label>

          <button type="submit" disabled={isCreatingLesson}>
            {isCreatingLesson
              ? 'Création en cours...'
              : 'Créer la séance'}
          </button>
        </form>
      </section>

      <section>
        <h2>Ajouter / modifier travail et note</h2>

        <form onSubmit={handleCreateOrUpdateEntry}>
          <div>
            <label htmlFor="lesson-entry">
              Séance
            </label>
            <select
              id="lesson-entry"
              value={selectedLessonId}
              onChange={(event) =>
                setSelectedLessonId(event.target.value)
              }
              required
            >
              <option value="">
                Choisir une séance
              </option>

              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                  {' '}
                  —
                  {new Intl.DateTimeFormat('fr-FR').format(
                    new Date(lesson.created_at),
                  )}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lesson-work">Travail</label>
            <textarea
              id="lesson-work"
              rows={4}
              value={workText}
              onChange={(event) =>
                setWorkText(event.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="lesson-note">
              Remarque professeur
            </label>
            <textarea
              id="lesson-note"
              rows={3}
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="lesson-due-date">
              Date de rendu (optionnel)
            </label>
            <input
              id="lesson-due-date"
              type="date"
              value={homeworkDueDate}
              onChange={(event) =>
                setHomeworkDueDate(event.target.value)
              }
            />
          </div>

          <button type="submit" disabled={isSavingEntry}>
            {isSavingEntry
              ? 'Enregistrement...'
              : 'Enregistrer / mettre à jour'}
          </button>
        </form>
      </section>

      {success && <p role="status">{success}</p>}
      {error && <p role="alert">{error}</p>}

      <section>
        <h2>Leçons enregistrées</h2>

        {isLoading && <p>Chargement...</p>}

        {!isLoading && lessons.length === 0 && (
          <p>Aucune leçon enregistrée.</p>
        )}

        {!isLoading && lessons.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Horaires</th>
                <th>Classe</th>
                <th>Professeur</th>
                <th>Matière</th>
                <th>Statut</th>
                <th>Travail</th>
                <th>Date de rendu</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson) => {
                const timetable = timetables.find(
                  (item) => item.id === lesson.timetable_id,
                )
                const linkId = timetable
                  ? timetable.class_subject_id
                  : undefined

                const entry = entryByLessonId(lesson.id)

                return (
                  <tr key={lesson.id}>
                    <td>{lesson.title}</td>

                    <td>
                      {timetable
                        ? `${dayLabel(timetable.day_of_week)} ${timetable.starts_at}→${timetable.ends_at}`
                        : '-'}
                    </td>

                    <td>{linkId ? classById(linkId) : '-'}</td>
                    <td>{linkId ? teacherById(linkId) : '-'}</td>
                    <td>{linkId ? subjectById(linkId) : '-'}</td>

                    <td>
                      {lesson.is_published ? 'Publié' : 'Brouillon'}
                    </td>

                    <td>
                      {entry?.work_text || '-'}
                    </td>
                    <td>
                      {entry?.homework_due_date || '-'}
                    </td>
                    <td>{entry?.note || '-'}</td>
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

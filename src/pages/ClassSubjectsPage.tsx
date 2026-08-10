import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Teacher = {
  id: string
  employee_number: string
  first_name: string
  last_name: string
}

type SchoolClass = {
  id: string
  name: string
  school_year: string
}

type Subject = {
  id: string
  name: string
  short_name: string
}

type ClassSubject = {
  id: string
  academic_year: string
  teachers: Teacher[] | null
  classes: SchoolClass[] | null
  subjects: Subject[] | null
}

type ClassSubjectsPageProps = {
  onBack: () => void
}

export function ClassSubjectsPage({
  onBack,
}: ClassSubjectsPageProps) {
  const [items, setItems] = useState<ClassSubject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  const [teacherId, setTeacherId] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [academicYear, setAcademicYear] = useState('2026-2027')

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData() {
    setIsLoading(true)
    setError('')

    const [
      linksResult,
      teachersResult,
      classesResult,
      subjectsResult,
    ] = await Promise.all([
      supabase
        .from('class_subjects')
        .select(`
          id,
          academic_year,
          teachers ( id, employee_number, first_name, last_name ),
          classes ( id, name, school_year ),
          subjects ( id, name, short_name )
        `)
        .order('academic_year', { ascending: false }),

      supabase
        .from('teachers')
        .select('id, employee_number, first_name, last_name')
        .eq('is_active', true)
        .order('last_name'),

      supabase
        .from('classes')
        .select('id, name, school_year')
        .eq('is_active', true)
        .order('name'),

      supabase
        .from('subjects')
        .select('id, name, short_name')
        .eq('is_active', true)
        .order('name'),
    ])

    if (
      linksResult.error ||
      teachersResult.error ||
      classesResult.error ||
      subjectsResult.error
    ) {
      setError(
        'Les données d’affectation n’ont pas pu être chargées.',
      )
    } else {
      setItems(linksResult.data as ClassSubject[])
      setTeachers(teachersResult.data as Teacher[])
      setClasses(classesResult.data as SchoolClass[])
      setSubjects(subjectsResult.data as Subject[])
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!teacherId || !classId || !subjectId) {
      setError(
        'Le professeur, la classe et la matière sont obligatoires.',
      )
      return
    }

    const selectedYear = academicYear.trim()
    if (!selectedYear) {
      setError('L’année scolaire est obligatoire.')
      return
    }

    setIsCreating(true)

    // Vérification anti-doublon côté app (message plus lisible)
    const { data: existing, error: checkError } = await supabase
      .from('class_subjects')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('academic_year', selectedYear)
      .limit(1)

    if (checkError) {
      setError("La vérification d’unicité a échoué.")
      setIsCreating(false)
      return
    }

    if (existing && existing.length > 0) {
      setError(
        'Cette affectation existe déjà pour cette année.',
      )
      setIsCreating(false)
      return
    }

    const { error: createError } = await supabase
      .from('class_subjects')
      .insert({
        teacher_id: teacherId,
        class_id: classId,
        subject_id: subjectId,
        academic_year: selectedYear,
      })

    if (createError) {
      if (createError.code === '23505') {
        setError(
          'Cette affectation existe déjà pour cette année.',
        )
      } else if ((createError as { status?: number }).status === 409) {
        setError('Conflit : cette affectation existe déjà.')
      } else {
        setError("L’affectation n’a pas pu être créée.")
      }
    } else {
      setTeacherId('')
      setClassId('')
      setSubjectId('')
      setSuccess('L’affectation a été créée avec succès.')
      await loadData()
    }

    setIsCreating(false)
  }

  return (
    <main>
      <header>
        <div>
          <p>Administration</p>
          <h1>Gestion des affectations</h1>
        </div>

        <button type="button" onClick={onBack}>
          Retour au tableau de bord
        </button>
      </header>

      <section>
        <h2>Créer une affectation</h2>

        <form onSubmit={handleCreate}>
          <div>
            <label htmlFor="link-teacher">
              Professeur
            </label>

            <select
              id="link-teacher"
              value={teacherId}
              onChange={(event) =>
                setTeacherId(event.target.value)
              }
              required
            >
              <option value="">
                Choisir un professeur
              </option>

              {teachers.map((teacher) => (
                <option
                  key={teacher.id}
                  value={teacher.id}
                >
                  {teacher.last_name} {teacher.first_name} (
                  {teacher.employee_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="link-class">
              Classe
            </label>

            <select
              id="link-class"
              value={classId}
              onChange={(event) =>
                setClassId(event.target.value)
              }
              required
            >
              <option value="">
                Choisir une classe
              </option>

              {classes.map((schoolClass) => (
                <option
                  key={schoolClass.id}
                  value={schoolClass.id}
                >
                  {schoolClass.name} —{' '}
                  {schoolClass.school_year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="link-subject">
              Matière
            </label>

            <select
              id="link-subject"
              value={subjectId}
              onChange={(event) =>
                setSubjectId(event.target.value)
              }
              required
            >
              <option value="">
                Choisir une matière
              </option>

              {subjects.map((subject) => (
                <option
                  key={subject.id}
                  value={subject.id}
                >
                  {subject.name} ({subject.short_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="link-year">
              Année scolaire
            </label>

            <input
              id="link-year"
              type="text"
              value={academicYear}
              onChange={(event) =>
                setAcademicYear(event.target.value)
              }
              required
            />
          </div>

          <button
            type="submit"
            disabled={isCreating}
          >
            {isCreating
              ? 'Création en cours...'
              : 'Créer l’affectation'}
          </button>
        </form>

        {success && (
          <p role="status">
            {success}
          </p>
        )}

        {error && (
          <p role="alert">
            {error}
          </p>
        )}
      </section>

      <section>
        <h2>Affectations enregistrées</h2>

        {isLoading && <p>Chargement...</p>}

        {!isLoading && items.length === 0 && (
          <p>Aucune affectation enregistrée.</p>
        )}

        {!isLoading && items.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Professeur</th>
                <th>Classe</th>
                <th>Matière</th>
                <th>Année</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.teachers?.[0]
                      ? `${item.teachers[0].last_name} ${item.teachers[0].first_name}`
                      : '-'}
                  </td>

                  <td>
                    {item.classes?.[0]
                      ? `${item.classes[0].name} — ${item.classes[0].school_year}`
                      : '-'}
                  </td>

                  <td>
                    {item.subjects?.[0]
                      ? `${item.subjects[0].name} (${item.subjects[0].short_name})`
                      : '-'}
                  </td>

                  <td>{item.academic_year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}

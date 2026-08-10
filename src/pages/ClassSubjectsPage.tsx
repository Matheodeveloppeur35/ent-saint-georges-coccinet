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

type ClassSubjectRaw = {
  id: string
  academic_year: string
  teacher_id: string | null
  class_id: string | null
  subject_id: string | null
}

type ClassSubjectDisplay = {
  id: string
  academic_year: string
  teacherLabel: string
  classLabel: string
  subjectLabel: string
}

type ClassSubjectsPageProps = {
  onBack: () => void
}

export function ClassSubjectsPage({
  onBack,
}: ClassSubjectsPageProps) {
  const [items, setItems] = useState<ClassSubjectDisplay[]>([])
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

    const linksResult = await supabase
      .from('class_subjects')
      .select('id, academic_year, teacher_id, class_id, subject_id')
      .order('academic_year', { ascending: false })

    if (linksResult.error) {
      setError("La liste des affectations n’a pas pu être chargée.")
      setIsLoading(false)
      return
    }

    const rawLinks = (linksResult.data ?? []) as ClassSubjectRaw[]

    const teacherIds = Array.from(
      new Set(
        rawLinks
          .map((link) => link.teacher_id)
          .filter((value): value is string => !!value),
      ),
    )

    const classIds = Array.from(
      new Set(
        rawLinks
          .map((link) => link.class_id)
          .filter((value): value is string => !!value),
      ),
    )

    const subjectIds = Array.from(
      new Set(
        rawLinks
          .map((link) => link.subject_id)
          .filter((value): value is string => !!value),
      ),
    )

    const [
      teachersResult,
      classesResult,
      subjectsResult,
    ] = await Promise.all([
      teacherIds.length > 0
        ? supabase
            .from('teachers')
            .select('id, employee_number, first_name, last_name')
            .in('id', teacherIds)
        : Promise.resolve({ data: [], error: null }),

      classIds.length > 0
        ? supabase
            .from('classes')
            .select('id, name, school_year')
            .in('id', classIds)
        : Promise.resolve({ data: [], error: null }),

      subjectIds.length > 0
        ? supabase
            .from('subjects')
            .select('id, name, short_name')
            .in('id', subjectIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (
      teachersResult.error ||
      classesResult.error ||
      subjectsResult.error
    ) {
      setError("Les données associées n'ont pas pu être chargées.")
      setIsLoading(false)
      return
    }

    const teacherMap = new Map<string, Teacher>()
    for (const teacher of (teachersResult.data ?? []) as Teacher[]) {
      teacherMap.set(teacher.id, teacher)
    }

    const classMap = new Map<string, SchoolClass>()
    for (const schoolClass of (classesResult.data ??
      []) as SchoolClass[]) {
      classMap.set(schoolClass.id, schoolClass)
    }

    const subjectMap = new Map<string, Subject>()
    for (const subject of (subjectsResult.data ??
      []) as Subject[]) {
      subjectMap.set(subject.id, subject)
    }

    const normalized: ClassSubjectDisplay[] = rawLinks.map(
      (link) => {
        const linkedTeacher = link.teacher_id
          ? teacherMap.get(link.teacher_id)
          : null

        const linkedClass = link.class_id
          ? classMap.get(link.class_id)
          : null

        const linkedSubject = link.subject_id
          ? subjectMap.get(link.subject_id)
          : null

        return {
          id: link.id,
          academic_year: link.academic_year,
          teacherLabel: linkedTeacher
            ? `${linkedTeacher.last_name} ${linkedTeacher.first_name}`
            : `- (id introuvable: ${link.teacher_id ?? 'nul'})`,
          classLabel: linkedClass
            ? `${linkedClass.name} — ${linkedClass.school_year}`
            : `- (id introuvable: ${link.class_id ?? 'nul'})`,
          subjectLabel: linkedSubject
            ? `${linkedSubject.name} (${linkedSubject.short_name})`
            : `- (id introuvable: ${link.subject_id ?? 'nul'})`,
        }
      },
    )

    setTeachers((teachersResult.data ?? []) as Teacher[])
    setClasses((classesResult.data ?? []) as SchoolClass[])
    setSubjects((subjectsResult.data ?? []) as Subject[])
    setItems(normalized)

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
      setError("L’année scolaire est obligatoire.")
      return
    }

    setIsCreating(true)

    const { data: existing, error: checkError } = await supabase
      .from('class_subjects')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('academic_year', selectedYear)
      .limit(1)

    if (checkError) {
      setError('La vérification d’unicité a échoué.')
      setIsCreating(false)
      return
    }

    if (existing && existing.length > 0) {
      setError('Cette affectation existe déjà pour cette année.')
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
            <label htmlFor="link-teacher">Professeur</label>

            <select
              id="link-teacher"
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
              required
            >
              <option value="">Choisir un professeur</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.last_name} {teacher.first_name} (
                  {teacher.employee_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="link-class">Classe</label>

            <select
              id="link-class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              required
            >
              <option value="">Choisir une classe</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name} — {schoolClass.school_year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="link-subject">Matière</label>

            <select
              id="link-subject"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              required
            >
              <option value="">Choisir une matière</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.short_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="link-year">Année scolaire</label>

            <input
              id="link-year"
              type="text"
              value={academicYear}
              onChange={(event) => setAcademicYear(event.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={isCreating}>
            {isCreating
              ? 'Création en cours...'
              : 'Créer l’affectation'}
          </button>
        </form>

        {success && <p role="status">{success}</p>}
        {error && <p role="alert">{error}</p>}
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
                  <td>{item.teacherLabel}</td>
                  <td>{item.classLabel}</td>
                  <td>{item.subjectLabel}</td>
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

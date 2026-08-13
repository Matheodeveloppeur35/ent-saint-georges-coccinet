import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import './AdminPages.css'

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
  hasMissingData: boolean
}

type ClassSubjectsPageProps = {
  onBack: () => void
}

export function ClassSubjectsPage({
  onBack,
}: ClassSubjectsPageProps) {
  const [items, setItems] =
    useState<ClassSubjectDisplay[]>([])

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] =
    useState<SchoolClass[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  const [teacherId, setTeacherId] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [academicYear, setAcademicYear] =
    useState('2026-2027')

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData() {
    setIsLoading(true)
    setError('')

    const linksResult = await supabase
      .from('class_subjects')
      .select(
        `
          id,
          academic_year,
          teacher_id,
          class_id,
          subject_id
        `,
      )
      .order('academic_year', { ascending: false })

    if (linksResult.error) {
      setError(
        'La liste des affectations n’a pas pu être chargée.',
      )
      setIsLoading(false)
      return
    }

    const rawLinks =
      (linksResult.data ?? []) as ClassSubjectRaw[]

    const teacherIds = Array.from(
      new Set(
        rawLinks
          .map((link) => link.teacher_id)
          .filter(
            (value): value is string => Boolean(value),
          ),
      ),
    )

    const classIds = Array.from(
      new Set(
        rawLinks
          .map((link) => link.class_id)
          .filter(
            (value): value is string => Boolean(value),
          ),
      ),
    )

    const subjectIds = Array.from(
      new Set(
        rawLinks
          .map((link) => link.subject_id)
          .filter(
            (value): value is string => Boolean(value),
          ),
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
            .select(
              `
                id,
                employee_number,
                first_name,
                last_name
              `,
            )
            .in('id', teacherIds)
        : Promise.resolve({
            data: [] as Teacher[],
            error: null,
          }),

      classIds.length > 0
        ? supabase
            .from('classes')
            .select('id, name, school_year')
            .in('id', classIds)
        : Promise.resolve({
            data: [] as SchoolClass[],
            error: null,
          }),

      subjectIds.length > 0
        ? supabase
            .from('subjects')
            .select('id, name, short_name')
            .in('id', subjectIds)
        : Promise.resolve({
            data: [] as Subject[],
            error: null,
          }),
    ])

    if (
      teachersResult.error ||
      classesResult.error ||
      subjectsResult.error
    ) {
      setError(
        'Les données associées n’ont pas pu être chargées.',
      )
      setIsLoading(false)
      return
    }

    const loadedTeachers =
      (teachersResult.data ?? []) as Teacher[]

    const loadedClasses =
      (classesResult.data ?? []) as SchoolClass[]

    const loadedSubjects =
      (subjectsResult.data ?? []) as Subject[]

    const teacherMap = new Map<string, Teacher>()

    for (const teacher of loadedTeachers) {
      teacherMap.set(teacher.id, teacher)
    }

    const classMap = new Map<string, SchoolClass>()

    for (const schoolClass of loadedClasses) {
      classMap.set(schoolClass.id, schoolClass)
    }

    const subjectMap = new Map<string, Subject>()

    for (const subject of loadedSubjects) {
      subjectMap.set(subject.id, subject)
    }

    const normalized: ClassSubjectDisplay[] =
      rawLinks.map((link) => {
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
            : 'Professeur introuvable',

          classLabel: linkedClass
            ? `${linkedClass.name} — ${linkedClass.school_year}`
            : 'Classe introuvable',

          subjectLabel: linkedSubject
            ? `${linkedSubject.name} (${linkedSubject.short_name})`
            : 'Matière introuvable',

          hasMissingData:
            !linkedTeacher ||
            !linkedClass ||
            !linkedSubject,
        }
      })

    setTeachers(loadedTeachers)
    setClasses(loadedClasses)
    setSubjects(loadedSubjects)
    setItems(normalized)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
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

    const { data: existing, error: checkError } =
      await supabase
        .from('class_subjects')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('academic_year', selectedYear)
        .limit(1)

    if (checkError) {
      setError(
        'La vérification de l’unicité a échoué.',
      )
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
      } else if (
        (createError as { status?: number }).status === 409
      ) {
        setError(
          'Conflit : cette affectation existe déjà.',
        )
      } else {
        setError(
          'L’affectation n’a pas pu être créée.',
        )
      }
    } else {
      setTeacherId('')
      setClassId('')
      setSubjectId('')

      setSuccess(
        'L’affectation a été créée avec succès.',
      )

      await loadData()
    }

    setIsCreating(false)
  }

  const formIsUnavailable =
    teachers.length === 0 ||
    classes.length === 0 ||
    subjects.length === 0

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p>Administration</p>

          <h1>Gestion des affectations</h1>

          <p>
            Reliez un professeur, une classe et une matière
            pour une année scolaire.
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
          <h2>Créer une affectation</h2>

          {!isLoading && formIsUnavailable && (
            <p
              className="admin-message warning"
              role="status"
            >
              Pour créer une affectation, au moins un
              professeur, une classe et une matière doivent
              être disponibles.
            </p>
          )}

          <form
            className="admin-form"
            onSubmit={handleCreate}
          >
            <label htmlFor="link-teacher">
              Professeur

              <select
                id="link-teacher"
                value={teacherId}
                onChange={(event) =>
                  setTeacherId(event.target.value)
                }
                disabled={
                  isLoading || teachers.length === 0
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
                    {teacher.last_name}{' '}
                    {teacher.first_name} (
                    {teacher.employee_number})
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="link-class">
              Classe

              <select
                id="link-class"
                value={classId}
                onChange={(event) =>
                  setClassId(event.target.value)
                }
                disabled={
                  isLoading || classes.length === 0
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
            </label>

            <label htmlFor="link-subject">
              Matière

              <select
                id="link-subject"
                value={subjectId}
                onChange={(event) =>
                  setSubjectId(event.target.value)
                }
                disabled={
                  isLoading || subjects.length === 0
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
                    {subject.name} (
                    {subject.short_name})
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="link-year">
              Année scolaire

              <input
                id="link-year"
                type="text"
                value={academicYear}
                onChange={(event) =>
                  setAcademicYear(event.target.value)
                }
                placeholder="Exemple : 2026-2027"
                required
              />
            </label>

            <div className="full-width">
              <button
                className="admin-button primary"
                type="submit"
                disabled={
                  isCreating ||
                  isLoading ||
                  formIsUnavailable
                }
              >
                {isCreating
                  ? 'Création en cours…'
                  : 'Créer l’affectation'}
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
              <h2>Affectations enregistrées</h2>

              {!isLoading && (
                <p>
                  {items.length}{' '}
                  {items.length > 1
                    ? 'affectations enregistrées'
                    : 'affectation enregistrée'}
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
              Chargement des affectations…
            </p>
          )}

          {!isLoading && items.length === 0 && (
            <p className="admin-empty">
              Aucune affectation n’est enregistrée.
            </p>
          )}

          {!isLoading && items.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table-common">
                <thead>
                  <tr>
                    <th>Professeur</th>
                    <th>Classe</th>
                    <th>Matière</th>
                    <th>Année scolaire</th>
                    <th>État</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>
                          {item.teacherLabel}
                        </strong>
                      </td>

                      <td>{item.classLabel}</td>

                      <td>{item.subjectLabel}</td>

                      <td>
                        <span className="admin-badge blue">
                          {item.academic_year}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            item.hasMissingData
                              ? 'admin-badge red'
                              : 'admin-badge green'
                          }
                        >
                          {item.hasMissingData
                            ? 'Données manquantes'
                            : 'Complète'}
                        </span>
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

import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'

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
  birth_date: string | null
  is_active: boolean
  classes: SchoolClass[] | null
}

type StudentsPageProps = {
  onBack: () => void
}

export function StudentsPage({
  onBack,
}: StudentsPageProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])

  const [studentNumber, setStudentNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [classId, setClassId] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData() {
    setIsLoading(true)
    setError('')

    const [studentsResult, classesResult] =
      await Promise.all([
        supabase
          .from('students')
          .select(`
            id,
            student_number,
            first_name,
            last_name,
            birth_date,
            is_active,
            classes (
              id,
              name,
              school_year
            )
          `)
          .order('last_name')
          .order('first_name'),

        supabase
          .from('classes')
          .select(`
            id,
            name,
            school_year
          `)
          .eq('is_active', true)
          .order('name'),
      ])

    if (studentsResult.error || classesResult.error) {
      setError(
        'Les données des élèves n’ont pas pu être chargées.',
      )
    } else {
      setStudents(studentsResult.data as Student[])
      setClasses(classesResult.data as SchoolClass[])
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleCreateStudent(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const normalizedStudentNumber =
      studentNumber.trim().toUpperCase()

    const normalizedFirstName = firstName.trim()
    const normalizedLastName = lastName.trim().toUpperCase()

    if (
      !normalizedStudentNumber ||
      !normalizedFirstName ||
      !normalizedLastName
    ) {
      setError(
        'Le numéro, le prénom et le nom sont obligatoires.',
      )
      return
    }

    setIsCreating(true)

    const { error: createError } = await supabase
      .from('students')
      .insert({
        student_number: normalizedStudentNumber,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        birth_date: birthDate || null,
        class_id: classId || null,
      })

    if (createError) {
      if (createError.code === '23505') {
        setError(
          'Ce numéro d’élève est déjà utilisé.',
        )
      } else {
        setError(
          'Le dossier élève n’a pas pu être créé.',
        )
      }
    } else {
      setStudentNumber('')
      setFirstName('')
      setLastName('')
      setBirthDate('')
      setClassId('')

      setSuccess(
        'Le dossier élève a été créé avec succès.',
      )

      await loadData()
    }

    setIsCreating(false)
  }

  return (
    <main>
      <header>
        <div>
          <p>Administration</p>
          <h1>Gestion des élèves</h1>
        </div>

        <button type="button" onClick={onBack}>
          Retour au tableau de bord
        </button>
      </header>

      <section>
        <h2>Créer un dossier élève</h2>

        <form onSubmit={handleCreateStudent}>
          <div>
            <label htmlFor="student-number">
              Numéro d’élève
            </label>

            <input
              id="student-number"
              type="text"
              value={studentNumber}
              onChange={(event) =>
                setStudentNumber(event.target.value)
              }
              placeholder="Exemple : ELV-0002"
              minLength={3}
              maxLength={30}
              required
            />
          </div>

          <div>
            <label htmlFor="student-first-name">
              Prénom
            </label>

            <input
              id="student-first-name"
              type="text"
              value={firstName}
              onChange={(event) =>
                setFirstName(event.target.value)
              }
              maxLength={80}
              required
            />
          </div>

          <div>
            <label htmlFor="student-last-name">
              Nom
            </label>

            <input
              id="student-last-name"
              type="text"
              value={lastName}
              onChange={(event) =>
                setLastName(event.target.value)
              }
              maxLength={80}
              required
            />
          </div>

          <div>
            <label htmlFor="student-birth-date">
              Date de naissance
            </label>

            <input
              id="student-birth-date"
              type="date"
              value={birthDate}
              onChange={(event) =>
                setBirthDate(event.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="student-class">
              Classe
            </label>

            <select
              id="student-class"
              value={classId}
              onChange={(event) =>
                setClassId(event.target.value)
              }
            >
              <option value="">
                Aucune classe
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

          <button
            type="submit"
            disabled={isCreating}
          >
            {isCreating
              ? 'Création en cours...'
              : 'Créer le dossier élève'}
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
        <h2>Élèves enregistrés</h2>

        {isLoading && (
          <p>Chargement des élèves...</p>
        )}

        {!isLoading && students.length === 0 && (
          <p>Aucun élève n’est enregistré.</p>
        )}

        {!isLoading && students.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Date de naissance</th>
                <th>Classe</th>
                <th>Statut</th>
              </tr>
            </thead>

            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.student_number}</td>
                  <td>{student.last_name}</td>
                  <td>{student.first_name}</td>

                  <td>
                    {student.birth_date
                      ? new Intl.DateTimeFormat(
                          'fr-FR',
                        ).format(
                          new Date(
                            `${student.birth_date}T12:00:00`,
                          ),
                        )
                      : 'Non renseignée'}
                  </td>

                  <td>
                    {student.classes?.[0]
  ? `${student.classes[0].name} — ${student.classes[0].school_year}`
  : 'Non affecté'}
                  </td>

                  <td>
                    {student.is_active
                      ? 'Actif'
                      : 'Archivé'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}

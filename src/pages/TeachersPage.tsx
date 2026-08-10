import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'

type Subject = {
  id: string
  name: string
  short_name: string
}

type Teacher = {
  id: string
  employee_number: string
  first_name: string
  last_name: string
  email: string | null
  is_active: boolean
  subjects: Subject[] | null
}

type TeachersPageProps = {
  onBack: () => void
}

export function TeachersPage({
  onBack,
}: TeachersPageProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  const [employeeNumber, setEmployeeNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData() {
    setIsLoading(true)
    setError('')

    const [teachersResult, subjectsResult] =
      await Promise.all([
        supabase
          .from('teachers')
          .select(
            `
            id,
            employee_number,
            first_name,
            last_name,
            email,
            is_active,
            subjects (
              id,
              name,
              short_name
            )
          `,
          )
          .order('last_name')
          .order('first_name'),

        supabase
          .from('subjects')
          .select('id, name, short_name')
          .eq('is_active', true)
          .order('name'),
      ])

    if (teachersResult.error || subjectsResult.error) {
      setError(
        'Les données professeurs n’ont pas pu être chargées.',
      )
    } else {
      setTeachers(teachersResult.data as Teacher[])
      setSubjects(subjectsResult.data as Subject[])
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleCreateTeacher(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const normalizedEmployeeNumber =
      employeeNumber.trim().toUpperCase()
    const normalizedFirstName = firstName.trim()
    const normalizedLastName = lastName.trim()
    const normalizedEmail = email.trim()

    if (
      !normalizedEmployeeNumber ||
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
      .from('teachers')
      .insert({
        employee_number: normalizedEmployeeNumber,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        email: normalizedEmail || null,
        subject_id: subjectId || null,
      })

    if (createError) {
      if (createError.code === '23505') {
        setError(
          'Ce numéro enseignant existe déjà.',
        )
      } else {
        setError(
          'Le profil professeur n’a pas pu être créé.',
        )
      }
    } else {
      setEmployeeNumber('')
      setFirstName('')
      setLastName('')
      setEmail('')
      setSubjectId('')
      setSuccess(
        'Le profil professeur a été créé avec succès.',
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
          <h1>Gestion des professeurs</h1>
        </div>

        <button type="button" onClick={onBack}>
          Retour au tableau de bord
        </button>
      </header>

      <section>
        <h2>Créer un professeur</h2>

        <form onSubmit={handleCreateTeacher}>
          <div>
            <label htmlFor="teacher-employee-number">
              Numéro enseignant
            </label>

            <input
              id="teacher-employee-number"
              type="text"
              value={employeeNumber}
              onChange={(event) =>
                setEmployeeNumber(event.target.value)
              }
              placeholder="Exemple : ENS-0003"
              required
            />
          </div>

          <div>
            <label htmlFor="teacher-first-name">
              Prénom
            </label>

            <input
              id="teacher-first-name"
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
            <label htmlFor="teacher-last-name">
              Nom
            </label>

            <input
              id="teacher-last-name"
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
            <label htmlFor="teacher-email">
              E-mail (optionnel)
            </label>

            <input
              id="teacher-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="exemple@sgc-rp.edu"
            />
          </div>

          <div>
            <label htmlFor="teacher-subject">
              Matière principale
            </label>

            <select
              id="teacher-subject"
              value={subjectId}
              onChange={(event) =>
                setSubjectId(event.target.value)
              }
            >
              <option value="">
                Aucune matière attribuée
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

          <button type="submit" disabled={isCreating}>
            {isCreating
              ? 'Création en cours...'
              : 'Créer le professeur'}
          </button>
        </form>

        {success && <p role="status">{success}</p>}
        {error && <p role="alert">{error}</p>}
      </section>

      <section>
        <h2>Professeurs enregistrés</h2>

        {isLoading && <p>Chargement des professeurs...</p>}

        {!isLoading && teachers.length === 0 && (
          <p>Aucun professeur n’est enregistré.</p>
        )}

        {!isLoading && teachers.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>E-mail</th>
                <th>Matière</th>
                <th>Statut</th>
              </tr>
            </thead>

            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td>{teacher.employee_number}</td>
                  <td>{teacher.last_name}</td>
                  <td>{teacher.first_name}</td>
                  <td>{teacher.email || '—'}</td>
                  <td>
                    {teacher.subjects?.[0]
  ? `${teacher.subjects[0].name} (${teacher.subjects[0].short_name})`
  : 'Aucune matière'}
                  </td>
                  <td>
                    {teacher.is_active
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

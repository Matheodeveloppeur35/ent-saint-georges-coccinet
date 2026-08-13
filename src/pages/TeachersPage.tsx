import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import './AdminPages.css'

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
          .select(`
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
          `)
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
        'Les données des professeurs n’ont pas pu être chargées.',
      )
    } else {
      setTeachers(teachersResult.data as Teacher[])
      setSubjects(subjectsResult.data as Subject[])
    }

    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
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
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p>Administration</p>

          <h1>Gestion des professeurs</h1>

          <p>
            Créez et consultez les profils des enseignants.
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
          <h2>Créer un professeur</h2>

          <form
            className="admin-form"
            onSubmit={handleCreateTeacher}
          >
            <label htmlFor="teacher-employee-number">
              Numéro enseignant

              <input
                id="teacher-employee-number"
                type="text"
                value={employeeNumber}
                onChange={(event) =>
                  setEmployeeNumber(event.target.value)
                }
                placeholder="Exemple : ENS-0003"
                minLength={3}
                maxLength={30}
                required
              />
            </label>

            <label htmlFor="teacher-first-name">
              Prénom

              <input
                id="teacher-first-name"
                type="text"
                value={firstName}
                onChange={(event) =>
                  setFirstName(event.target.value)
                }
                placeholder="Exemple : Claire"
                maxLength={80}
                required
              />
            </label>

            <label htmlFor="teacher-last-name">
              Nom

              <input
                id="teacher-last-name"
                type="text"
                value={lastName}
                onChange={(event) =>
                  setLastName(event.target.value)
                }
                placeholder="Exemple : Durand"
                maxLength={80}
                required
              />
            </label>

            <label htmlFor="teacher-email">
              E-mail (optionnel)

              <input
                id="teacher-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="exemple@sgc-rp.edu"
              />
            </label>

            <label htmlFor="teacher-subject">
              Matière principale

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
            </label>

            <div className="full-width">
              <button
                className="admin-button primary"
                type="submit"
                disabled={isCreating}
              >
                {isCreating
                  ? 'Création en cours…'
                  : 'Créer le professeur'}
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
              <h2>Professeurs enregistrés</h2>

              {!isLoading && (
                <p>
                  {teachers.length}{' '}
                  {teachers.length > 1
                    ? 'professeurs enregistrés'
                    : 'professeur enregistré'}
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
              Chargement des professeurs…
            </p>
          )}

          {!isLoading && teachers.length === 0 && (
            <p className="admin-empty">
              Aucun professeur n’est enregistré.
            </p>
          )}

          {!isLoading && teachers.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table-common">
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
                  {teachers.map((teacher) => {
                    const teacherSubject =
                      teacher.subjects?.[0]

                    return (
                      <tr key={teacher.id}>
                        <td>
                          <span className="admin-badge blue">
                            {teacher.employee_number}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {teacher.last_name}
                          </strong>
                        </td>

                        <td>{teacher.first_name}</td>

                        <td>
                          {teacher.email ? (
                            <a
                              className="admin-email-link"
                              href={`mailto:${teacher.email}`}
                            >
                              {teacher.email}
                            </a>
                          ) : (
                            <span className="admin-muted">
                              Non renseigné
                            </span>
                          )}
                        </td>

                        <td>
                          {teacherSubject ? (
                            <div className="admin-cell-stack">
                              <strong>
                                {teacherSubject.name}
                              </strong>

                              <small>
                                {teacherSubject.short_name}
                              </small>
                            </div>
                          ) : (
                            <span className="admin-badge orange">
                              Aucune matière
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              teacher.is_active
                                ? 'admin-badge green'
                                : 'admin-badge orange'
                            }
                          >
                            {teacher.is_active
                              ? 'Actif'
                              : 'Archivé'}
                          </span>
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

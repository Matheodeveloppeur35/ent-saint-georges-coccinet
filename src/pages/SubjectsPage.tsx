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
  color: string
  is_active: boolean
}

type SubjectsPageProps = {
  onBack: () => void
}

export function SubjectsPage({
  onBack,
}: SubjectsPageProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [color, setColor] = useState('#1d4ed8')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadSubjects() {
    setIsLoading(true)
    setError('')

    const { data, error: subjectsError } =
      await supabase
        .from('subjects')
        .select(`
          id,
          name,
          short_name,
          color,
          is_active
        `)
        .order('name')

    if (subjectsError) {
      setError(
        'Les matières n’ont pas pu être chargées.',
      )
    } else {
      setSubjects(data as Subject[])
    }

    setIsLoading(false)
  }

  useEffect(() => {
    void loadSubjects()
  }, [])

  async function handleCreateSubject(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const normalizedName = name.trim()
    const normalizedShortName =
      shortName.trim().toUpperCase()

    if (!normalizedName || !normalizedShortName) {
      setError('Tous les champs sont obligatoires.')
      return
    }

    setIsCreating(true)

    const { data, error: createError } =
      await supabase
        .from('subjects')
        .insert({
          name: normalizedName,
          short_name: normalizedShortName,
          color,
        })
        .select(`
          id,
          name,
          short_name,
          color,
          is_active
        `)
        .single()

    if (createError) {
      if (createError.code === '23505') {
        setError(
          'Une matière avec ce nom ou cette abréviation existe déjà.',
        )
      } else {
        setError(
          'La matière n’a pas pu être créée.',
        )
      }
    } else {
      setSubjects((currentSubjects) =>
        [...currentSubjects, data as Subject].sort(
          (firstSubject, secondSubject) =>
            firstSubject.name.localeCompare(
              secondSubject.name,
              'fr',
            ),
        ),
      )

      setName('')
      setShortName('')
      setColor('#1d4ed8')
      setSuccess(
        'La matière a été créée avec succès.',
      )
    }

    setIsCreating(false)
  }

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p>Administration</p>

          <h1>Gestion des matières</h1>

          <p>
            Créez et consultez les matières enseignées dans
            l’établissement.
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
          <h2>Créer une matière</h2>

          <form
            className="admin-form"
            onSubmit={handleCreateSubject}
          >
            <label htmlFor="subject-name">
              Nom de la matière

              <input
                id="subject-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Exemple : Français"
                minLength={2}
                maxLength={80}
                required
              />
            </label>

            <label htmlFor="subject-short-name">
              Abréviation

              <input
                id="subject-short-name"
                type="text"
                value={shortName}
                onChange={(event) =>
                  setShortName(event.target.value)
                }
                placeholder="Exemple : FR"
                maxLength={20}
                required
              />
            </label>

            <label htmlFor="subject-color">
              Couleur

              <div className="admin-color-field">
                <input
                  id="subject-color"
                  className="admin-color-input"
                  type="color"
                  value={color}
                  onChange={(event) =>
                    setColor(event.target.value)
                  }
                  required
                />

                <span className="admin-color-value">
                  {color.toUpperCase()}
                </span>
              </div>
            </label>

            <div className="full-width">
              <button
                className="admin-button primary"
                type="submit"
                disabled={isCreating}
              >
                {isCreating
                  ? 'Création en cours…'
                  : 'Créer la matière'}
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
          <h2>Matières enregistrées</h2>

          {isLoading && (
            <p className="admin-empty">
              Chargement des matières…
            </p>
          )}

          {!isLoading && subjects.length === 0 && (
            <p className="admin-empty">
              Aucune matière n’est enregistrée.
            </p>
          )}

          {!isLoading && subjects.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table-common">
                <thead>
                  <tr>
                    <th>Couleur</th>
                    <th>Matière</th>
                    <th>Abréviation</th>
                    <th>Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td>
                        <span
                          className="admin-color-preview"
                          title={subject.color}
                          style={{
                            backgroundColor: subject.color,
                          }}
                          aria-label={`Couleur ${subject.color}`}
                        />
                      </td>

                      <td>
                        <strong>{subject.name}</strong>
                      </td>

                      <td>
                        <span className="admin-badge blue">
                          {subject.short_name}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            subject.is_active
                              ? 'admin-badge green'
                              : 'admin-badge orange'
                          }
                        >
                          {subject.is_active
                            ? 'Active'
                            : 'Archivée'}
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

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
    loadSubjects()
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
    <main>
      <header>
        <div>
          <p>Administration</p>
          <h1>Gestion des matières</h1>
        </div>

        <button type="button" onClick={onBack}>
          Retour au tableau de bord
        </button>
      </header>

      <section>
        <h2>Créer une matière</h2>

        <form onSubmit={handleCreateSubject}>
          <div>
            <label htmlFor="subject-name">
              Nom de la matière
            </label>

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
          </div>

          <div>
            <label htmlFor="subject-short-name">
              Abréviation
            </label>

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
          </div>

          <div>
            <label htmlFor="subject-color">
              Couleur
            </label>

            <input
              id="subject-color"
              type="color"
              value={color}
              onChange={(event) =>
                setColor(event.target.value)
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
              : 'Créer la matière'}
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
        <h2>Matières enregistrées</h2>

        {isLoading && (
          <p>Chargement des matières...</p>
        )}

        {!isLoading && subjects.length === 0 && (
          <p>Aucune matière n’est enregistrée.</p>
        )}

        {!isLoading && subjects.length > 0 && (
          <table>
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
                      title={subject.color}
                      style={{
                        display: 'inline-block',
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        backgroundColor: subject.color,
                      }}
                    />
                  </td>

                  <td>{subject.name}</td>
                  <td>{subject.short_name}</td>

                  <td>
                    {subject.is_active
                      ? 'Active'
                      : 'Archivée'}
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

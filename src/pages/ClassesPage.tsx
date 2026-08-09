import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'

type SchoolClass = {
  id: string
  name: string
  level: string
  school_year: string
  is_active: boolean
}

type ClassesPageProps = {
  onBack: () => void
}

export function ClassesPage({
  onBack,
}: ClassesPageProps) {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [name, setName] = useState('')
  const [level, setLevel] = useState('')
  const [schoolYear, setSchoolYear] =
    useState('2026-2027')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadClasses() {
    setIsLoading(true)
    setError('')

    const { data, error: classesError } =
      await supabase
        .from('classes')
        .select(`
          id,
          name,
          level,
          school_year,
          is_active
        `)
        .order('name')

    if (classesError) {
      setError(
        'Les classes n’ont pas pu être chargées.',
      )
    } else {
      setClasses(data as SchoolClass[])
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadClasses()
  }, [])

  async function handleCreateClass(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const normalizedName = name.trim()
    const normalizedLevel = level.trim()
    const normalizedSchoolYear = schoolYear.trim()

    if (
      !normalizedName ||
      !normalizedLevel ||
      !normalizedSchoolYear
    ) {
      setError('Tous les champs sont obligatoires.')
      return
    }

    setIsCreating(true)

    const { data, error: createError } =
      await supabase
        .from('classes')
        .insert({
          name: normalizedName,
          level: normalizedLevel,
          school_year: normalizedSchoolYear,
        })
        .select(`
          id,
          name,
          level,
          school_year,
          is_active
        `)
        .single()

    if (createError) {
      if (createError.code === '23505') {
        setError(
          'Une classe portant ce nom existe déjà pour cette année scolaire.',
        )
      } else {
        setError(
          'La classe n’a pas pu être créée.',
        )
      }
    } else {
      setClasses((currentClasses) =>
        [...currentClasses, data as SchoolClass].sort(
          (firstClass, secondClass) =>
            firstClass.name.localeCompare(
              secondClass.name,
              'fr',
            ),
        ),
      )

      setName('')
      setLevel('')
      setSuccess('La classe a été créée avec succès.')
    }

    setIsCreating(false)
  }

  return (
    <main>
      <header>
        <div>
          <p>Administration</p>
          <h1>Gestion des classes</h1>
        </div>

        <button type="button" onClick={onBack}>
          Retour au tableau de bord
        </button>
      </header>

      <section>
        <h2>Créer une classe</h2>

        <form onSubmit={handleCreateClass}>
          <div>
            <label htmlFor="class-name">
              Nom de la classe
            </label>

            <input
              id="class-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Exemple : 5e A"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label htmlFor="class-level">
              Niveau
            </label>

            <input
              id="class-level"
              type="text"
              value={level}
              onChange={(event) =>
                setLevel(event.target.value)
              }
              placeholder="Exemple : Cinquième"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label htmlFor="school-year">
              Année scolaire
            </label>

            <input
              id="school-year"
              type="text"
              value={schoolYear}
              onChange={(event) =>
                setSchoolYear(event.target.value)
              }
              placeholder="2026-2027"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isCreating}
          >
            {isCreating
              ? 'Création en cours...'
              : 'Créer la classe'}
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
        <h2>Classes enregistrées</h2>

        {isLoading && <p>Chargement des classes...</p>}

        {!isLoading && classes.length === 0 && (
          <p>Aucune classe n’est enregistrée.</p>
        )}

        {!isLoading && classes.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Classe</th>
                <th>Niveau</th>
                <th>Année scolaire</th>
                <th>Statut</th>
              </tr>
            </thead>

            <tbody>
              {classes.map((schoolClass) => (
                <tr key={schoolClass.id}>
                  <td>{schoolClass.name}</td>
                  <td>{schoolClass.level}</td>
                  <td>{schoolClass.school_year}</td>
                  <td>
                    {schoolClass.is_active
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

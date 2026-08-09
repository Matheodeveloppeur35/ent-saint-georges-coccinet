import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { usernameToInternalEmail } from '../lib/auth'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setIsLoading(true)

    try {
      const email = usernameToInternalEmail(username)

      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        })

      if (signInError) {
        throw new Error(
          'Identifiant ou mot de passe incorrect.',
        )
      }

      const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  throw new Error(
    'La session utilisateur est introuvable.',
  )
}

const { data: profile, error: profileError } =
  await supabase
    .from('profiles')
    .select('username, first_name, last_name, account_status')
    .eq('id', user.id)
    .single()

if (profileError) {
  throw new Error(
    'Le profil administrateur est inaccessible.',
  )
}

alert(
  `Bienvenue ${profile.first_name} ${profile.last_name} (${profile.username})`,
)

    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Une erreur inattendue est survenue.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main>
      <section>
        <header>
          <p>Ensemble scolaire</p>
          <h1>Saint Georges Coccinet</h1>
          <p>Espace numérique de travail</p>
        </header>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username">
              Identifiant
            </label>

            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Exemple : admin"
              required
            />
          </div>

          <div>
            <label htmlFor="password">
              Mot de passe
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />
          </div>

          {error && (
            <p role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
          >
            {isLoading
              ? 'Connexion en cours...'
              : 'Se connecter'}
          </button>
        </form>

        <footer>
          <p>
            Plateforme fictive réservée au school RP.
          </p>
        </footer>
      </section>
    </main>
  )
}

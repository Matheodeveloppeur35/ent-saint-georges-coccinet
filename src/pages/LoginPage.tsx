import {
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import { usernameToInternalEmail } from '../lib/auth'
import { FirstLoginPage } from './FirstLoginPage'
import { AdminDashboardPage } from './AdminDashboardPage'
import './LoginPage.css'

type Profile = {
  username: string
  first_name: string
  last_name: string
  account_status:
    | 'invited'
    | 'active'
    | 'suspended'
    | 'locked'
    | 'archived'
  must_change_password: boolean
}

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [profile, setProfile] =
    useState<Profile | null>(null)

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

      const {
        data: accountProfile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(`
          username,
          first_name,
          last_name,
          account_status,
          must_change_password
        `)
        .eq('id', user.id)
        .single()

      if (profileError) {
  console.error(
    'Erreur de chargement du profil :',
    profileError,
  )

  throw new Error(
    `Le profil administrateur est inaccessible : ${profileError.message}`,
  )
}

if (!accountProfile) {
  throw new Error(
    'Aucun profil ne correspond à ce compte.',
  )
}

      if (
        accountProfile.account_status === 'suspended' ||
        accountProfile.account_status === 'locked' ||
        accountProfile.account_status === 'archived'
      ) {
        await supabase.auth.signOut()

        throw new Error(
          'Ce compte est actuellement désactivé.',
        )
      }

      setProfile(accountProfile as Profile)
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

  if (profile?.must_change_password) {
    return (
      <FirstLoginPage
        firstName={profile.first_name}
        onPasswordChanged={() => {
          setProfile({
            ...profile,
            must_change_password: false,
            account_status: 'active',
          })
        }}
      />
    )
  }

  if (profile) {
    return (
      <AdminDashboardPage
        firstName={profile.first_name}
        lastName={profile.last_name}
        onSignOut={() => {
          setProfile(null)
          setUsername('')
          setPassword('')
        }}
      />
    )
  }

  return (
    <main className="login-page">
      <section className="login-shell">
        <aside className="login-presentation">
          <div className="login-brand">
            <span
              className="login-brand-mark"
              aria-hidden="true"
            >
              SG
            </span>

            <div>
              <p>Ensemble scolaire</p>
              <strong>Saint Georges Coccinet</strong>
            </div>
          </div>

          <div className="login-presentation-content">
            <p className="login-kicker">
              Espace numérique de travail
            </p>

            <h1>
              Bienvenue dans votre environnement scolaire
            </h1>

            <p>
              Accédez aux services de l’établissement depuis
              une interface unique, claire et sécurisée.
            </p>

            <ul className="login-features">
              <li>
                <span aria-hidden="true">✓</span>
                Gestion des classes et des élèves
              </li>

              <li>
                <span aria-hidden="true">✓</span>
                Emplois du temps et affectations
              </li>

              <li>
                <span aria-hidden="true">✓</span>
                Cahier de texte et suivi pédagogique
              </li>
            </ul>
          </div>

          <p className="login-presentation-footer">
            Ensemble, construisons la réussite.
          </p>
        </aside>

        <div className="login-form-panel">
          <div className="login-form-container">
            <header className="login-form-header">
              <span className="login-mobile-mark">
                SG
              </span>

              <p className="login-kicker">
                Accès sécurisé
              </p>

              <h2>Connexion</h2>

              <p>
                Saisissez vos identifiants pour accéder à
                votre espace.
              </p>
            </header>

            <form
              className="login-form"
              onSubmit={handleSubmit}
            >
              <label htmlFor="username">
                Identifiant

                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)

                    if (error) {
                      setError('')
                    }
                  }}
                  placeholder="Exemple : admin"
                  disabled={isLoading}
                  required
                />
              </label>

              <label htmlFor="password">
                Mot de passe

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)

                    if (error) {
                      setError('')
                    }
                  }}
                  placeholder="Votre mot de passe"
                  disabled={isLoading}
                  required
                />
              </label>

              {error && (
                <div
                  className="login-error"
                  role="alert"
                >
                  <span aria-hidden="true">!</span>
                  <p>{error}</p>
                </div>
              )}

              <button
                className="login-submit"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span
                      className="login-spinner"
                      aria-hidden="true"
                    />
                    Connexion en cours…
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            <footer className="login-form-footer">
              <p>
                Plateforme fictive réservée au school RP.
              </p>
            </footer>
          </div>
        </div>
      </section>
    </main>
  )
}

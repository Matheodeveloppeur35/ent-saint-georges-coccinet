import {
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import { usernameToInternalEmail } from '../lib/auth'
import { FirstLoginPage } from './FirstLoginPage'
import { AdminDashboardPage } from './AdminDashboardPage'
import { StudentDashboardPage } from './StudentDashboardPage'
import './LoginPage.css'
import { TeacherDashboardPage } from './TeacherDashboardPage'
import { DirectionDashboardPage } from './DirectionDashboardPage'

type AppRole =
  | 'administrator'
  | 'direction'
  | 'school_life'
  | 'nurse'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'company'

type AccountStatus =
  | 'invited'
  | 'active'
  | 'suspended'
  | 'locked'
  | 'archived'

type AccountProfileRow = {
  username: string
  first_name: string
  last_name: string
  account_status: AccountStatus
  must_change_password: boolean
}

type UserRoleRow = {
  role: AppRole
}

type Profile = AccountProfileRow & {
  roles: AppRole[]
}

const ROLE_LABELS: Record<AppRole, string> = {
  administrator: 'Administrateur',
  direction: 'Direction',
  school_life: 'Vie scolaire',
  nurse: 'Infirmerie',
  teacher: 'Professeur',
  student: 'Élève',
  parent: 'Parent',
  company: 'Entreprise',
}

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [profile, setProfile] =
    useState<Profile | null>(null)

  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [isSigningOut, setIsSigningOut] =
    useState(false)

  function resetLogin() {
    setProfile(null)
    setUsername('')
    setPassword('')
    setError('')
  }

  async function handleSignOut() {
    setIsSigningOut(true)
    setError('')

    const { error: signOutError } =
      await supabase.auth.signOut()

    if (signOutError) {
      setError(
        'La déconnexion a échoué. Veuillez réessayer.',
      )
      setIsSigningOut(false)
      return
    }

    resetLogin()
    setIsSigningOut(false)
  }

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
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error(
          'La session utilisateur est introuvable.',
        )
      }

      const [
        profileResult,
        rolesResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            username,
            first_name,
            last_name,
            account_status,
            must_change_password
          `)
          .eq('id', user.id)
          .single(),

        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id),
      ])

      if (profileResult.error) {
        console.error(
          'Erreur de chargement du profil :',
          profileResult.error,
        )

        throw new Error(
          `Le profil utilisateur est inaccessible : ${profileResult.error.message}`,
        )
      }

      if (!profileResult.data) {
        throw new Error(
          'Aucun profil ne correspond à ce compte.',
        )
      }

      if (rolesResult.error) {
        console.error(
          'Erreur de chargement des rôles :',
          rolesResult.error,
        )

        throw new Error(
          'Les autorisations du compte sont inaccessibles.',
        )
      }

      const accountProfile =
        profileResult.data as AccountProfileRow

      if (
        accountProfile.account_status ===
          'suspended' ||
        accountProfile.account_status === 'locked' ||
        accountProfile.account_status === 'archived'
      ) {
        await supabase.auth.signOut()

        throw new Error(
          'Ce compte est actuellement désactivé.',
        )
      }

      const roles = (
        (rolesResult.data ?? []) as UserRoleRow[]
      ).map((row) => row.role)

      if (roles.length === 0) {
        await supabase.auth.signOut()

        throw new Error(
          'Aucun rôle n’est attribué à ce compte. Contactez un administrateur.',
        )
      }

      setProfile({
        ...accountProfile,
        roles,
      })
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

  /*
   * L’ordre des rôles est important :
   * un utilisateur qui possède aussi le rôle administrateur
   * est dirigé en priorité vers l’administration.
   */

  if (
    profile?.roles.includes('administrator')
  ) {
    return (
      <AdminDashboardPage
        firstName={profile.first_name}
        lastName={profile.last_name}
        onSignOut={resetLogin}
      />
    )
  }
if (profile?.roles.includes('direction')) {
  return (
    <DirectionDashboardPage
      firstName={profile.first_name}
      lastName={profile.last_name}
      onSignOut={resetLogin}
    />
  )
}

  /*
   * Un utilisateur possédant le rôle student est dirigé
   * vers son espace Élève et ne voit pas l’administration.
   */
if (profile?.roles.includes('teacher')) {
  return (
    <TeacherDashboardPage
      firstName={profile.first_name}
      lastName={profile.last_name}
      onSignOut={resetLogin}
    />
  )
}

  if (profile?.roles.includes('student')) {
    return (
      <StudentDashboardPage
        firstName={profile.first_name}
        lastName={profile.last_name}
        onSignOut={resetLogin}
      />
    )
  }

  /*
   * Écran temporaire pour les rôles dont l’espace
   * personnel n’a pas encore été développé.
   */

  if (profile) {
    return (
      <main className="login-page">
        <section className="login-access-denied">
          <span
            className="login-mobile-mark login-access-mark"
            aria-hidden="true"
          >
            SG
          </span>

          <p className="login-kicker">
            Espace personnel
          </p>

          <h1>
            Bonjour, {profile.first_name}
          </h1>

          <p>
            Votre authentification a réussi, mais votre
            espace personnel n’est pas encore disponible.
          </p>

          <div className="login-role-summary">
            <span>
              {profile.roles.length > 1
                ? 'Rôles attribués'
                : 'Rôle attribué'}
            </span>

            <div className="login-role-list">
              {profile.roles.map((role) => (
                <strong key={role}>
                  {ROLE_LABELS[role]}
                </strong>
              ))}
            </div>
          </div>

          <p className="login-access-information">
            Vous n’avez pas accès à l’espace
            d’administration. Un espace adapté à votre rôle
            sera proposé séparément.
          </p>

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
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <>
                <span
                  className="login-spinner"
                  aria-hidden="true"
                />

                Déconnexion en cours…
              </>
            ) : (
              'Se déconnecter'
            )}
          </button>
        </section>
      </main>
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

              <strong>
                Saint Georges Coccinet
              </strong>
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
              <span
                className="login-mobile-mark"
                aria-hidden="true"
              >
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

import {
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import './FirstLoginPage.css'

type FirstLoginPageProps = {
  firstName: string
  onPasswordChanged: () => void
}

export function FirstLoginPage({
  firstName,
  onPasswordChanged,
}: FirstLoginPageProps) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const passwordRules = {
    hasMinimumLength: password.length >= 12,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  }

  const passwordsMatch =
    confirmation.length > 0 &&
    password === confirmation

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')

    if (!passwordRules.hasMinimumLength) {
      setError(
        'Le mot de passe doit contenir au moins 12 caractères.',
      )
      return
    }

    if (!passwordRules.hasLowercase) {
      setError(
        'Le mot de passe doit contenir une lettre minuscule.',
      )
      return
    }

    if (!passwordRules.hasUppercase) {
      setError(
        'Le mot de passe doit contenir une lettre majuscule.',
      )
      return
    }

    if (!passwordRules.hasNumber) {
      setError(
        'Le mot de passe doit contenir un chiffre.',
      )
      return
    }

    if (password !== confirmation) {
      setError(
        'Les deux mots de passe ne correspondent pas.',
      )
      return
    }

    setIsLoading(true)

    try {
      const { error: passwordError } =
        await supabase.auth.updateUser({
          password,
        })

      if (passwordError) {
        throw passwordError
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(
          'La session utilisateur est introuvable.',
        )
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          must_change_password: false,
          account_status: 'active',
        })
        .eq('id', user.id)

      if (profileError) {
        throw new Error(
          'Le profil n’a pas pu être activé.',
        )
      }

      onPasswordChanged()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Le mot de passe n’a pas pu être modifié.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="first-login-page">
      <section className="first-login-shell">
        <aside className="first-login-presentation">
          <div className="first-login-brand">
            <span
              className="first-login-brand-mark"
              aria-hidden="true"
            >
              SG
            </span>

            <div>
              <p>Ensemble scolaire</p>
              <strong>Saint Georges Coccinet</strong>
            </div>
          </div>

          <div className="first-login-introduction">
            <p className="first-login-kicker">
              Activation du compte
            </p>

            <h1>
              Bienvenue,
              <br />
              {firstName}
            </h1>

            <p>
              Pour sécuriser votre espace, remplacez le mot
              de passe temporaire avant d’accéder à l’ENT.
            </p>
          </div>

          <div className="first-login-security">
            <span aria-hidden="true">✓</span>

            <p>
              Votre nouveau mot de passe sera utilisé lors de
              vos prochaines connexions.
            </p>
          </div>
        </aside>

        <div className="first-login-form-panel">
          <div className="first-login-form-container">
            <header className="first-login-form-header">
              <span
                className="first-login-mobile-mark"
                aria-hidden="true"
              >
                SG
              </span>

              <p className="first-login-kicker">
                Première connexion
              </p>

              <h2>Créer votre mot de passe</h2>

              <p>
                Choisissez un mot de passe respectant les
                règles de sécurité ci-dessous.
              </p>
            </header>

            <form
              className="first-login-form"
              onSubmit={handleSubmit}
            >
              <label htmlFor="new-password">
                Nouveau mot de passe

                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)

                    if (error) {
                      setError('')
                    }
                  }}
                  placeholder="Saisissez votre nouveau mot de passe"
                  disabled={isLoading}
                  required
                />
              </label>

              <label htmlFor="confirm-password">
                Confirmer le mot de passe

                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => {
                    setConfirmation(event.target.value)

                    if (error) {
                      setError('')
                    }
                  }}
                  placeholder="Saisissez-le une seconde fois"
                  disabled={isLoading}
                  required
                />
              </label>

              <div
                className="password-rules"
                aria-label="Règles du mot de passe"
              >
                <p>Votre mot de passe doit contenir :</p>

                <ul>
                  <li
                    className={
                      passwordRules.hasMinimumLength
                        ? 'is-valid'
                        : undefined
                    }
                  >
                    <span aria-hidden="true">
                      {passwordRules.hasMinimumLength
                        ? '✓'
                        : '•'}
                    </span>

                    Au moins 12 caractères
                  </li>

                  <li
                    className={
                      passwordRules.hasUppercase
                        ? 'is-valid'
                        : undefined
                    }
                  >
                    <span aria-hidden="true">
                      {passwordRules.hasUppercase
                        ? '✓'
                        : '•'}
                    </span>

                    Une lettre majuscule
                  </li>

                  <li
                    className={
                      passwordRules.hasLowercase
                        ? 'is-valid'
                        : undefined
                    }
                  >
                    <span aria-hidden="true">
                      {passwordRules.hasLowercase
                        ? '✓'
                        : '•'}
                    </span>

                    Une lettre minuscule
                  </li>

                  <li
                    className={
                      passwordRules.hasNumber
                        ? 'is-valid'
                        : undefined
                    }
                  >
                    <span aria-hidden="true">
                      {passwordRules.hasNumber
                        ? '✓'
                        : '•'}
                    </span>

                    Un chiffre
                  </li>

                  <li
                    className={
                      passwordsMatch
                        ? 'is-valid'
                        : undefined
                    }
                  >
                    <span aria-hidden="true">
                      {passwordsMatch ? '✓' : '•'}
                    </span>

                    Deux mots de passe identiques
                  </li>
                </ul>
              </div>

              {error && (
                <div
                  className="first-login-error"
                  role="alert"
                >
                  <span aria-hidden="true">!</span>
                  <p>{error}</p>
                </div>
              )}

              <button
                className="first-login-submit"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span
                      className="first-login-spinner"
                      aria-hidden="true"
                    />

                    Modification en cours…
                  </>
                ) : (
                  'Enregistrer le mot de passe'
                )}
              </button>
            </form>

            <footer className="first-login-footer">
              <p>
                Ne communiquez jamais votre mot de passe à
                une autre personne.
              </p>
            </footer>
          </div>
        </div>
      </section>
    </main>
  )
}

import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')

    if (password.length < 12) {
      setError(
        'Le mot de passe doit contenir au moins 12 caractères.',
      )
      return
    }

    if (!/[a-z]/.test(password)) {
      setError(
        'Le mot de passe doit contenir une lettre minuscule.',
      )
      return
    }

    if (!/[A-Z]/.test(password)) {
      setError(
        'Le mot de passe doit contenir une lettre majuscule.',
      )
      return
    }

    if (!/[0-9]/.test(password)) {
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
    <main>
      <section>
        <header>
          <p>Première connexion</p>
          <h1>Bienvenue, {firstName}</h1>
          <p>
            Remplacez votre mot de passe temporaire
            avant d’accéder à l’ENT.
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="new-password">
              Nouveau mot de passe
            </label>

            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />
          </div>

          <div>
            <label htmlFor="confirm-password">
              Confirmer le mot de passe
            </label>

            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) =>
                setConfirmation(event.target.value)
              }
              required
            />
          </div>

          <ul>
            <li>Au moins 12 caractères</li>
            <li>Une lettre majuscule</li>
            <li>Une lettre minuscule</li>
            <li>Un chiffre</li>
          </ul>

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
              ? 'Modification en cours...'
              : 'Enregistrer le mot de passe'}
          </button>
        </form>
      </section>
    </main>
  )
}

const INTERNAL_AUTH_DOMAIN = 'auth.sgc-rp.invalid'

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidUsername(value: string): boolean {
  const username = normalizeUsername(value)

  return /^[a-z0-9][a-z0-9._-]{2,49}$/.test(username)
}

export function usernameToInternalEmail(
  username: string,
): string {
  const normalizedUsername = normalizeUsername(username)

  if (!isValidUsername(normalizedUsername)) {
    throw new Error(
      'L’identifiant doit contenir entre 3 et 50 caractères autorisés.',
    )
  }

  return `${normalizedUsername}@${INTERNAL_AUTH_DOMAIN}`
}

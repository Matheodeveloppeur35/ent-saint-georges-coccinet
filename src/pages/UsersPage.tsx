import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import './AdminPages.css'

type AccountStatus =
  | 'invited'
  | 'active'
  | 'suspended'
  | 'locked'
  | 'archived'

type AppRole =
  | 'administrator'
  | 'direction'
  | 'school_life'
  | 'nurse'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'company'

type Profile = {
  id: string
  username: string
  first_name: string
  last_name: string
  account_status: AccountStatus
  must_change_password: boolean
  avatar_path: string | null
  created_at: string
  updated_at: string
}

type UserRoleRow = {
  user_id: string
  role: AppRole
  created_at: string
}

type UserView = Profile & {
  roles: AppRole[]
}

type CreateUserResponse = {
  message?: string
  error?: string
}

type UsersPageProps = {
  onBack: () => void
}

const ACCOUNT_STATUS_LABELS: Record<
  AccountStatus,
  string
> = {
  invited: 'Invité',
  active: 'Actif',
  suspended: 'Suspendu',
  locked: 'Verrouillé',
  archived: 'Archivé',
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

const ALL_ROLES =
  Object.keys(ROLE_LABELS) as AppRole[]

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getStatusBadgeClass(status: AccountStatus) {
  if (status === 'active') {
    return 'admin-badge green'
  }

  if (
    status === 'suspended' ||
    status === 'locked' ||
    status === 'archived'
  ) {
    return 'admin-badge red'
  }

  return 'admin-badge orange'
}

export function UsersPage({
  onBack,
}: UsersPageProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [userRoles, setUserRoles] =
    useState<UserRoleRow[]>([])
  const [currentUserId, setCurrentUserId] = useState('')

  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const [temporaryPassword, setTemporaryPassword] =
    useState('')

  const [selectedRole, setSelectedRole] =
    useState<AppRole>('student')

  const [search, setSearch] = useState('')

  const [statusFilter, setStatusFilter] =
    useState<'ALL' | AccountStatus>('ALL')

  const [roleFilter, setRoleFilter] =
    useState<'ALL' | AppRole>('ALL')

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  const [updatingUserId, setUpdatingUserId] =
    useState<string | null>(null)

  const [updatingRoleKey, setUpdatingRoleKey] =
    useState<string | null>(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError('')

    const [
      currentUserResult,
      profilesResult,
      rolesResult,
    ] = await Promise.all([
      supabase.auth.getUser(),

      supabase
        .from('profiles')
        .select(`
          id,
          username,
          first_name,
          last_name,
          account_status,
          must_change_password,
          avatar_path,
          created_at,
          updated_at
        `)
        .order('last_name')
        .order('first_name'),

      supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          created_at
        `)
        .order('created_at'),
    ])

    if (
      currentUserResult.error ||
      !currentUserResult.data.user
    ) {
      setError(
        'La session administrateur est introuvable.',
      )
      setIsLoading(false)
      return
    }

    if (profilesResult.error || rolesResult.error) {
      console.error(
        'Erreur de chargement des utilisateurs :',
        {
          profiles: profilesResult.error,
          roles: rolesResult.error,
        },
      )

      setError(
        'Les utilisateurs et leurs rôles n’ont pas pu être chargés.',
      )
      setIsLoading(false)
      return
    }

    setCurrentUserId(currentUserResult.data.user.id)

    setProfiles(
      (profilesResult.data ?? []) as Profile[],
    )

    setUserRoles(
      (rolesResult.data ?? []) as UserRoleRow[],
    )

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const rolesByUser = useMemo(() => {
    const roles = new Map<string, AppRole[]>()

    for (const row of userRoles) {
      const existing = roles.get(row.user_id)

      if (existing) {
        existing.push(row.role)
      } else {
        roles.set(row.user_id, [row.role])
      }
    }

    return roles
  }, [userRoles])

  const users = useMemo<UserView[]>(
    () =>
      profiles.map((profile) => ({
        ...profile,
        roles: rolesByUser.get(profile.id) ?? [],
      })),
    [profiles, rolesByUser],
  )

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase('fr')

    return users.filter((user) => {
      const searchableText = [
        user.username,
        user.first_name,
        user.last_name,
        ...user.roles.map(
          (role) => ROLE_LABELS[role],
        ),
      ]
        .join(' ')
        .toLocaleLowerCase('fr')

      const matchesSearch =
        normalizedSearch === '' ||
        searchableText.includes(normalizedSearch)

      const matchesStatus =
        statusFilter === 'ALL' ||
        user.account_status === statusFilter

      const matchesRole =
        roleFilter === 'ALL' ||
        user.roles.includes(roleFilter)

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRole
      )
    })
  }, [
    users,
    search,
    statusFilter,
    roleFilter,
  ])

  const activeCount = users.filter(
    (user) => user.account_status === 'active',
  ).length

  const invitedCount = users.filter(
    (user) => user.account_status === 'invited',
  ).length

  const disabledCount = users.filter(
    (user) =>
      user.account_status === 'suspended' ||
      user.account_status === 'locked' ||
      user.account_status === 'archived',
  ).length

  const administratorCount = users.filter((user) =>
    user.roles.includes('administrator'),
  ).length

  async function handleCreateUser(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const normalizedUsername = username
      .trim()
      .toLocaleLowerCase('fr')

    const normalizedFirstName = firstName.trim()
    const normalizedLastName = lastName.trim()

    if (
      !/^[a-z0-9._-]{3,50}$/.test(
        normalizedUsername,
      )
    ) {
      setError(
        'L’identifiant doit contenir entre 3 et 50 caractères : lettres minuscules, chiffres, point, tiret ou underscore.',
      )
      return
    }

    if (
      !normalizedFirstName ||
      !normalizedLastName
    ) {
      setError(
        'Le prénom et le nom sont obligatoires.',
      )
      return
    }

    if (
      temporaryPassword.length < 12 ||
      !/[a-z]/.test(temporaryPassword) ||
      !/[A-Z]/.test(temporaryPassword) ||
      !/[0-9]/.test(temporaryPassword)
    ) {
      setError(
        'Le mot de passe temporaire doit contenir au moins 12 caractères, une majuscule, une minuscule et un chiffre.',
      )
      return
    }

    setIsCreating(true)

    const {
      data,
      error: invokeError,
    } = await supabase.functions.invoke(
      'create-user',
      {
        body: {
          username: normalizedUsername,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          temporaryPassword,
          role: selectedRole,
        },
      },
    )

    if (invokeError) {
      console.error(
        'Erreur de la fonction create-user :',
        invokeError,
      )

      let errorMessage =
        'Le compte utilisateur n’a pas pu être créé.'

      const context = invokeError.context

      if (context instanceof Response) {
        try {
          const responseBody =
            (await context.json()) as CreateUserResponse

          if (responseBody.error) {
            errorMessage = responseBody.error
          }
        } catch {
          // La réponse n’était pas au format JSON.
        }
      }

      setError(errorMessage)
      setIsCreating(false)
      return
    }

    const response =
      (data ?? {}) as CreateUserResponse

    if (response.error) {
      setError(response.error)
      setIsCreating(false)
      return
    }

    setUsername('')
    setFirstName('')
    setLastName('')
    setTemporaryPassword('')
    setSelectedRole('student')

    setSuccess(
      response.message ??
        'Le compte utilisateur a été créé.',
    )

    await loadUsers()
    setIsCreating(false)
  }

  async function updateProfile(
    userId: string,
    changes: Partial<
      Pick<
        Profile,
        | 'account_status'
        | 'must_change_password'
      >
    >,
  ) {
    setError('')
    setSuccess('')
    setUpdatingUserId(userId)

    const { error: updateError } = await supabase
      .from('profiles')
      .update(changes)
      .eq('id', userId)

    if (updateError) {
      setError(
        `Le profil n’a pas pu être modifié : ${updateError.message}`,
      )
    } else {
      setSuccess(
        'Le profil utilisateur a été modifié.',
      )
      await loadUsers()
    }

    setUpdatingUserId(null)
  }

  async function addRole(
    userId: string,
    role: AppRole,
  ) {
    setError('')
    setSuccess('')

    const operationKey = `${userId}:${role}`
    setUpdatingRoleKey(operationKey)

    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        setError(
          'Ce rôle est déjà attribué à cet utilisateur.',
        )
      } else {
        setError(
          `Le rôle n’a pas pu être attribué : ${insertError.message}`,
        )
      }
    } else {
      setSuccess('Le rôle a été attribué.')
      await loadUsers()
    }

    setUpdatingRoleKey(null)
  }

  async function removeRole(
    userId: string,
    role: AppRole,
  ) {
    setError('')
    setSuccess('')

    if (
      userId === currentUserId &&
      role === 'administrator'
    ) {
      setError(
        'Vous ne pouvez pas retirer votre propre rôle administrateur.',
      )
      return
    }

    const operationKey = `${userId}:${role}`
    setUpdatingRoleKey(operationKey)

    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role)

    if (deleteError) {
      setError(
        `Le rôle n’a pas pu être retiré : ${deleteError.message}`,
      )
    } else {
      setSuccess('Le rôle a été retiré.')
      await loadUsers()
    }

    setUpdatingRoleKey(null)
  }

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p>Administration</p>

          <h1>Gestion des utilisateurs</h1>

          <p>
            Créez les comptes, gérez leurs statuts et
            attribuez leurs rôles.
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
        <section className="admin-stats-grid">
          <article className="admin-stat-card">
            <span>Comptes</span>
            <strong>{users.length}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Actifs</span>
            <strong>{activeCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Invités</span>
            <strong>{invitedCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Désactivés</span>
            <strong>{disabledCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Administrateurs</span>
            <strong>{administratorCount}</strong>
          </article>
        </section>

        <section className="admin-card">
          <h2>Créer un compte utilisateur</h2>

          <p className="admin-card-description">
            Le nouvel utilisateur devra remplacer son mot de
            passe temporaire lors de sa première connexion.
          </p>

          <form
            className="admin-form"
            onSubmit={handleCreateUser}
          >
            <label htmlFor="user-username">
              Identifiant

              <input
                id="user-username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="Exemple : jdupont"
                autoCapitalize="none"
                spellCheck={false}
                minLength={3}
                maxLength={50}
                required
              />
            </label>

            <label htmlFor="user-role">
              Rôle initial

              <select
                id="user-role"
                value={selectedRole}
                onChange={(event) =>
                  setSelectedRole(
                    event.target.value as AppRole,
                  )
                }
                required
              >
                {ALL_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="user-first-name">
              Prénom

              <input
                id="user-first-name"
                type="text"
                value={firstName}
                onChange={(event) =>
                  setFirstName(event.target.value)
                }
                maxLength={80}
                required
              />
            </label>

            <label htmlFor="user-last-name">
              Nom

              <input
                id="user-last-name"
                type="text"
                value={lastName}
                onChange={(event) =>
                  setLastName(event.target.value)
                }
                maxLength={80}
                required
              />
            </label>

            <label
              className="full-width"
              htmlFor="user-temporary-password"
            >
              Mot de passe temporaire

              <input
                id="user-temporary-password"
                type="password"
                autoComplete="new-password"
                value={temporaryPassword}
                onChange={(event) =>
                  setTemporaryPassword(
                    event.target.value,
                  )
                }
                placeholder="12 caractères minimum"
                required
              />
            </label>

            <div className="full-width">
              <button
                className="admin-button primary"
                type="submit"
                disabled={isCreating}
              >
                {isCreating
                  ? 'Création en cours…'
                  : 'Créer le compte'}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-card">
          <div className="admin-section-heading">
            <div>
              <h2>Comptes enregistrés</h2>

              {!isLoading && (
                <p>
                  {filteredUsers.length}{' '}
                  {filteredUsers.length > 1
                    ? 'comptes affichés'
                    : 'compte affiché'}
                </p>
              )}
            </div>

            <button
              className="admin-button"
              type="button"
              onClick={() => void loadUsers()}
              disabled={isLoading}
            >
              {isLoading
                ? 'Chargement…'
                : 'Actualiser'}
            </button>
          </div>

          <div className="admin-filter-grid admin-user-filters">
            <input
              className="admin-input"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher un compte…"
              aria-label="Rechercher un compte"
            />

            <select
              className="admin-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | 'ALL'
                    | AccountStatus,
                )
              }
              aria-label="Filtrer par statut"
            >
              <option value="ALL">
                Tous les statuts
              </option>

              {Object.entries(
                ACCOUNT_STATUS_LABELS,
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="admin-select"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target.value as
                    | 'ALL'
                    | AppRole,
                )
              }
              aria-label="Filtrer par rôle"
            >
              <option value="ALL">
                Tous les rôles
              </option>

              {ALL_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          {isLoading && (
            <p className="admin-empty">
              Chargement des utilisateurs…
            </p>
          )}

          {!isLoading && users.length === 0 && (
            <p className="admin-empty">
              Aucun utilisateur n’est enregistré.
            </p>
          )}

          {!isLoading &&
            users.length > 0 &&
            filteredUsers.length === 0 && (
              <p className="admin-empty">
                Aucun utilisateur ne correspond aux filtres.
              </p>
            )}

          {!isLoading &&
            filteredUsers.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table-common admin-users-table">
                  <thead>
                    <tr>
                      <th>Utilisateur</th>
                      <th>Identifiant</th>
                      <th>Statut</th>
                      <th>Mot de passe</th>
                      <th>Rôles</th>
                      <th>Création</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="admin-cell-stack">
                            <strong>
                              {user.first_name}{' '}
                              {user.last_name}
                            </strong>

                            {user.id === currentUserId && (
                              <small>
                                Compte actuellement connecté
                              </small>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="admin-badge blue">
                            {user.username}
                          </span>
                        </td>

                        <td>
                          <div className="admin-user-control">
                            <span
                              className={getStatusBadgeClass(
                                user.account_status,
                              )}
                            >
                              {
                                ACCOUNT_STATUS_LABELS[
                                  user.account_status
                                ]
                              }
                            </span>

                            <select
                              className="admin-select"
                              value={user.account_status}
                              disabled={
                                updatingUserId === user.id ||
                                user.id === currentUserId
                              }
                              onChange={(event) =>
                                void updateProfile(
                                  user.id,
                                  {
                                    account_status:
                                      event.target
                                        .value as AccountStatus,
                                  },
                                )
                              }
                              aria-label={`Modifier le statut de ${user.username}`}
                            >
                              {Object.entries(
                                ACCOUNT_STATUS_LABELS,
                              ).map(
                                ([value, label]) => (
                                  <option
                                    key={value}
                                    value={value}
                                  >
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                        </td>

                        <td>
                          <div className="admin-user-control">
                            <span
                              className={
                                user.must_change_password
                                  ? 'admin-badge orange'
                                  : 'admin-badge green'
                              }
                            >
                              {user.must_change_password
                                ? 'À modifier'
                                : 'Validé'}
                            </span>

                            <button
                              className="admin-button"
                              type="button"
                              disabled={
                                updatingUserId === user.id
                              }
                              onClick={() =>
                                void updateProfile(
                                  user.id,
                                  {
                                    must_change_password:
                                      !user.must_change_password,
                                  },
                                )
                              }
                            >
                              {user.must_change_password
                                ? 'Marquer comme validé'
                                : 'Imposer le changement'}
                            </button>
                          </div>
                        </td>

                        <td>
                          <div className="admin-role-grid">
                            {ALL_ROLES.map((role) => {
                              const hasRole =
                                user.roles.includes(role)

                              const operationKey =
                                `${user.id}:${role}`

                              return (
                                <button
                                  className={
                                    hasRole
                                      ? 'admin-role-chip is-active'
                                      : 'admin-role-chip'
                                  }
                                  type="button"
                                  key={role}
                                  disabled={
                                    updatingRoleKey ===
                                      operationKey ||
                                    (user.id ===
                                      currentUserId &&
                                      role ===
                                        'administrator' &&
                                      hasRole)
                                  }
                                  onClick={() =>
                                    hasRole
                                      ? void removeRole(
                                          user.id,
                                          role,
                                        )
                                      : void addRole(
                                          user.id,
                                          role,
                                        )
                                  }
                                  title={
                                    hasRole
                                      ? `Retirer le rôle ${ROLE_LABELS[role]}`
                                      : `Attribuer le rôle ${ROLE_LABELS[role]}`
                                  }
                                >
                                  {hasRole ? '✓ ' : '+ '}
                                  {ROLE_LABELS[role]}
                                </button>
                              )
                            })}
                          </div>
                        </td>

                        <td>
                          {formatDateTime(
                            user.created_at,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>

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
      </div>
    </main>
  )
}

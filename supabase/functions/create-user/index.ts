import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

type AppRole =
  | 'administrator'
  | 'direction'
  | 'school_life'
  | 'nurse'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'company'

type CreateUserBody = {
  username?: unknown
  firstName?: unknown
  lastName?: unknown
  temporaryPassword?: unknown
  role?: unknown
}

const ALLOWED_ROLES: AppRole[] = [
  'administrator',
  'direction',
  'school_life',
  'nurse',
  'teacher',
  'student',
  'parent',
  'company',
]

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase('fr')
}

function isValidUsername(value: string) {
  return /^[a-z0-9._-]{3,50}$/.test(value)
}

function isValidTemporaryPassword(value: string) {
  return (
    value.length >= 12 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value)
  )
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        error: 'Méthode HTTP non autorisée.',
      },
      405,
    )
  }

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ?? ''

  const publishableKey =
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
    ''

  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    ''

  if (
    !supabaseUrl ||
    !publishableKey ||
    !serviceRoleKey
  ) {
    console.error(
      'Configuration Supabase manquante dans la fonction.',
    )

    return jsonResponse(
      {
        error:
          'La fonction serveur est mal configurée.',
      },
      500,
    )
  }

  const authorization =
    request.headers.get('Authorization')

  if (!authorization) {
    return jsonResponse(
      {
        error: 'Authentification requise.',
      },
      401,
    )
  }

  const userClient = createClient(
    supabaseUrl,
    publishableKey,
    {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )

  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )

  try {
    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser()

    if (callerError || !caller) {
      return jsonResponse(
        {
          error:
            'La session administrateur est invalide.',
        },
        401,
      )
    }

    const { data: callerRole, error: roleError } =
      await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', caller.id)
        .eq('role', 'administrator')
        .maybeSingle()

    if (roleError) {
      console.error(
        'Vérification du rôle administrateur :',
        roleError,
      )

      return jsonResponse(
        {
          error:
            'Le rôle administrateur n’a pas pu être vérifié.',
        },
        500,
      )
    }

    if (!callerRole) {
      return jsonResponse(
        {
          error:
            'Seul un administrateur peut créer un compte.',
        },
        403,
      )
    }

    let body: CreateUserBody

    try {
      body = (await request.json()) as CreateUserBody
    } catch {
      return jsonResponse(
        {
          error: 'Le corps de la requête est invalide.',
        },
        400,
      )
    }

    const username =
      typeof body.username === 'string'
        ? normalizeUsername(body.username)
        : ''

    const firstName =
      typeof body.firstName === 'string'
        ? body.firstName.trim()
        : ''

    const lastName =
      typeof body.lastName === 'string'
        ? body.lastName.trim()
        : ''

    const temporaryPassword =
      typeof body.temporaryPassword === 'string'
        ? body.temporaryPassword
        : ''

    const role =
      typeof body.role === 'string'
        ? body.role
        : ''

    if (!isValidUsername(username)) {
      return jsonResponse(
        {
          error:
            'L’identifiant doit contenir entre 3 et 50 caractères : lettres minuscules, chiffres, point, tiret ou underscore.',
        },
        400,
      )
    }

    if (!firstName || !lastName) {
      return jsonResponse(
        {
          error:
            'Le prénom et le nom sont obligatoires.',
        },
        400,
      )
    }

    if (!isValidTemporaryPassword(temporaryPassword)) {
      return jsonResponse(
        {
          error:
            'Le mot de passe temporaire doit contenir au moins 12 caractères, une majuscule, une minuscule et un chiffre.',
        },
        400,
      )
    }

    if (!ALLOWED_ROLES.includes(role as AppRole)) {
      return jsonResponse(
        {
          error: 'Le rôle sélectionné est invalide.',
        },
        400,
      )
    }

    const internalEmail =
      `${username}@auth.sgc-rp.invalid`

    const { data: existingProfile, error: profileCheckError } =
      await adminClient
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()

    if (profileCheckError) {
      console.error(
        'Vérification de l’identifiant :',
        profileCheckError,
      )

      return jsonResponse(
        {
          error:
            'L’identifiant n’a pas pu être vérifié.',
        },
        500,
      )
    }

    if (existingProfile) {
      return jsonResponse(
        {
          error: 'Cet identifiant est déjà utilisé.',
        },
        409,
      )
    }

    const {
      data: createdAuthUser,
      error: createAuthError,
    } = await adminClient.auth.admin.createUser({
      email: internalEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        username,
        first_name: firstName,
        last_name: lastName,
      },
    })

    if (createAuthError || !createdAuthUser.user) {
      console.error(
        'Création du compte Auth :',
        createAuthError,
      )

      const message =
        createAuthError?.message
          ?.toLocaleLowerCase('fr')
          .includes('already')
          ? 'Cet identifiant est déjà utilisé.'
          : 'Le compte de connexion n’a pas pu être créé.'

      return jsonResponse(
        {
          error: message,
        },
        createAuthError?.status === 422 ? 409 : 500,
      )
    }

    const createdUserId = createdAuthUser.user.id

    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: createdUserId,
        username,
        first_name: firstName,
        last_name: lastName,
        account_status: 'invited',
        must_change_password: true,
      })

    if (profileError) {
      console.error(
        'Création du profil :',
        profileError,
      )

      await adminClient.auth.admin.deleteUser(
        createdUserId,
      )

      return jsonResponse(
        {
          error:
            'Le profil utilisateur n’a pas pu être créé.',
        },
        500,
      )
    }

    const { error: userRoleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: createdUserId,
        role,
      })

    if (userRoleError) {
      console.error(
        'Attribution du rôle :',
        userRoleError,
      )

      await adminClient
        .from('profiles')
        .delete()
        .eq('id', createdUserId)

      await adminClient.auth.admin.deleteUser(
        createdUserId,
      )

      return jsonResponse(
        {
          error:
            'Le rôle utilisateur n’a pas pu être attribué.',
        },
        500,
      )
    }

    return jsonResponse(
      {
        message:
          'Le compte utilisateur a été créé avec succès.',
        user: {
          id: createdUserId,
          username,
          firstName,
          lastName,
          role,
          accountStatus: 'invited',
          mustChangePassword: true,
        },
      },
      201,
    )
  } catch (caughtError) {
    console.error(
      'Erreur inattendue dans create-user :',
      caughtError,
    )

    return jsonResponse(
      {
        error:
          'Une erreur inattendue est survenue pendant la création du compte.',
      },
      500,
    )
  }
})

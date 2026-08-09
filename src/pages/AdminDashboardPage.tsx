import { supabase } from '../lib/supabase'

type AdminDashboardPageProps = {
  firstName: string
  lastName: string
  onSignOut: () => void
}

export function AdminDashboardPage({
  firstName,
  lastName,
  onSignOut,
}: AdminDashboardPageProps) {
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert('La déconnexion a échoué.')
      return
    }

    onSignOut()
  }

  const modules = [
    {
      title: 'Utilisateurs',
      description:
        'Créer, modifier, suspendre et gérer les comptes.',
    },
    {
      title: 'Rôles et permissions',
      description:
        'Attribuer les espaces et contrôler les accès.',
    },
    {
      title: 'Classes',
      description:
        'Gérer les classes, les élèves et les affectations.',
    },
    {
      title: 'Emplois du temps',
      description:
        'Organiser les cours, salles et professeurs.',
    },
    {
      title: 'Vie scolaire',
      description:
        'Consulter les appels, absences et retards.',
    },
    {
      title: 'Notation professorale',
      description:
        'Suivre les appels et les cahiers de texte.',
    },
    {
      title: 'Entreprises et stages',
      description:
        'Gérer les partenaires, stages et conventions.',
    },
    {
      title: 'Paramètres',
      description:
        'Configurer les modules et l’établissement.',
    },
  ]

  return (
    <main>
      <header>
        <div>
          <p>ENT Saint Georges Coccinet</p>

          <h1>
            Bonjour, {firstName} {lastName}
          </h1>

          <p>Espace Administrateur</p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
        >
          Se déconnecter
        </button>
      </header>

      <section>
        <h2>Tableau de bord</h2>

        <p>
          Gérez les principaux services de votre ENT.
        </p>

        <div>
          {modules.map((module) => (
            <article key={module.title}>
              <h3>{module.title}</h3>
              <p>{module.description}</p>

              <button type="button" disabled>
                Bientôt disponible
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

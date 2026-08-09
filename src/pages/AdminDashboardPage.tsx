import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ClassesPage } from './ClassesPage'
import { SubjectsPage } from './SubjectsPage'


type AdminDashboardPageProps = {
  firstName: string
  lastName: string
  onSignOut: () => void
}

type AdminPage = 'dashboard' | 'classes' | 'subjects'


export function AdminDashboardPage({
  firstName,
  lastName,
  onSignOut,
}: AdminDashboardPageProps) {
  const [currentPage, setCurrentPage] =
    useState<AdminPage>('dashboard')

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert('La déconnexion a échoué.')
      return
    }

    onSignOut()
  }

  if (currentPage === 'classes') {
    return (
      <ClassesPage
        onBack={() => setCurrentPage('dashboard')}
      />
    )
  }

if (currentPage === 'subjects') {
  return (
    <SubjectsPage
      onBack={() => setCurrentPage('dashboard')}
    />
  )
}

  const modules = [
    {
      title: 'Utilisateurs',
      description:
        'Créer, modifier, suspendre et gérer les comptes.',
      action: undefined,
    },
    {
      title: 'Rôles et permissions',
      description:
        'Attribuer les espaces et contrôler les accès.',
      action: undefined,
    },
    {
      title: 'Classes',
      description:
        'Gérer les classes, les élèves et les affectations.',
      action: () => setCurrentPage('classes'),
    },
    {
  title: 'Matières',
  description:
    'Créer et gérer les matières enseignées.',
  action: () => setCurrentPage('subjects'),
},
{
 title: 'Emplois du temps',
      description:
        'Organiser les cours, salles et professeurs.',
      action: undefined,
    },
    {
      title: 'Vie scolaire',
      description:
        'Consulter les appels, absences et retards.',
      action: undefined,
    },
    {
      title: 'Notation professorale',
      description:
        'Suivre les appels et les cahiers de texte.',
      action: undefined,
    },
    {
      title: 'Entreprises et stages',
      description:
        'Gérer les partenaires, stages et conventions.',
      action: undefined,
    },
    {
      title: 'Paramètres',
      description:
        'Configurer les modules et l’établissement.',
      action: undefined,
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

              <button
                type="button"
                disabled={!module.action}
                onClick={module.action}
              >
                {module.action
                  ? 'Ouvrir'
                  : 'Bientôt disponible'}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

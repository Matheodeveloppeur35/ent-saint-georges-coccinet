import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ClassesPage } from './ClassesPage'
import { SubjectsPage } from './SubjectsPage'
import { StudentsPage } from './StudentsPage'
import { TeachersPage } from './TeachersPage'
import { ClassSubjectsPage } from './ClassSubjectsPage'
import { TimetablesPage } from './TimetablesPage'
import LessonsPage from './LessonsPage'
import './AdminPages.css'

type AdminDashboardPageProps = {
  firstName: string
  lastName: string
  onSignOut: () => void
}

type AdminPage =
  | 'dashboard'
  | 'classes'
  | 'subjects'
  | 'students'
  | 'teachers'
  | 'class_subjects'
  | 'timetables'
  | 'lessons'

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

  if (currentPage === 'students') {
    return (
      <StudentsPage
        onBack={() => setCurrentPage('dashboard')}
      />
    )
  }

  if (currentPage === 'teachers') {
    return (
      <TeachersPage
        onBack={() => setCurrentPage('dashboard')}
      />
    )
  }

  if (currentPage === 'class_subjects') {
    return (
      <ClassSubjectsPage
        onBack={() => setCurrentPage('dashboard')}
      />
    )
  }

  if (currentPage === 'timetables') {
    return (
      <TimetablesPage
        onBack={() => setCurrentPage('dashboard')}
      />
    )
  }

  if (currentPage === 'lessons') {
    return (
      <LessonsPage
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
      title: 'Élèves',
      description:
        'Créer et gérer les dossiers scolaires des élèves.',
      action: () => setCurrentPage('students'),
    },
    {
      title: 'Professeurs',
      description:
        'Créer et gérer les profils enseignants.',
      action: () => setCurrentPage('teachers'),
    },
    {
      title: 'Affectations',
      description:
        'Relier professeurs, classes et matières.',
      action: () => setCurrentPage('class_subjects'),
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
        'Créer les cours et ajouter les entrées '
        + '(salle, notes, annulations).',
      action: () => setCurrentPage('timetables'),
    },
    {
      title: 'Cahier de texte',
      description:
        'Créer des séances et enregistrer travaux / notes.',
      action: () => setCurrentPage('lessons'),
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
        "Configurer les modules et l'établissement.",
      action: undefined,
    },
  ]

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p>ENT Saint Georges Coccinet</p>

          <h1>
            Bonjour, {firstName} {lastName}
          </h1>

          <p>Espace Administrateur</p>
        </div>

        <button
          className="admin-button danger"
          type="button"
          onClick={handleSignOut}
        >
          Se déconnecter
        </button>
      </header>

      <div className="admin-page-content">
        <section className="admin-card">
          <h2>Tableau de bord</h2>

          <p>
            Gérez les principaux services de votre ENT.
          </p>

          <div className="admin-module-grid">
            {modules.map((module) => (
              <article
                className="admin-module-card"
                key={module.title}
              >
                <h3>{module.title}</h3>

                <p>{module.description}</p>

                <button
                  className={
                    module.action
                      ? 'admin-button primary'
                      : 'admin-button'
                  }
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
      </div>
    </main>
  )
}

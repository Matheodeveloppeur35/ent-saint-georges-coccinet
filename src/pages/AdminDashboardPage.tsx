import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ClassesPage } from './ClassesPage'
import { SubjectsPage } from './SubjectsPage'
import { StudentsPage } from './StudentsPage'
import { TeachersPage } from './TeachersPage'
import { ClassSubjectsPage } from './ClassSubjectsPage'
import { TimetablesPage } from './TimetablesPage'
import LessonsPage from './LessonsPage'
import { SchoolLifePage } from './SchoolLifePage'
import { AssessmentsPage } from './AssessmentsPage'
import { InternshipsPage } from './InternshipsPage'
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
  | 'school_life'
  | 'assessments'
  | 'internships'

type AdminModule = {
  title: string
  description: string
  action?: () => void
}

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

  function returnToDashboard() {
    setCurrentPage('dashboard')
  }

  if (currentPage === 'classes') {
    return <ClassesPage onBack={returnToDashboard} />
  }

  if (currentPage === 'subjects') {
    return <SubjectsPage onBack={returnToDashboard} />
  }

  if (currentPage === 'students') {
    return <StudentsPage onBack={returnToDashboard} />
  }

  if (currentPage === 'teachers') {
    return <TeachersPage onBack={returnToDashboard} />
  }

  if (currentPage === 'class_subjects') {
    return (
      <ClassSubjectsPage onBack={returnToDashboard} />
    )
  }

  if (currentPage === 'timetables') {
    return (
      <TimetablesPage onBack={returnToDashboard} />
    )
  }

  if (currentPage === 'lessons') {
    return <LessonsPage onBack={returnToDashboard} />
  }

  if (currentPage === 'school_life') {
    return (
      <SchoolLifePage onBack={returnToDashboard} />
    )
  }

  if (currentPage === 'assessments') {
    return (
      <AssessmentsPage onBack={returnToDashboard} />
    )
  }

  if (currentPage === 'internships') {
    return (
      <InternshipsPage onBack={returnToDashboard} />
    )
  }

  const modules: AdminModule[] = [
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
        'Relier les professeurs, les classes et les matières.',
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
        'Créer les cours et gérer les salles, les notes et les annulations.',
      action: () => setCurrentPage('timetables'),
    },
    {
      title: 'Cahier de texte',
      description:
        'Consulter les séances, les travaux réalisés et les devoirs.',
      action: () => setCurrentPage('lessons'),
    },
    {
      title: 'Vie scolaire',
      description:
        'Enregistrer les présences, absences, retards et justificatifs.',
      action: () => setCurrentPage('school_life'),
    },
    {
      title: 'Notation professorale',
      description:
        'Créer les évaluations, saisir les notes et publier les résultats.',
      action: () => setCurrentPage('assessments'),
    },
    {
      title: 'Entreprises et stages',
      description:
        'Gérer les partenaires, les stages et les conventions.',
      action: () => setCurrentPage('internships'),
    },
    {
      title: 'Paramètres',
      description:
        'Configurer les modules et l’établissement.',
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
          onClick={() => void handleSignOut()}
        >
          Se déconnecter
        </button>
      </header>

      <div className="admin-page-content">
        <section className="admin-card">
          <div className="admin-section-heading">
            <div>
              <h2>Tableau de bord</h2>

              <p>
                Gérez les principaux services de votre ENT.
              </p>
            </div>
          </div>

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

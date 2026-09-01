import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import './NurseDashboardPage.css'

type NurseDecision =
  | 'returned_to_class'
  | 'rest'
  | 'sent_home'
  | 'medical_referral'
  | 'emergency'

type SchoolClass = {
  id: string
  name: string
  level: string
  school_year: string
  is_active: boolean
}

type Student = {
  id: string
  student_number: string
  first_name: string
  last_name: string
  class_id: string | null
  birth_date: string | null
  is_active: boolean
}

type NurseVisit = {
  id: string
  student_id: string
  visit_date: string
  arrived_at: string
  left_at: string | null
  reason: string
  symptoms: string | null
  care_provided: string | null
  decision: NurseDecision
  confidential_notes: string | null
  parent_contacted: boolean
  parent_contacted_at: string | null
  emergency_services_contacted: boolean
  recorded_by: string
  created_at: string
  updated_at: string
}

type NurseVisitView = NurseVisit & {
  studentName: string
  studentNumber: string
  className: string
  classLevel: string
}

type NurseDashboardPageProps = {
  firstName: string
  lastName: string
  onSignOut: () => void
}

const DECISION_LABELS: Record<
  NurseDecision,
  string
> = {
  returned_to_class: 'Retour en cours',
  rest: 'Repos à l’infirmerie',
  sent_home: 'Départ accompagné',
  medical_referral: 'Orientation médicale',
  emergency: 'Urgence',
}

function getLocalDateValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset()

  return new Date(now.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10)
}

function getLocalTimeValue() {
  const now = new Date()

  return [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join(':')
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : '—'
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getDecisionClass(decision: NurseDecision) {
  if (decision === 'returned_to_class') {
    return 'nurse-badge green'
  }

  if (decision === 'rest') {
    return 'nurse-badge blue'
  }

  if (decision === 'emergency') {
    return 'nurse-badge red'
  }

  return 'nurse-badge orange'
}

export function NurseDashboardPage({
  firstName,
  lastName,
  onSignOut,
}: NurseDashboardPageProps) {
  const [classes, setClasses] =
    useState<SchoolClass[]>([])

  const [students, setStudents] =
    useState<Student[]>([])

  const [visits, setVisits] =
    useState<NurseVisit[]>([])

  const [studentId, setStudentId] = useState('')

  const [visitDate, setVisitDate] =
    useState(getLocalDateValue())

  const [arrivedAt, setArrivedAt] =
    useState(getLocalTimeValue())

  const [leftAt, setLeftAt] = useState('')
  const [reason, setReason] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [careProvided, setCareProvided] = useState('')

  const [decision, setDecision] =
    useState<NurseDecision>('returned_to_class')

  const [confidentialNotes, setConfidentialNotes] =
    useState('')

  const [parentContacted, setParentContacted] =
    useState(false)

  const [parentContactedAt, setParentContactedAt] =
    useState('')

  const [
    emergencyServicesContacted,
    setEmergencyServicesContacted,
  ] = useState(false)

  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] =
    useState('ALL')

  const [decisionFilter, setDecisionFilter] =
    useState<'ALL' | NurseDecision>('ALL')

  const [dateFilter, setDateFilter] =
    useState(getLocalDateValue())

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [isSigningOut, setIsSigningOut] =
    useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')

    const [
      classesResult,
      studentsResult,
      visitsResult,
    ] = await Promise.all([
      supabase
        .from('classes')
        .select(`
          id,
          name,
          level,
          school_year,
          is_active
        `)
        .eq('is_active', true)
        .order('name'),

      supabase
        .from('students')
        .select(`
          id,
          student_number,
          first_name,
          last_name,
          class_id,
          birth_date,
          is_active
        `)
        .eq('is_active', true)
        .order('last_name')
        .order('first_name'),

      supabase
        .from('nurse_visits')
        .select(`
          id,
          student_id,
          visit_date,
          arrived_at,
          left_at,
          reason,
          symptoms,
          care_provided,
          decision,
          confidential_notes,
          parent_contacted,
          parent_contacted_at,
          emergency_services_contacted,
          recorded_by,
          created_at,
          updated_at
        `)
        .order('visit_date', {
          ascending: false,
        })
        .order('arrived_at', {
          ascending: false,
        }),
    ])

    const errors = [
      classesResult.error,
      studentsResult.error,
      visitsResult.error,
    ].filter(Boolean)

    setClasses(
      (classesResult.data ?? []) as SchoolClass[],
    )

    setStudents(
      (studentsResult.data ?? []) as Student[],
    )

    setVisits(
      (visitsResult.data ?? []) as NurseVisit[],
    )

    if (errors.length > 0) {
      console.error(
        'Erreur de chargement de l’infirmerie :',
        errors,
      )

      setError(
        'Certaines données de l’infirmerie n’ont pas pu être chargées.',
      )
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const classMap = useMemo(
    () =>
      new Map(
        classes.map((schoolClass) => [
          schoolClass.id,
          schoolClass,
        ]),
      ),
    [classes],
  )

  const studentMap = useMemo(
    () =>
      new Map(
        students.map((student) => [
          student.id,
          student,
        ]),
      ),
    [students],
  )

  const visitViews = useMemo<NurseVisitView[]>(
    () =>
      visits.map((visit) => {
        const student = studentMap.get(
          visit.student_id,
        )

        const schoolClass = student?.class_id
          ? classMap.get(student.class_id)
          : null

        return {
          ...visit,
          studentName: student
            ? `${student.last_name} ${student.first_name}`
            : 'Élève introuvable',
          studentNumber:
            student?.student_number ?? '—',
          className:
            schoolClass?.name ?? 'Non affecté',
          classLevel: schoolClass?.level ?? '',
        }
      }),
    [visits, studentMap, classMap],
  )

  const filteredVisits = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase('fr')

    return visitViews.filter((visit) => {
      const searchableText = [
        visit.studentName,
        visit.studentNumber,
        visit.className,
        visit.classLevel,
        visit.reason,
        visit.symptoms ?? '',
        visit.care_provided ?? '',
        visit.confidential_notes ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase('fr')

      const matchesSearch =
        normalizedSearch === '' ||
        searchableText.includes(normalizedSearch)

      const matchesClass =
        classFilter === 'ALL' ||
        visit.className === classFilter

      const matchesDecision =
        decisionFilter === 'ALL' ||
        visit.decision === decisionFilter

      const matchesDate =
        dateFilter === '' ||
        visit.visit_date === dateFilter

      return (
        matchesSearch &&
        matchesClass &&
        matchesDecision &&
        matchesDate
      )
    })
  }, [
    visitViews,
    search,
    classFilter,
    decisionFilter,
    dateFilter,
  ])

  const today = getLocalDateValue()

  const todayVisits = visitViews.filter(
    (visit) => visit.visit_date === today,
  )

  const returnedToClassCount =
    todayVisits.filter(
      (visit) =>
        visit.decision === 'returned_to_class',
    ).length

  const restCount = todayVisits.filter(
    (visit) => visit.decision === 'rest',
  ).length

  const sentHomeCount = todayVisits.filter(
    (visit) => visit.decision === 'sent_home',
  ).length

  const emergencyCount = todayVisits.filter(
    (visit) => visit.decision === 'emergency',
  ).length

  function handleDecisionChange(
    nextDecision: NurseDecision,
  ) {
    setDecision(nextDecision)

    if (nextDecision !== 'emergency') {
      setEmergencyServicesContacted(false)
    }
  }

  function handleParentContactChange(
    isContacted: boolean,
  ) {
    setParentContacted(isContacted)

    if (isContacted) {
      setParentContactedAt(
        new Date().toISOString(),
      )
    } else {
      setParentContactedAt('')
    }
  }

  async function handleCreateVisit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!studentId) {
      setError('Choisissez un élève.')
      return
    }

    if (!visitDate || !arrivedAt) {
      setError(
        'La date et l’heure d’arrivée sont obligatoires.',
      )
      return
    }

    if (!reason.trim()) {
      setError(
        'Le motif de la consultation est obligatoire.',
      )
      return
    }

    if (leftAt && leftAt < arrivedAt) {
      setError(
        'L’heure de départ ne peut pas précéder l’heure d’arrivée.',
      )
      return
    }

    if (
      parentContacted &&
      !parentContactedAt
    ) {
      setError(
        'La date du contact avec le responsable est obligatoire.',
      )
      return
    }

    if (
      emergencyServicesContacted &&
      decision !== 'emergency'
    ) {
      setError(
        'La décision doit être « Urgence » lorsque les services d’urgence sont contactés.',
      )
      return
    }

    setIsSaving(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError(
        'La session de l’infirmerie est introuvable.',
      )
      setIsSaving(false)
      return
    }

    const { error: createError } = await supabase
      .from('nurse_visits')
      .insert({
        student_id: studentId,
        visit_date: visitDate,
        arrived_at: `${arrivedAt}:00`,
        left_at: leftAt
          ? `${leftAt}:00`
          : null,
        reason: reason.trim(),
        symptoms: symptoms.trim() || null,
        care_provided:
          careProvided.trim() || null,
        decision,
        confidential_notes:
          confidentialNotes.trim() || null,
        parent_contacted: parentContacted,
        parent_contacted_at: parentContacted
          ? parentContactedAt
          : null,
        emergency_services_contacted:
          emergencyServicesContacted,
        recorded_by: user.id,
      })

    if (createError) {
      console.error(
        'Erreur de création du passage :',
        createError,
      )

      setError(
        `Le passage n’a pas pu être enregistré : ${createError.message}`,
      )
    } else {
      setStudentId('')
      setVisitDate(getLocalDateValue())
      setArrivedAt(getLocalTimeValue())
      setLeftAt('')
      setReason('')
      setSymptoms('')
      setCareProvided('')
      setDecision('returned_to_class')
      setConfidentialNotes('')
      setParentContacted(false)
      setParentContactedAt('')
      setEmergencyServicesContacted(false)

      setSuccess(
        'Le passage à l’infirmerie a été enregistré.',
      )

      await loadData()
    }

    setIsSaving(false)
  }

  async function closeVisit(visit: NurseVisit) {
    setError('')
    setSuccess('')

    const now = getLocalTimeValue()

    if (now < visit.arrived_at.slice(0, 5)) {
      setError(
        'L’heure de départ ne peut pas précéder l’heure d’arrivée.',
      )
      return
    }

    const { error: updateError } = await supabase
      .from('nurse_visits')
      .update({
        left_at: `${now}:00`,
      })
      .eq('id', visit.id)

    if (updateError) {
      setError(
        `Le passage n’a pas pu être clôturé : ${updateError.message}`,
      )
      return
    }

    setSuccess(
      `Le passage a été clôturé à ${now}.`,
    )

    await loadData()
  }

  async function handleSignOut() {
    setIsSigningOut(true)

    const { error: signOutError } =
      await supabase.auth.signOut()

    if (signOutError) {
      setError('La déconnexion a échoué.')
      setIsSigningOut(false)
      return
    }

    onSignOut()
  }

  return (
    <main className="nurse-page">
      <header className="nurse-header">
        <div>
          <p className="nurse-kicker">
            ENT Saint Georges Coccinet
          </p>

          <h1>
            Bonjour, {firstName} {lastName}
          </h1>

          <p>
            Espace Infirmerie — Suivi des passages
          </p>
        </div>

        <div className="nurse-header-actions">
          <button
            className="nurse-button"
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            {isLoading
              ? 'Chargement…'
              : 'Actualiser'}
          </button>

          <button
            className="nurse-button danger"
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
          >
            {isSigningOut
              ? 'Déconnexion…'
              : 'Se déconnecter'}
          </button>
        </div>
      </header>

      <div className="nurse-content">
        {error && (
          <section
            className="nurse-message error"
            role="alert"
          >
            {error}
          </section>
        )}

        {success && (
          <section
            className="nurse-message success"
            role="status"
          >
            {success}
          </section>
        )}

        {isLoading && (
          <section className="nurse-card">
            <p className="nurse-empty">
              Chargement de l’infirmerie…
            </p>
          </section>
        )}

        {!isLoading && (
          <>
            <section className="nurse-stats">
              <article>
                <span>Passages aujourd’hui</span>
                <strong>{todayVisits.length}</strong>
              </article>

              <article>
                <span>Retours en cours</span>
                <strong>
                  {returnedToClassCount}
                </strong>
              </article>

              <article>
                <span>Repos</span>
                <strong>{restCount}</strong>
              </article>

              <article>
                <span>Départs accompagnés</span>
                <strong>{sentHomeCount}</strong>
              </article>

              <article>
                <span>Urgences</span>
                <strong>{emergencyCount}</strong>
              </article>
            </section>

            <section className="nurse-card">
              <h2>
                Enregistrer un passage à l’infirmerie
              </h2>

              <form
                className="nurse-form"
                onSubmit={handleCreateVisit}
              >
                <label htmlFor="nurse-student">
                  Élève

                  <select
                    id="nurse-student"
                    value={studentId}
                    onChange={(event) =>
                      setStudentId(
                        event.target.value,
                      )
                    }
                    required
                  >
                    <option value="">
                      Choisir un élève
                    </option>

                    {students.map((student) => {
                      const schoolClass =
                        student.class_id
                          ? classMap.get(
                              student.class_id,
                            )
                          : null

                      return (
                        <option
                          key={student.id}
                          value={student.id}
                        >
                          {student.last_name}{' '}
                          {student.first_name} —{' '}
                          {student.student_number}
                          {schoolClass
                            ? ` — ${schoolClass.name}`
                            : ''}
                        </option>
                      )
                    })}
                  </select>
                </label>

                <label htmlFor="nurse-date">
                  Date

                  <input
                    id="nurse-date"
                    type="date"
                    value={visitDate}
                    onChange={(event) =>
                      setVisitDate(
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label htmlFor="nurse-arrived-at">
                  Heure d’arrivée

                  <input
                    id="nurse-arrived-at"
                    type="time"
                    value={arrivedAt}
                    onChange={(event) =>
                      setArrivedAt(
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label htmlFor="nurse-left-at">
                  Heure de départ

                  <input
                    id="nurse-left-at"
                    type="time"
                    value={leftAt}
                    onChange={(event) =>
                      setLeftAt(event.target.value)
                    }
                    min={arrivedAt || undefined}
                  />
                </label>

                <label
                  className="full-width"
                  htmlFor="nurse-reason"
                >
                  Motif

                  <textarea
                    id="nurse-reason"
                    rows={3}
                    value={reason}
                    onChange={(event) =>
                      setReason(event.target.value)
                    }
                    placeholder="Motif principal de la consultation…"
                    required
                  />
                </label>

                <label
                  className="full-width"
                  htmlFor="nurse-symptoms"
                >
                  Symptômes observés

                  <textarea
                    id="nurse-symptoms"
                    rows={3}
                    value={symptoms}
                    onChange={(event) =>
                      setSymptoms(event.target.value)
                    }
                    placeholder="Décrivez les symptômes…"
                  />
                </label>

                <label
                  className="full-width"
                  htmlFor="nurse-care"
                >
                  Soins apportés

                  <textarea
                    id="nurse-care"
                    rows={3}
                    value={careProvided}
                    onChange={(event) =>
                      setCareProvided(
                        event.target.value,
                      )
                    }
                    placeholder="Décrivez les soins ou mesures prises…"
                  />
                </label>

                <label htmlFor="nurse-decision">
                  Décision

                  <select
                    id="nurse-decision"
                    value={decision}
                    onChange={(event) =>
                      handleDecisionChange(
                        event.target
                          .value as NurseDecision,
                      )
                    }
                    required
                  >
                    {Object.entries(
                      DECISION_LABELS,
                    ).map(([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="nurse-checkbox">
                  <input
                    type="checkbox"
                    checked={parentContacted}
                    onChange={(event) =>
                      handleParentContactChange(
                        event.target.checked,
                      )
                    }
                  />

                  <span>
                    Responsable légal contacté
                  </span>
                </label>

                {parentContacted && (
                  <label
                    className="full-width"
                    htmlFor="nurse-parent-contacted-at"
                  >
                    Date et heure du contact

                    <input
                      id="nurse-parent-contacted-at"
                      type="datetime-local"
                      value={
                        parentContactedAt
                          ? parentContactedAt.slice(
                              0,
                              16,
                            )
                          : ''
                      }
                      onChange={(event) =>
                        setParentContactedAt(
                          event.target.value
                            ? new Date(
                                event.target.value,
                              ).toISOString()
                            : '',
                        )
                      }
                      required
                    />
                  </label>
                )}

                {decision === 'emergency' && (
                  <label className="nurse-checkbox">
                    <input
                      type="checkbox"
                      checked={
                        emergencyServicesContacted
                      }
                      onChange={(event) =>
                        setEmergencyServicesContacted(
                          event.target.checked,
                        )
                      }
                    />

                    <span>
                      Services d’urgence contactés
                    </span>
                  </label>
                )}

                <label
                  className="full-width"
                  htmlFor="nurse-confidential-notes"
                >
                  Notes confidentielles

                  <textarea
                    id="nurse-confidential-notes"
                    rows={4}
                    value={confidentialNotes}
                    onChange={(event) =>
                      setConfidentialNotes(
                        event.target.value,
                      )
                    }
                    placeholder="Informations réservées aux personnels autorisés…"
                  />
                </label>

                <div className="full-width">
                  <button
                    className="nurse-button primary"
                    type="submit"
                    disabled={
                      isSaving ||
                      students.length === 0
                    }
                  >
                    {isSaving
                      ? 'Enregistrement…'
                      : 'Enregistrer le passage'}
                  </button>
                </div>
              </form>
            </section>

            <section className="nurse-card">
              <div className="nurse-section-heading">
                <div>
                  <h2>Historique des passages</h2>

                  <p>
                    {filteredVisits.length}{' '}
                    {filteredVisits.length > 1
                      ? 'passages affichés'
                      : 'passage affiché'}
                  </p>
                </div>

                <button
                  className="nurse-button"
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setClassFilter('ALL')
                    setDecisionFilter('ALL')
                    setDateFilter('')
                  }}
                >
                  Réinitialiser les filtres
                </button>
              </div>

              <div className="nurse-filters">
                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Rechercher un élève ou un motif…"
                />

                <select
                  value={classFilter}
                  onChange={(event) =>
                    setClassFilter(
                      event.target.value,
                    )
                  }
                >
                  <option value="ALL">
                    Toutes les classes
                  </option>

                  {classes.map((schoolClass) => (
                    <option
                      key={schoolClass.id}
                      value={schoolClass.name}
                    >
                      {schoolClass.name}
                    </option>
                  ))}
                </select>

                <select
                  value={decisionFilter}
                  onChange={(event) =>
                    setDecisionFilter(
                      event.target.value as
                        | 'ALL'
                        | NurseDecision,
                    )
                  }
                >
                  <option value="ALL">
                    Toutes les décisions
                  </option>

                  {Object.entries(
                    DECISION_LABELS,
                  ).map(([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(
                      event.target.value,
                    )
                  }
                />
              </div>

              {filteredVisits.length === 0 ? (
                <p className="nurse-empty">
                  Aucun passage ne correspond aux filtres.
                </p>
              ) : (
                <div className="nurse-table-wrap">
                  <table className="nurse-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Élève</th>
                        <th>Classe</th>
                        <th>Horaires</th>
                        <th>Motif et symptômes</th>
                        <th>Soins</th>
                        <th>Décision</th>
                        <th>Contacts</th>
                        <th>Notes confidentielles</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredVisits.map((visit) => (
                        <tr key={visit.id}>
                          <td>
                            <strong>
                              {formatDate(
                                visit.visit_date,
                              )}
                            </strong>
                          </td>

                          <td>
                            <div className="nurse-cell-stack">
                              <strong>
                                {visit.studentName}
                              </strong>

                              <small>
                                {visit.studentNumber}
                              </small>
                            </div>
                          </td>

                          <td>
                            <div className="nurse-cell-stack">
                              <strong>
                                {visit.className}
                              </strong>

                              {visit.classLevel && (
                                <small>
                                  {visit.classLevel}
                                </small>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="nurse-cell-stack">
                              <span>
                                Arrivée :{' '}
                                {formatTime(
                                  visit.arrived_at,
                                )}
                              </span>

                              <span>
                                Départ :{' '}
                                {formatTime(
                                  visit.left_at,
                                )}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="nurse-text-cell">
                              <strong>
                                {visit.reason}
                              </strong>

                              {visit.symptoms && (
                                <p>
                                  {visit.symptoms}
                                </p>
                              )}
                            </div>
                          </td>

                          <td>
                            {visit.care_provided || '—'}
                          </td>

                          <td>
                            <span
                              className={getDecisionClass(
                                visit.decision,
                              )}
                            >
                              {
                                DECISION_LABELS[
                                  visit.decision
                                ]
                              }
                            </span>
                          </td>

                          <td>
                            <div className="nurse-cell-stack">
                              <span>
                                Responsable :{' '}
                                {visit.parent_contacted
                                  ? 'Contacté'
                                  : 'Non contacté'}
                              </span>

                              {visit.parent_contacted && (
                                <small>
                                  {formatDateTime(
                                    visit.parent_contacted_at,
                                  )}
                                </small>
                              )}

                              {visit.emergency_services_contacted && (
                                <span className="nurse-badge red">
                                  Urgences contactées
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <span className="nurse-confidential">
                              {visit.confidential_notes ||
                                'Aucune note'}
                            </span>
                          </td>

                          <td>
                            {visit.left_at ? (
                              <span className="nurse-badge green">
                                Clôturé
                              </span>
                            ) : (
                              <button
                                className="nurse-button"
                                type="button"
                                onClick={() =>
                                  void closeVisit(visit)
                                }
                              >
                                Clôturer maintenant
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

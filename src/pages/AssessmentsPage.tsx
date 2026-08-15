import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import './AdminPages.css'

type ResultStatus =
  | 'graded'
  | 'absent'
  | 'excused'
  | 'not_submitted'

type SchoolClass = {
  id: string
  name: string
  school_year: string
}

type Teacher = {
  id: string
  first_name: string
  last_name: string
}

type Subject = {
  id: string
  name: string
  short_name: string
  color: string
}

type ClassSubject = {
  id: string
  teacher_id: string
  class_id: string
  subject_id: string
  academic_year: string
}

type Student = {
  id: string
  student_number: string
  first_name: string
  last_name: string
  class_id: string | null
  is_active: boolean
}

type Assessment = {
  id: string
  class_subject_id: string
  title: string
  description: string | null
  assessment_date: string
  maximum_score: number
  coefficient: number
  period: string
  is_published: boolean
  published_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

type AssessmentResult = {
  id: string
  assessment_id: string
  student_id: string
  score: number | null
  status: ResultStatus
  teacher_comment: string | null
  created_at: string
  updated_at: string
}

type AssessmentView = Assessment & {
  className: string
  classYear: string
  subjectName: string
  subjectShortName: string
  subjectColor: string
  teacherName: string
  resultCount: number
  average: number | null
}

type StudentResultDraft = {
  studentId: string
  status: ResultStatus
  score: string
  teacherComment: string
}

type AssessmentsPageProps = {
  onBack: () => void
}

const RESULT_STATUS_LABELS: Record<
  ResultStatus,
  string
> = {
  graded: 'Noté',
  absent: 'Absent',
  excused: 'Excusé',
  not_submitted: 'Non rendu',
}

function getLocalDateValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset()

  return new Date(now.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value)
}

export function AssessmentsPage({
  onBack,
}: AssessmentsPageProps) {
  const [assessments, setAssessments] = useState<
    Assessment[]
  >([])

  const [results, setResults] = useState<
    AssessmentResult[]
  >([])

  const [classSubjects, setClassSubjects] = useState<
    ClassSubject[]
  >([])

  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])

  const [classSubjectId, setClassSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const [assessmentDate, setAssessmentDate] = useState(
    getLocalDateValue(),
  )

  const [maximumScore, setMaximumScore] = useState('20')
  const [coefficient, setCoefficient] = useState('1')
  const [period, setPeriod] = useState('Trimestre 1')
  const [isPublished, setIsPublished] = useState(false)

  const [selectedAssessmentId, setSelectedAssessmentId] =
    useState('')

  const [resultDrafts, setResultDrafts] = useState<
    StudentResultDraft[]
  >([])

  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('ALL')
  const [subjectFilter, setSubjectFilter] =
    useState('ALL')

  const [periodFilter, setPeriodFilter] = useState('ALL')

  const [publicationFilter, setPublicationFilter] =
    useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL')

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isSavingResults, setIsSavingResults] =
    useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')

    const [
      assessmentsResult,
      resultsResult,
      classSubjectsResult,
      classesResult,
      teachersResult,
      subjectsResult,
      studentsResult,
    ] = await Promise.all([
      supabase
        .from('assessments')
        .select(`
          id,
          class_subject_id,
          title,
          description,
          assessment_date,
          maximum_score,
          coefficient,
          period,
          is_published,
          published_at,
          created_by,
          created_at,
          updated_at
        `)
        .order('assessment_date', {
          ascending: false,
        })
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('assessment_results')
        .select(`
          id,
          assessment_id,
          student_id,
          score,
          status,
          teacher_comment,
          created_at,
          updated_at
        `),

      supabase
        .from('class_subjects')
        .select(`
          id,
          teacher_id,
          class_id,
          subject_id,
          academic_year
        `)
        .order('academic_year', {
          ascending: false,
        }),

      supabase
        .from('classes')
        .select('id, name, school_year')
        .eq('is_active', true)
        .order('name'),

      supabase
        .from('teachers')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .order('last_name')
        .order('first_name'),

      supabase
        .from('subjects')
        .select('id, name, short_name, color')
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
          is_active
        `)
        .eq('is_active', true)
        .order('last_name')
        .order('first_name'),
    ])

    if (
      assessmentsResult.error ||
      resultsResult.error ||
      classSubjectsResult.error ||
      classesResult.error ||
      teachersResult.error ||
      subjectsResult.error ||
      studentsResult.error
    ) {
      console.error(
        'Erreur de chargement de la notation :',
        {
          assessments: assessmentsResult.error,
          results: resultsResult.error,
          classSubjects:
            classSubjectsResult.error,
          classes: classesResult.error,
          teachers: teachersResult.error,
          subjects: subjectsResult.error,
          students: studentsResult.error,
        },
      )

      setError(
        'Les données de la notation n’ont pas pu être chargées.',
      )
      setIsLoading(false)
      return
    }

    setAssessments(
      (assessmentsResult.data ?? []) as Assessment[],
    )

    setResults(
      (resultsResult.data ?? []) as AssessmentResult[],
    )

    setClassSubjects(
      (classSubjectsResult.data ?? []) as ClassSubject[],
    )

    setClasses(
      (classesResult.data ?? []) as SchoolClass[],
    )

    setTeachers(
      (teachersResult.data ?? []) as Teacher[],
    )

    setSubjects(
      (subjectsResult.data ?? []) as Subject[],
    )

    setStudents(
      (studentsResult.data ?? []) as Student[],
    )

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const classSubjectMap = useMemo(
    () =>
      new Map(
        classSubjects.map((item) => [item.id, item]),
      ),
    [classSubjects],
  )

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

  const teacherMap = useMemo(
    () =>
      new Map(
        teachers.map((teacher) => [
          teacher.id,
          teacher,
        ]),
      ),
    [teachers],
  )

  const subjectMap = useMemo(
    () =>
      new Map(
        subjects.map((subject) => [
          subject.id,
          subject,
        ]),
      ),
    [subjects],
  )

  const assessmentMap = useMemo(
    () =>
      new Map(
        assessments.map((assessment) => [
          assessment.id,
          assessment,
        ]),
      ),
    [assessments],
  )

  const resultMap = useMemo(
    () =>
      new Map(
        results.map((result) => [
          `${result.assessment_id}:${result.student_id}`,
          result,
        ]),
      ),
    [results],
  )

  function getClassSubjectLabel(
    selectedClassSubjectId: string,
  ) {
    const link = classSubjectMap.get(
      selectedClassSubjectId,
    )

    if (!link) {
      return 'Affectation introuvable'
    }

    const schoolClass = classMap.get(link.class_id)
    const teacher = teacherMap.get(link.teacher_id)
    const subject = subjectMap.get(link.subject_id)

    const classLabel = schoolClass
      ? `${schoolClass.name} — ${schoolClass.school_year}`
      : 'Classe inconnue'

    const teacherLabel = teacher
      ? `${teacher.last_name} ${teacher.first_name}`
      : 'Professeur inconnu'

    const subjectLabel = subject
      ? `${subject.name} (${subject.short_name})`
      : 'Matière inconnue'

    return `${classLabel} — ${subjectLabel} — ${teacherLabel}`
  }

  const assessmentViews = useMemo<AssessmentView[]>(
    () =>
      assessments.map((assessment) => {
        const link = classSubjectMap.get(
          assessment.class_subject_id,
        )

        const schoolClass = link
          ? classMap.get(link.class_id)
          : null

        const teacher = link
          ? teacherMap.get(link.teacher_id)
          : null

        const subject = link
          ? subjectMap.get(link.subject_id)
          : null

        const assessmentResults = results.filter(
          (result) =>
            result.assessment_id === assessment.id,
        )

        const gradedResults = assessmentResults.filter(
          (result) =>
            result.status === 'graded' &&
            result.score !== null,
        )

        const average =
          gradedResults.length > 0
            ? gradedResults.reduce(
                (sum, result) =>
                  sum + (result.score ?? 0),
                0,
              ) / gradedResults.length
            : null

        return {
          ...assessment,
          className:
            schoolClass?.name ?? 'Classe inconnue',
          classYear:
            schoolClass?.school_year ?? '',
          subjectName:
            subject?.name ?? 'Matière inconnue',
          subjectShortName:
            subject?.short_name ?? '',
          subjectColor:
            subject?.color ?? '#64748b',
          teacherName: teacher
            ? `${teacher.last_name} ${teacher.first_name}`
            : 'Professeur inconnu',
          resultCount: assessmentResults.length,
          average,
        }
      }),
    [
      assessments,
      results,
      classSubjectMap,
      classMap,
      teacherMap,
      subjectMap,
    ],
  )

  const filteredAssessments = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase('fr')

    return assessmentViews.filter((assessment) => {
      const searchableText = [
        assessment.title,
        assessment.description ?? '',
        assessment.className,
        assessment.classYear,
        assessment.subjectName,
        assessment.subjectShortName,
        assessment.teacherName,
        assessment.period,
      ]
        .join(' ')
        .toLocaleLowerCase('fr')

      const matchesSearch =
        normalizedSearch === '' ||
        searchableText.includes(normalizedSearch)

      const matchesClass =
        classFilter === 'ALL' ||
        assessment.className === classFilter

      const matchesSubject =
        subjectFilter === 'ALL' ||
        assessment.subjectName === subjectFilter

      const matchesPeriod =
        periodFilter === 'ALL' ||
        assessment.period === periodFilter

      const matchesPublication =
        publicationFilter === 'ALL' ||
        (publicationFilter === 'PUBLISHED' &&
          assessment.is_published) ||
        (publicationFilter === 'DRAFT' &&
          !assessment.is_published)

      return (
        matchesSearch &&
        matchesClass &&
        matchesSubject &&
        matchesPeriod &&
        matchesPublication
      )
    })
  }, [
    assessmentViews,
    search,
    classFilter,
    subjectFilter,
    periodFilter,
    publicationFilter,
  ])

  const periods = useMemo(
    () =>
      Array.from(
        new Set(
          assessmentViews.map(
            (assessment) => assessment.period,
          ),
        ),
      ).sort((a, b) => a.localeCompare(b, 'fr')),
    [assessmentViews],
  )

  const selectedAssessment =
    selectedAssessmentId
      ? assessmentMap.get(selectedAssessmentId) ?? null
      : null

  const selectedAssessmentView =
    selectedAssessmentId
      ? assessmentViews.find(
          (assessment) =>
            assessment.id === selectedAssessmentId,
        ) ?? null
      : null

  const selectedClassSubject = selectedAssessment
    ? classSubjectMap.get(
        selectedAssessment.class_subject_id,
      ) ?? null
    : null

  const selectedStudents = useMemo(() => {
    if (!selectedClassSubject) {
      return []
    }

    return students.filter(
      (student) =>
        student.class_id === selectedClassSubject.class_id,
    )
  }, [students, selectedClassSubject])

  useEffect(() => {
    if (!selectedAssessmentId) {
      setResultDrafts([])
      return
    }

    setResultDrafts(
      selectedStudents.map((student) => {
        const existingResult = resultMap.get(
          `${selectedAssessmentId}:${student.id}`,
        )

        return {
          studentId: student.id,
          status: existingResult?.status ?? 'graded',
          score:
            existingResult?.score !== null &&
            existingResult?.score !== undefined
              ? String(existingResult.score)
              : '',
          teacherComment:
            existingResult?.teacher_comment ?? '',
        }
      }),
    )
  }, [
    selectedAssessmentId,
    selectedStudents,
    resultMap,
  ])

  const publishedCount = assessmentViews.filter(
    (assessment) => assessment.is_published,
  ).length

  const draftCount =
    assessmentViews.length - publishedCount

  const gradedResultCount = results.filter(
    (result) => result.status === 'graded',
  ).length

  const globalAverage = useMemo(() => {
    const normalizedScores = results
      .filter(
        (result) =>
          result.status === 'graded' &&
          result.score !== null,
      )
      .map((result) => {
        const assessment = assessmentMap.get(
          result.assessment_id,
        )

        if (
          !assessment ||
          assessment.maximum_score <= 0
        ) {
          return null
        }

        return (
          ((result.score ?? 0) /
            assessment.maximum_score) *
          20
        )
      })
      .filter(
        (value): value is number => value !== null,
      )

    if (normalizedScores.length === 0) {
      return null
    }

    return (
      normalizedScores.reduce(
        (sum, score) => sum + score,
        0,
      ) / normalizedScores.length
    )
  }, [results, assessmentMap])

  async function handleCreateAssessment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const normalizedTitle = title.trim()
    const normalizedDescription = description.trim()
    const normalizedPeriod = period.trim()
    const parsedMaximumScore = Number(maximumScore)
    const parsedCoefficient = Number(coefficient)

    if (!classSubjectId) {
      setError(
        'L’affectation professeur, classe et matière est obligatoire.',
      )
      return
    }

    if (!normalizedTitle) {
      setError(
        'Le titre de l’évaluation est obligatoire.',
      )
      return
    }

    if (!assessmentDate) {
      setError(
        'La date de l’évaluation est obligatoire.',
      )
      return
    }

    if (
      !Number.isFinite(parsedMaximumScore) ||
      parsedMaximumScore <= 0
    ) {
      setError(
        'Le barème doit être supérieur à zéro.',
      )
      return
    }

    if (
      !Number.isFinite(parsedCoefficient) ||
      parsedCoefficient <= 0
    ) {
      setError(
        'Le coefficient doit être supérieur à zéro.',
      )
      return
    }

    if (!normalizedPeriod) {
      setError('La période est obligatoire.')
      return
    }

    setIsCreating(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError(
        'La session utilisateur est introuvable.',
      )
      setIsCreating(false)
      return
    }

    const { error: createError } = await supabase
      .from('assessments')
      .insert({
        class_subject_id: classSubjectId,
        title: normalizedTitle,
        description: normalizedDescription || null,
        assessment_date: assessmentDate,
        maximum_score: parsedMaximumScore,
        coefficient: parsedCoefficient,
        period: normalizedPeriod,
        is_published: isPublished,
        published_at: isPublished
          ? new Date().toISOString()
          : null,
        created_by: user.id,
      })

    if (createError) {
      console.error(
        'Erreur de création de l’évaluation :',
        createError,
      )

      setError(
        `L’évaluation n’a pas pu être créée : ${createError.message}`,
      )
    } else {
      setClassSubjectId('')
      setTitle('')
      setDescription('')
      setAssessmentDate(getLocalDateValue())
      setMaximumScore('20')
      setCoefficient('1')
      setPeriod('Trimestre 1')
      setIsPublished(false)

      setSuccess(
        'L’évaluation a été créée avec succès.',
      )

      await loadData()
    }

    setIsCreating(false)
  }

  function updateResultDraft(
    studentId: string,
    changes: Partial<StudentResultDraft>,
  ) {
    setResultDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.studentId === studentId
          ? {
              ...draft,
              ...changes,
            }
          : draft,
      ),
    )
  }

  function handleResultStatusChange(
    studentId: string,
    nextStatus: ResultStatus,
  ) {
    updateResultDraft(studentId, {
      status: nextStatus,
      score:
        nextStatus === 'graded'
          ? resultDrafts.find(
              (draft) =>
                draft.studentId === studentId,
            )?.score ?? ''
          : '',
    })
  }

  async function handleSaveResults(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!selectedAssessment) {
      setError('Choisissez une évaluation.')
      return
    }

    if (resultDrafts.length === 0) {
      setError(
        'Aucun élève n’est disponible pour cette évaluation.',
      )
      return
    }

    const payloads = []

    for (const draft of resultDrafts) {
      const parsedScore =
        draft.status === 'graded'
          ? Number(draft.score)
          : null

      if (
        draft.status === 'graded' &&
        (draft.score.trim() === '' ||
          !Number.isFinite(parsedScore))
      ) {
        const student = students.find(
          (item) => item.id === draft.studentId,
        )

        setError(
          `Saisissez une note valide pour ${
            student
              ? `${student.last_name} ${student.first_name}`
              : 'chaque élève'
          }.`,
        )
        return
      }

      if (
        parsedScore !== null &&
        (parsedScore < 0 ||
          parsedScore >
            selectedAssessment.maximum_score)
      ) {
        const student = students.find(
          (item) => item.id === draft.studentId,
        )

        setError(
          `La note de ${
            student
              ? `${student.last_name} ${student.first_name}`
              : 'l’élève'
          } doit être comprise entre 0 et ${formatNumber(
            selectedAssessment.maximum_score,
          )}.`,
        )
        return
      }

      payloads.push({
        assessment_id: selectedAssessment.id,
        student_id: draft.studentId,
        score: parsedScore,
        status: draft.status,
        teacher_comment:
          draft.teacherComment.trim() || null,
      })
    }

    setIsSavingResults(true)

    const { error: saveError } = await supabase
      .from('assessment_results')
      .upsert(payloads, {
        onConflict: 'assessment_id,student_id',
      })

    if (saveError) {
      console.error(
        'Erreur d’enregistrement des notes :',
        saveError,
      )

      setError(
        `Les résultats n’ont pas pu être enregistrés : ${saveError.message}`,
      )
    } else {
      setSuccess(
        'Les résultats ont été enregistrés avec succès.',
      )

      await loadData()
    }

    setIsSavingResults(false)
  }

  async function togglePublication(
    assessment: AssessmentView,
  ) {
    setError('')
    setSuccess('')

    const nextPublished = !assessment.is_published

    const { error: updateError } = await supabase
      .from('assessments')
      .update({
        is_published: nextPublished,
        published_at: nextPublished
          ? new Date().toISOString()
          : null,
      })
      .eq('id', assessment.id)

    if (updateError) {
      setError(
        `Le statut de publication n’a pas pu être modifié : ${updateError.message}`,
      )
      return
    }

    setSuccess(
      nextPublished
        ? 'L’évaluation a été publiée.'
        : 'L’évaluation a été repassée en brouillon.',
    )

    await loadData()
  }

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p>Administration</p>

          <h1>Notation professorale</h1>

          <p>
            Créez les évaluations, saisissez les notes et
            suivez les résultats des élèves.
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
        <section className="admin-stats-grid admin-grade-stats">
          <article className="admin-stat-card">
            <span>Évaluations</span>
            <strong>{assessmentViews.length}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Publiées</span>
            <strong>{publishedCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Brouillons</span>
            <strong>{draftCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Notes saisies</span>
            <strong>{gradedResultCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Moyenne globale / 20</span>
            <strong>
              {globalAverage !== null
                ? formatNumber(globalAverage)
                : '—'}
            </strong>
          </article>
        </section>

        <section className="admin-card">
          <h2>Créer une évaluation</h2>

          {!isLoading &&
            classSubjects.length === 0 && (
              <p
                className="admin-message warning"
                role="status"
              >
                Créez d’abord une affectation associant un
                professeur, une classe et une matière.
              </p>
            )}

          <form
            className="admin-form"
            onSubmit={handleCreateAssessment}
          >
            <label
              className="full-width"
              htmlFor="assessment-class-subject"
            >
              Professeur / Classe / Matière

              <select
                id="assessment-class-subject"
                value={classSubjectId}
                onChange={(event) =>
                  setClassSubjectId(event.target.value)
                }
                disabled={
                  isLoading ||
                  classSubjects.length === 0
                }
                required
              >
                <option value="">
                  Choisir une affectation
                </option>

                {classSubjects.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {getClassSubjectLabel(item.id)}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="assessment-title">
              Titre

              <input
                id="assessment-title"
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Exemple : Contrôle sur les fractions"
                maxLength={150}
                required
              />
            </label>

            <label htmlFor="assessment-date">
              Date

              <input
                id="assessment-date"
                type="date"
                value={assessmentDate}
                onChange={(event) =>
                  setAssessmentDate(
                    event.target.value,
                  )
                }
                required
              />
            </label>

            <label htmlFor="assessment-maximum">
              Barème

              <input
                id="assessment-maximum"
                type="number"
                min="0.01"
                step="0.01"
                value={maximumScore}
                onChange={(event) =>
                  setMaximumScore(
                    event.target.value,
                  )
                }
                required
              />
            </label>

            <label htmlFor="assessment-coefficient">
              Coefficient

              <input
                id="assessment-coefficient"
                type="number"
                min="0.01"
                step="0.01"
                value={coefficient}
                onChange={(event) =>
                  setCoefficient(event.target.value)
                }
                required
              />
            </label>

            <label htmlFor="assessment-period">
              Période

              <select
                id="assessment-period"
                value={period}
                onChange={(event) =>
                  setPeriod(event.target.value)
                }
                required
              >
                <option value="Trimestre 1">
                  Trimestre 1
                </option>
                <option value="Trimestre 2">
                  Trimestre 2
                </option>
                <option value="Trimestre 3">
                  Trimestre 3
                </option>
                <option value="Semestre 1">
                  Semestre 1
                </option>
                <option value="Semestre 2">
                  Semestre 2
                </option>
                <option value="Année">
                  Année
                </option>
              </select>
            </label>

            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(event) =>
                  setIsPublished(event.target.checked)
                }
              />

              <span>Publier immédiatement</span>
            </label>

            <label
              className="full-width"
              htmlFor="assessment-description"
            >
              Description (optionnelle)

              <textarea
                id="assessment-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={3}
                placeholder="Précisez les compétences ou le contenu évalué…"
              />
            </label>

            <div className="full-width">
              <button
                className="admin-button primary"
                type="submit"
                disabled={
                  isCreating ||
                  isLoading ||
                  classSubjects.length === 0
                }
              >
                {isCreating
                  ? 'Création en cours…'
                  : 'Créer l’évaluation'}
              </button>
            </div>
          </form>

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
        </section>

        <section className="admin-card">
          <div className="admin-section-heading">
            <div>
              <h2>Évaluations enregistrées</h2>

              {!isLoading && (
                <p>
                  {filteredAssessments.length}{' '}
                  {filteredAssessments.length > 1
                    ? 'évaluations affichées'
                    : 'évaluation affichée'}
                </p>
              )}
            </div>

            <button
              className="admin-button"
              type="button"
              onClick={() => void loadData()}
              disabled={isLoading}
            >
              {isLoading
                ? 'Chargement…'
                : 'Actualiser'}
            </button>
          </div>

          <div className="admin-filter-grid admin-grade-filters">
            <input
              className="admin-input"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher une évaluation…"
              aria-label="Rechercher une évaluation"
            />

            <select
              className="admin-select"
              value={classFilter}
              onChange={(event) =>
                setClassFilter(event.target.value)
              }
              aria-label="Filtrer par classe"
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
              className="admin-select"
              value={subjectFilter}
              onChange={(event) =>
                setSubjectFilter(event.target.value)
              }
              aria-label="Filtrer par matière"
            >
              <option value="ALL">
                Toutes les matières
              </option>

              {subjects.map((subject) => (
                <option
                  key={subject.id}
                  value={subject.name}
                >
                  {subject.name}
                </option>
              ))}
            </select>

            <select
              className="admin-select"
              value={periodFilter}
              onChange={(event) =>
                setPeriodFilter(event.target.value)
              }
              aria-label="Filtrer par période"
            >
              <option value="ALL">
                Toutes les périodes
              </option>

              {periods.map((periodValue) => (
                <option
                  key={periodValue}
                  value={periodValue}
                >
                  {periodValue}
                </option>
              ))}
            </select>

            <select
              className="admin-select"
              value={publicationFilter}
              onChange={(event) =>
                setPublicationFilter(
                  event.target.value as
                    | 'ALL'
                    | 'PUBLISHED'
                    | 'DRAFT',
                )
              }
              aria-label="Filtrer par publication"
            >
              <option value="ALL">
                Tous les statuts
              </option>
              <option value="PUBLISHED">
                Publiées
              </option>
              <option value="DRAFT">
                Brouillons
              </option>
            </select>
          </div>

          {isLoading && (
            <p className="admin-empty">
              Chargement des évaluations…
            </p>
          )}

          {!isLoading &&
            assessmentViews.length === 0 && (
              <p className="admin-empty">
                Aucune évaluation n’est enregistrée.
              </p>
            )}

          {!isLoading &&
            assessmentViews.length > 0 &&
            filteredAssessments.length === 0 && (
              <p className="admin-empty">
                Aucune évaluation ne correspond aux filtres.
              </p>
            )}

          {!isLoading &&
            filteredAssessments.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table-common admin-assessment-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Évaluation</th>
                      <th>Classe</th>
                      <th>Matière</th>
                      <th>Professeur</th>
                      <th>Barème</th>
                      <th>Coefficient</th>
                      <th>Moyenne</th>
                      <th>Publication</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAssessments.map(
                      (assessment) => (
                        <tr key={assessment.id}>
                          <td>
                            <strong>
                              {formatDate(
                                assessment.assessment_date,
                              )}
                            </strong>
                          </td>

                          <td>
                            <div className="admin-cell-stack">
                              <strong>
                                {assessment.title}
                              </strong>

                              <small>
                                {assessment.period}
                              </small>
                            </div>
                          </td>

                          <td>
                            <div className="admin-cell-stack">
                              <strong>
                                {assessment.className}
                              </strong>

                              <small>
                                {assessment.classYear}
                              </small>
                            </div>
                          </td>

                          <td>
                            <span
                              className="admin-subject-label"
                              style={{
                                borderLeftColor:
                                  assessment.subjectColor,
                              }}
                            >
                              {assessment.subjectName}
                            </span>
                          </td>

                          <td>
                            {assessment.teacherName}
                          </td>

                          <td>
                            /{' '}
                            {formatNumber(
                              assessment.maximum_score,
                            )}
                          </td>

                          <td>
                            ×{' '}
                            {formatNumber(
                              assessment.coefficient,
                            )}
                          </td>

                          <td>
                            {assessment.average !== null ? (
                              <strong>
                                {formatNumber(
                                  assessment.average,
                                )}{' '}
                                /{' '}
                                {formatNumber(
                                  assessment.maximum_score,
                                )}
                              </strong>
                            ) : (
                              <span className="admin-muted">
                                Aucune note
                              </span>
                            )}
                          </td>

                          <td>
                            <span
                              className={
                                assessment.is_published
                                  ? 'admin-badge green'
                                  : 'admin-badge orange'
                              }
                            >
                              {assessment.is_published
                                ? 'Publiée'
                                : 'Brouillon'}
                            </span>
                          </td>

                          <td>
                            <div className="admin-actions">
                              <button
                                className="admin-button"
                                type="button"
                                onClick={() => {
                                  setSelectedAssessmentId(
                                    assessment.id,
                                  )
                                  setError('')
                                  setSuccess('')
                                }}
                              >
                                Saisir les notes
                              </button>

                              <button
                                className="admin-button"
                                type="button"
                                onClick={() =>
                                  void togglePublication(
                                    assessment,
                                  )
                                }
                              >
                                {assessment.is_published
                                  ? 'Dépublier'
                                  : 'Publier'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </section>

        <section className="admin-card">
          <h2>Saisie des résultats</h2>

          <label htmlFor="result-assessment">
            Évaluation

            <select
              id="result-assessment"
              className="admin-select"
              value={selectedAssessmentId}
              onChange={(event) => {
                setSelectedAssessmentId(
                  event.target.value,
                )
                setError('')
                setSuccess('')
              }}
              disabled={
                isLoading || assessments.length === 0
              }
            >
              <option value="">
                Choisir une évaluation
              </option>

              {assessmentViews.map((assessment) => (
                <option
                  key={assessment.id}
                  value={assessment.id}
                >
                  {formatDate(
                    assessment.assessment_date,
                  )}{' '}
                  — {assessment.className} —{' '}
                  {assessment.subjectName} —{' '}
                  {assessment.title}
                </option>
              ))}
            </select>
          </label>

          {selectedAssessmentView && (
            <div className="admin-selected-assessment">
              <div>
                <span>Évaluation</span>
                <strong>
                  {selectedAssessmentView.title}
                </strong>
              </div>

              <div>
                <span>Classe</span>
                <strong>
                  {selectedAssessmentView.className}
                </strong>
              </div>

              <div>
                <span>Barème</span>
                <strong>
                  /{' '}
                  {formatNumber(
                    selectedAssessmentView.maximum_score,
                  )}
                </strong>
              </div>

              <div>
                <span>Coefficient</span>
                <strong>
                  ×{' '}
                  {formatNumber(
                    selectedAssessmentView.coefficient,
                  )}
                </strong>
              </div>
            </div>
          )}

          {selectedAssessment &&
            selectedStudents.length === 0 && (
              <p className="admin-message warning">
                Aucun élève actif n’est affecté à la classe
                de cette évaluation.
              </p>
            )}

          {selectedAssessment &&
            selectedStudents.length > 0 && (
              <form onSubmit={handleSaveResults}>
                <div className="admin-table-wrapper">
                  <table className="admin-table-common admin-results-table">
                    <thead>
                      <tr>
                        <th>Élève</th>
                        <th>Statut</th>
                        <th>Note</th>
                        <th>Commentaire</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedStudents.map(
                        (student) => {
                          const draft =
                            resultDrafts.find(
                              (item) =>
                                item.studentId ===
                                student.id,
                            )

                          if (!draft) {
                            return null
                          }

                          return (
                            <tr key={student.id}>
                              <td>
                                <div className="admin-cell-stack">
                                  <strong>
                                    {student.last_name}{' '}
                                    {student.first_name}
                                  </strong>

                                  <small>
                                    {
                                      student.student_number
                                    }
                                  </small>
                                </div>
                              </td>

                              <td>
                                <select
                                  className="admin-select"
                                  value={draft.status}
                                  onChange={(event) =>
                                    handleResultStatusChange(
                                      student.id,
                                      event.target
                                        .value as ResultStatus,
                                    )
                                  }
                                >
                                  {Object.entries(
                                    RESULT_STATUS_LABELS,
                                  ).map(
                                    ([
                                      statusValue,
                                      statusLabel,
                                    ]) => (
                                      <option
                                        key={
                                          statusValue
                                        }
                                        value={
                                          statusValue
                                        }
                                      >
                                        {statusLabel}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </td>

                              <td>
                                {draft.status ===
                                'graded' ? (
                                  <div className="admin-score-field">
                                    <input
                                      className="admin-input"
                                      type="number"
                                      min="0"
                                      max={
                                        selectedAssessment.maximum_score
                                      }
                                      step="0.01"
                                      value={draft.score}
                                      onChange={(event) =>
                                        updateResultDraft(
                                          student.id,
                                          {
                                            score:
                                              event.target
                                                .value,
                                          },
                                        )
                                      }
                                      required
                                    />

                                    <span>
                                      /{' '}
                                      {formatNumber(
                                        selectedAssessment.maximum_score,
                                      )}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="admin-muted">
                                    Sans note
                                  </span>
                                )}
                              </td>

                              <td>
                                <input
                                  className="admin-input"
                                  type="text"
                                  value={
                                    draft.teacherComment
                                  }
                                  onChange={(event) =>
                                    updateResultDraft(
                                      student.id,
                                      {
                                        teacherComment:
                                          event.target
                                            .value,
                                      },
                                    )
                                  }
                                  placeholder="Commentaire optionnel"
                                  maxLength={500}
                                />
                              </td>
                            </tr>
                          )
                        },
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="admin-results-actions">
                  <button
                    className="admin-button primary"
                    type="submit"
                    disabled={isSavingResults}
                  >
                    {isSavingResults
                      ? 'Enregistrement…'
                      : 'Enregistrer tous les résultats'}
                  </button>
                </div>
              </form>
            )}

          {!selectedAssessment && (
            <p className="admin-empty">
              Choisissez une évaluation pour saisir les
              résultats des élèves.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

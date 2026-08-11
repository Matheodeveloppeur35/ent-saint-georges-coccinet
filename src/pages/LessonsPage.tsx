import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import "./LessonsPage.css";

type Relation<T> = T | T[] | null;

type Teacher = {
  first_name: string;
  last_name: string;
};

type SchoolClass = {
  name: string;
  level: string;
};

type Subject = {
  name: string;
  short_name: string;
  color: string;
};

type ClassSubject = {
  classes: Relation<SchoolClass>;
  subjects: Relation<Subject>;
  teachers: Relation<Teacher>;
};

type Timetable = {
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  room: string | null;
  academic_year: string;
  class_subjects: Relation<ClassSubject>;
};

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  timetables: Relation<Timetable>;
};

type LessonEntryRow = {
  id: string;
  lesson_id: string;
  work_text: string | null;
  note: string | null;
  homework_due_date: string | null;
  created_at: string;
  updated_at: string;
  lessons: Relation<Lesson>;
};

type LessonView = {
  id: string;
  title: string;
  description: string;
  workText: string;
  note: string;
  homeworkDueDate: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  className: string;
  classLevel: string;
  subjectName: string;
  subjectShortName: string;
  subjectColor: string;
  teacherName: string;
  dayOfWeek: number | null;
  startsAt: string;
  endsAt: string;
  room: string;
  academicYear: string;
};

const DAY_LABELS: Record<number, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  7: "Dimanche",
};

function firstRelation<T>(relation: Relation<T>): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatTime(value: string): string {
  return value ? value.slice(0, 5) : "—";
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function normalizeEntry(entry: LessonEntryRow): LessonView {
  const lesson = firstRelation(entry.lessons);
  const timetable = firstRelation(lesson?.timetables ?? null);
  const classSubject = firstRelation(timetable?.class_subjects ?? null);
  const schoolClass = firstRelation(classSubject?.classes ?? null);
  const subject = firstRelation(classSubject?.subjects ?? null);
  const teacher = firstRelation(classSubject?.teachers ?? null);

  return {
    id: entry.id,
    title: lesson?.title ?? "Cours sans titre",
    description: lesson?.description ?? "",
    workText: entry.work_text ?? "",
    note: entry.note ?? "",
    homeworkDueDate: entry.homework_due_date,
    isPublished: lesson?.is_published ?? false,
    publishedAt: lesson?.published_at ?? null,
    className: schoolClass?.name ?? "Classe inconnue",
    classLevel: schoolClass?.level ?? "",
    subjectName: subject?.name ?? "Matière inconnue",
    subjectShortName: subject?.short_name ?? "",
    subjectColor: subject?.color ?? "#64748b",
    teacherName: teacher
      ? `${teacher.first_name} ${teacher.last_name}`.trim()
      : "Enseignant inconnu",
    dayOfWeek: timetable?.day_of_week ?? null,
    startsAt: timetable?.starts_at ?? "",
    endsAt: timetable?.ends_at ?? "",
    room: timetable?.room ?? "—",
    academicYear: timetable?.academic_year ?? "",
  };
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<LessonView[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [publicationFilter, setPublicationFilter] = useState<
    "ALL" | "PUBLISHED" | "DRAFT"
  >("ALL");

  const loadLessons = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("lesson_entries")
      .select(`
        id,
        lesson_id,
        work_text,
        note,
        homework_due_date,
        created_at,
        updated_at,
        lessons!inner (
          id,
          title,
          description,
          is_published,
          published_at,
          created_at,
          updated_at,
          timetables!inner (
            day_of_week,
            starts_at,
            ends_at,
            room,
            academic_year,
            class_subjects!inner (
              classes!inner (
                name,
                level
              ),
              subjects!inner (
                name,
                short_name,
                color
              ),
              teachers!inner (
                first_name,
                last_name
              )
            )
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur de chargement du cahier de texte :", error);
      setLessons([]);
      setErrorMessage(
        `Impossible de charger le cahier de texte : ${error.message}`,
      );
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as LessonEntryRow[];
    setLessons(rows.map(normalizeEntry));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  const classes = useMemo(
    () =>
      Array.from(new Set(lessons.map((lesson) => lesson.className))).sort(
        (a, b) => a.localeCompare(b, "fr"),
      ),
    [lessons],
  );

  const filteredLessons = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("fr");

    return lessons.filter((lesson) => {
      const searchableText = [
        lesson.title,
        lesson.description,
        lesson.workText,
        lesson.note,
        lesson.className,
        lesson.classLevel,
        lesson.subjectName,
        lesson.subjectShortName,
        lesson.teacherName,
        lesson.room,
      ]
        .join(" ")
        .toLocaleLowerCase("fr");

      const matchesSearch =
        normalizedSearch === "" ||
        searchableText.includes(normalizedSearch);

      const matchesClass =
        classFilter === "ALL" || lesson.className === classFilter;

      const matchesPublication =
        publicationFilter === "ALL" ||
        (publicationFilter === "PUBLISHED" && lesson.isPublished) ||
        (publicationFilter === "DRAFT" && !lesson.isPublished);

      return matchesSearch && matchesClass && matchesPublication;
    });
  }, [lessons, search, classFilter, publicationFilter]);

  const publishedCount = lessons.filter(
    (lesson) => lesson.isPublished,
  ).length;

  const draftCount = lessons.length - publishedCount;

  const homeworkCount = lessons.filter(
    (lesson) => lesson.homeworkDueDate !== null,
  ).length;

  return (
    <main className="admin-lessons">
      <header className="admin-top">
        <div>
          <p className="kicker">Administration</p>
          <h1>Cahier de texte</h1>
          <p className="subtitle">
            Consultez les cours, les travaux réalisés et les devoirs.
          </p>
        </div>

        <button
          className="btn primary"
          type="button"
          onClick={() => void loadLessons()}
          disabled={loading}
        >
          {loading ? "Chargement…" : "Actualiser"}
        </button>
      </header>

      <section className="admin-stats" aria-label="Statistiques">
        <article className="stat">
          <span>Total des entrées</span>
          <strong>{lessons.length}</strong>
        </article>

        <article className="stat">
          <span>Publiées</span>
          <strong>{publishedCount}</strong>
        </article>

        <article className="stat">
          <span>Brouillons</span>
          <strong>{draftCount}</strong>
        </article>

        <article className="stat">
          <span>Avec devoir</span>
          <strong>{homeworkCount}</strong>
        </article>
      </section>

      <section className="admin-filters" aria-label="Filtres">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un cours, une classe ou un enseignant…"
          aria-label="Rechercher"
        />

        <select
          value={classFilter}
          onChange={(event) => setClassFilter(event.target.value)}
          aria-label="Filtrer par classe"
        >
          <option value="ALL">Toutes les classes</option>

          {classes.map((className) => (
            <option key={className} value={className}>
              {className}
            </option>
          ))}
        </select>

        <select
          value={publicationFilter}
          onChange={(event) =>
            setPublicationFilter(
              event.target.value as "ALL" | "PUBLISHED" | "DRAFT",
            )
          }
          aria-label="Filtrer par publication"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="PUBLISHED">Publiés</option>
          <option value="DRAFT">Brouillons</option>
        </select>
      </section>

      {errorMessage && (
        <section className="error-box" role="alert">
          <p>{errorMessage}</p>

          <button
            className="btn"
            type="button"
            onClick={() => void loadLessons()}
          >
            Réessayer
          </button>
        </section>
      )}

      {loading && !errorMessage && (
        <p className="subtitle">Chargement du cahier de texte…</p>
      )}

      {!loading && !errorMessage && (
        <section className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Jour et horaire</th>
                <th>Matière</th>
                <th>Classe</th>
                <th>Enseignant</th>
                <th>Cours et travail réalisé</th>
                <th>Devoir</th>
                <th>Statut</th>
              </tr>
            </thead>

            <tbody>
              {filteredLessons.map((lesson) => (
                <tr key={lesson.id}>
                  <td>
                    <strong>
                      {lesson.dayOfWeek
                        ? DAY_LABELS[lesson.dayOfWeek]
                        : "Jour inconnu"}
                    </strong>
                    <br />
                    <span>
                      {formatTime(lesson.startsAt)} –{" "}
                      {formatTime(lesson.endsAt)}
                    </span>
                    <br />
                    <small>Salle : {lesson.room}</small>
                  </td>

                  <td>
                    <span
                      className="subject-dot"
                      style={{ backgroundColor: lesson.subjectColor }}
                      aria-hidden="true"
                    />
                    <strong>{lesson.subjectName}</strong>
                  </td>

                  <td>
                    <strong>{lesson.className}</strong>
                    {lesson.classLevel && (
                      <>
                        <br />
                        <small>{lesson.classLevel}</small>
                      </>
                    )}
                  </td>

                  <td>{lesson.teacherName}</td>

                  <td>
                    <strong>{lesson.title}</strong>
                    {lesson.description && <p>{lesson.description}</p>}
                    {lesson.workText && (
                      <p>
                        <b>Travail :</b> {lesson.workText}
                      </p>
                    )}
                    {lesson.note && (
                      <p>
                        <b>Note :</b> {lesson.note}
                      </p>
                    )}
                  </td>

                  <td>{formatDate(lesson.homeworkDueDate)}</td>

                  <td>
                    <span
                      className={
                        lesson.isPublished
                          ? "status done"
                          : "status todo"
                      }
                    >
                      {lesson.isPublished ? "Publié" : "Brouillon"}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredLessons.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    {lessons.length === 0
                      ? "Aucune entrée n’est enregistrée dans le cahier de texte."
                      : "Aucune entrée ne correspond aux filtres sélectionnés."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

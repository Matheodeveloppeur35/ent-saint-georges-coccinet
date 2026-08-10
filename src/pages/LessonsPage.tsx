import { useMemo, useState } from "react";
import "./LessonsPage.css";

type LessonStatus = "A_FAIRE" | "EN_COURS" | "TERMINE";
type Lesson = {
  id: string;
  matiere: string;
  classe: string;
  enseignant: string;
  date: string; // ISO (YYYY-MM-DD)
  heure: string; // HH:mm
  duree: number; // minutes
  statut: LessonStatus;
  description: string;
};

const SAMPLE_LESSONS: Lesson[] = [
  {
    id: "L-101",
    matiere: "Mathématiques",
    classe: "CM1",
    enseignant: "Mme Dupont",
    date: "2026-08-11",
    heure: "08:30",
    duree: 45,
    statut: "A_FAIRE",
    description: "Révisions fractions et simplification."
  },
  {
    id: "L-102",
    matiere: "Français",
    classe: "CM2",
    enseignant: "M. Martin",
    date: "2026-08-11",
    heure: "10:00",
    duree: 30,
    statut: "EN_COURS",
    description: "Lecture suivie - dictée mensuelle."
  },
  {
    id: "L-103",
    matiere: "Histoire",
    classe: "CE1",
    enseignant: "Mme Lemoine",
    date: "2026-08-12",
    heure: "13:30",
    duree: 60,
    statut: "TERMINE",
    description: "Bilan chapitre 3 : la Révolution."
  }
];

const statusLabel: Record<LessonStatus, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  TERMINE: "Terminé"
};

const statusClass: Record<LessonStatus, string> = {
  A_FAIRE: "status todo",
  EN_COURS: "status progress",
  TERMINE: "status done"
};

const formatDateFR = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

export default function LessonsPage() {
  const [query, setQuery] = useState("");
  const [statutFilter, setStatutFilter] = useState<"TOUS" | LessonStatus>("TOUS");
  const [classeFilter, setClasseFilter] = useState("TOUTES");
  const [rows, setRows] = useState<Lesson[]>(SAMPLE_LESSONS);

  const classes = useMemo(
    () => ["TOUTES", ...Array.from(new Set(SAMPLE_LESSONS.map((l) => l.classe)))],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const textMatch =
        q.length === 0 ||
        r.matiere.toLowerCase().includes(q) ||
        r.enseignant.toLowerCase().includes(q) ||
        r.classe.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q);

      const statutMatch = statutFilter === "TOUS" ? true : r.statut === statutFilter;
      const classeMatch = classeFilter === "TOUTES" ? true : r.classe === classeFilter;
      return textMatch && statutMatch && classeMatch;
    });
  }, [rows, query, statutFilter, classeFilter]);

  const total = rows.length;
  const todo = rows.filter((r) => r.statut === "A_FAIRE").length;
  const encours = rows.filter((r) => r.statut === "EN_COURS").length;
  const done = rows.filter((r) => r.statut === "TERMINE").length;

  // 👉 Remplace par tes appels API réels
  const handleDelete = (id: string) => {
    const ok = window.confirm("Supprimer ce cours ?");
    if (!ok) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleStatus = (id: string, next: LessonStatus) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, statut: next } : r)));
  };

  return (
    <section className="admin-lessons">
      <header className="admin-top">
        <div>
          <p className="kicker">Administration</p>
          <h1>Cahier de texte — Gestion des cours</h1>
          <p className="subtitle">Vue d’ensemble complète pour valider et piloter les enregistrements.</p>
        </div>
        <button className="btn primary">+ Nouveau cours</button>
      </header>

      <div className="admin-stats">
        <article className="stat"><span>Total</span><strong>{total}</strong></article>
        <article className="stat"><span>À faire</span><strong>{todo}</strong></article>
        <article className="stat"><span>En cours</span><strong>{encours}</strong></article>
        <article className="stat"><span>Terminés</span><strong>{done}</strong></article>
      </div>

      <div className="admin-filters">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (matière, enseignant, classe, description)"
        />
        <select value={classeFilter} onChange={(e) => setClasseFilter(e.target.value)}>
          {classes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value as "TOUS" | LessonStatus)}>
          <option value="TOUS">Tous statuts</option>
          <option value="A_FAIRE">À faire</option>
          <option value="EN_COURS">En cours</option>
          <option value="TERMINE">Terminé</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Heure</th>
              <th>Matière</th>
              <th>Classe</th>
              <th>Enseignant</th>
              <th>Durée</th>
              <th>Statut</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lesson) => (
              <tr key={lesson.id}>
                <td>{formatDateFR(lesson.date)}</td>
                <td>{lesson.heure}</td>
                <td>{lesson.matiere}</td>
                <td>{lesson.classe}</td>
                <td>{lesson.enseignant}</td>
                <td>{lesson.duree} min</td>
                <td>
                  <span className={statusClass[lesson.statut]}>{statusLabel[lesson.statut]}</span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="btn tiny">Voir</button>
                    <button className="btn tiny">Modifier</button>
                    <button className="btn tiny">Rapport</button>
                    <button className="btn tiny danger" onClick={() => handleDelete(lesson.id)}>
                      Supprimer
                    </button>
                    <select
                      aria-label="Changer le statut"
                      value={lesson.statut}
                      onChange={(e) =>
                        handleStatus(lesson.id, e.target.value as LessonStatus)
                      }
                    >
                      <option value="A_FAIRE">À faire</option>
                      <option value="EN_COURS">En cours</option>
                      <option value="TERMINE">Terminé</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">Aucun cours trouvé.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

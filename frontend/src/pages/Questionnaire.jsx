import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { submitQuestionnaire, ApiError } from "../api";
import ScoreGauge from "../components/ScoreGauge";

const FACTEURS_BINAIRES = [
  { key: "absenteisme", label: "Absentéisme", description: "Niveau d'absentéisme au cours de la période évaluée." },
  { key: "remuneration", label: "Rémunération", description: "Niveau de rémunération perçu par rapport au marché." },
];

const FACTEURS_LIKERT = [
  { key: "qualite", label: "Qualité", description: "Qualité du travail produit." },
  { key: "comportement", label: "Comportement", description: "Comportement professionnel au quotidien." },
  { key: "acces_info", label: "Accès à l'information", description: "Facilité d'accès aux informations nécessaires au travail." },
  { key: "reactivite", label: "Réactivité", description: "Capacité à réagir rapidement aux demandes et imprévus." },
  { key: "formation", label: "Formation", description: "Niveau et pertinence de la formation reçue." },
  { key: "competence", label: "Compétence", description: "Maîtrise des compétences requises pour le poste." },
  { key: "motivation", label: "Motivation", description: "Niveau de motivation au travail." },
  { key: "besoins", label: "Besoins psychologiques", description: "Satisfaction des besoins psychologiques au travail." },
  { key: "soutien", label: "Soutien social", description: "Soutien perçu de la part des collègues et de la hiérarchie." },
];

const LIKERT_OPTIONS = [
  { value: 1, label: "Pas du tout d'accord" },
  { value: 2, label: "Plutôt pas d'accord" },
  { value: 3, label: "Plutôt d'accord" },
  { value: 4, label: "Tout à fait d'accord" },
];

const BINAIRE_OPTIONS = [
  { value: 0, label: "Faible" },
  { value: 1, label: "Élevé" },
];

const initialForm = {
  absenteisme: null,
  remuneration: null,
  qualite: null,
  comportement: null,
  acces_info: null,
  reactivite: null,
  formation: null,
  competence: null,
  motivation: null,
  besoins: null,
  soutien: null,
};

function FactorRow({ factor, value, options, onChange }) {
  return (
    <div className="border-b border-[var(--color-canvas-line)] py-5 last:border-0">
      <p className="font-medium text-[var(--color-ink)]">{factor.label}</p>
      <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">{factor.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(factor.key, opt.value)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
              value === opt.value
                ? "border-[var(--color-signal-deep)] bg-[var(--color-ink)] text-white shadow-sm"
                : "border-[var(--color-canvas-line)] bg-white text-[var(--color-ink-soft)] hover:border-[var(--color-signal)] hover:bg-[var(--color-canvas)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Questionnaire() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function handleChange(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const allAnswered = Object.values(form).every((v) => v !== null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!allAnswered) {
      setError("Veuillez répondre à tous les facteurs avant de soumettre.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {};
      for (const k in form) payload[k] = Number(form[k]);
      const score = await submitQuestionnaire(token, payload);
      setResult(score);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de soumettre le questionnaire.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-[var(--color-canvas)] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="animate-pop-in rounded-xl border border-[var(--color-canvas-line)] bg-white p-8 text-center shadow-xs">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-signal-deep)]">
              Questionnaire soumis
            </p>
            <h1 className="mt-2 font-[var(--font-display)] text-2xl font-bold text-[var(--color-ink)]">
              Votre Productivité Indexée
            </h1>
            <ScoreGauge score={result.normalized_score} label={null} />
            <p className="mt-2 font-mono text-xs text-[var(--color-ink-soft)]">
              Modèle utilisé : {result.model_used}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/tableau-de-bord"
                className="rounded-lg bg-[var(--color-ink)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-ink)]/90"
              >
                Retour au tableau de bord
              </Link>
              <button
                onClick={() => { setResult(null); setForm(initialForm); }}
                className="rounded-lg border border-[var(--color-canvas-line)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-canvas)]"
              >
                Soumettre une nouvelle évaluation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
            NEXALYS — Questionnaire
          </p>
          <Link to="/tableau-de-bord" className="text-sm text-[var(--color-wire)] hover:underline">
            Retour au tableau de bord
          </Link>
        </div>

        <h1 className="mt-6 font-[var(--font-display)] text-3xl text-[var(--color-ink)]">
          Évaluation de productivité
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          Répondez aux 11 facteurs ci-dessous. Votre Productivité Indexée sera calculée immédiatement après soumission.
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <div className="rounded-xl border border-[var(--color-canvas-line)] bg-white px-6 shadow-xs">
            <div className="border-b border-[var(--color-canvas-line)] py-4">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
                Facteurs quantitatifs
              </h2>
            </div>
            {FACTEURS_BINAIRES.map((f) => (
              <FactorRow
                key={f.key}
                factor={f}
                value={form[f.key]}
                options={BINAIRE_OPTIONS}
                onChange={handleChange}
              />
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-[var(--color-canvas-line)] bg-white px-6 shadow-xs">
            <div className="border-b border-[var(--color-canvas-line)] py-4">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
                Facteurs qualitatifs (échelle 1-4)
              </h2>
            </div>
            {FACTEURS_LIKERT.map((f) => (
              <FactorRow
                key={f.key}
                factor={f}
                value={form[f.key]}
                options={LIKERT_OPTIONS}
                onChange={handleChange}
              />
            ))}
          </div>

          {error && (
            <p role="alert" className="mt-6 rounded-md bg-[color-mix(in_srgb,var(--color-danger)_10%,white)] px-3.5 py-2.5 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-md bg-[var(--color-ink)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-ink)]/90 disabled:opacity-60"
          >
            {submitting ? "Calcul en cours..." : "Soumettre et calculer mon score"}
          </button>
        </form>
      </div>
    </div>
  );
}

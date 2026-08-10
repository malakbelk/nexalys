import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { createEmploye, ApiError } from "../api";
import CredentialsDisplay from "../components/CredentialsDisplay";

const initialForm = { full_name: "", email: "", genre: "" };

export default function CreateEmploye() {
  const { token } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const employe = await createEmploye(token, { ...form, genre: form.genre || null });
      setCreated(employe);
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de creer le compte.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-6 py-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">NEXALYS — DRH</p>
          <Link to="/tableau-de-bord" className="text-sm text-[var(--color-wire)] hover:underline">
            Retour au tableau de bord
          </Link>
        </div>

        <h1 className="mt-6 font-[var(--font-display)] text-3xl text-[var(--color-ink)]">Nouvel employe</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          Le compte cree appartiendra automatiquement a votre entreprise, avec le role Employe.
          Un mot de passe temporaire sera genere automatiquement.
        </p>

        {created && (
          <div className="mt-6">
            <p className="text-sm text-[var(--color-band)]">
              Compte cree pour {created.full_name}.
            </p>
            <div className="mt-3">
              <CredentialsDisplay email={created.email} password={created.temporary_password} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="full_name" className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
              Nom complet
            </label>
            <input
              id="full_name"
              required
              value={form.full_name}
              onChange={update("full_name")}
              placeholder="Nadia Cherif"
              className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
              Email professionnel
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={update("email")}
              placeholder="n.cherif@ooredoo-demo.dz"
              className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
            />
          </div>

          <div>
            <label htmlFor="genre" className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
              Genre
            </label>
            <select
              id="genre"
              value={form.genre}
              onChange={update("genre")}
              className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
            >
              <option value="">Non precise</option>
              <option value="F">Femme</option>
              <option value="M">Homme</option>
            </select>
            <p className="mt-1 font-mono text-[11px] text-[var(--color-ink-soft)]">
              Utilise pour selectionner le modele de calcul le plus adapte.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-[color-mix(in_srgb,var(--color-danger)_10%,white)] px-3.5 py-2.5 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-[var(--color-ink)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-ink)]/90 disabled:opacity-60"
          >
            {submitting ? "Creation..." : "Creer le compte et generer le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}

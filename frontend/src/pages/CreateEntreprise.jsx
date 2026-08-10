import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { createEntreprise, createUtilisateur, ApiError } from "../api";
import CredentialsDisplay from "../components/CredentialsDisplay";

const ROLES_ASSIGNABLES = [
  { value: "dg", label: "Directeur General (DG)" },
  { value: "drh", label: "Directeur des Ressources Humaines (DRH)" },
  { value: "admin_entreprise", label: "Administrateur entreprise" },
  { value: "manager", label: "Manager" },
  { value: "employe", label: "Employe" },
];

export default function CreateEntreprise() {
  const { token } = useAuth();

  const [entrepriseForm, setEntrepriseForm] = useState({ nom: "", secteur: "telecom", taille: "grande", plan: "essai" });
  const [entreprise, setEntreprise] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [userForm, setUserForm] = useState({ full_name: "", email: "", role: "drh", genre: "" });
  const [userCreated, setUserCreated] = useState(null);
  const [userError, setUserError] = useState(null);
  const [userSubmitting, setUserSubmitting] = useState(false);

  async function handleEntrepriseSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await createEntreprise(token, entrepriseForm);
      setEntreprise(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de creer l'entreprise.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUserSubmit(e) {
    e.preventDefault();
    setUserError(null);
    setUserSubmitting(true);
    try {
      const created = await createUtilisateur(token, { ...userForm, genre: userForm.genre || null, entreprise_id: entreprise.id });
      setUserCreated(created);
    } catch (err) {
      setUserError(err instanceof ApiError ? err.message : "Impossible de creer le compte.");
    } finally {
      setUserSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-6 py-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">NEXALYS — Super Admin</p>
          <Link to="/tableau-de-bord" className="text-sm text-[var(--color-wire)] hover:underline">
            Retour au tableau de bord
          </Link>
        </div>

        <h1 className="mt-6 font-[var(--font-display)] text-3xl text-[var(--color-ink)]">Nouvelle entreprise cliente</h1>

        {!entreprise ? (
          <>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              Onboarding d'un nouveau client sur la plateforme.
            </p>
            <form onSubmit={handleEntrepriseSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="nom" className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
                  Nom de l'entreprise
                </label>
                <input
                  id="nom"
                  required
                  value={entrepriseForm.nom}
                  onChange={(e) => setEntrepriseForm((f) => ({ ...f, nom: e.target.value }))}
                  placeholder="Djezzy Telecom"
                  className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="taille" className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
                    Taille
                  </label>
                  <select
                    id="taille"
                    value={entrepriseForm.taille}
                    onChange={(e) => setEntrepriseForm((f) => ({ ...f, taille: e.target.value }))}
                    className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
                  >
                    <option value="grande">Grande (≥ 10 000 employes)</option>
                    <option value="petite">Petite (&lt; 10 000 employes)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="plan" className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
                    Plan d'abonnement
                  </label>
                  <select
                    id="plan"
                    value={entrepriseForm.plan}
                    onChange={(e) => setEntrepriseForm((f) => ({ ...f, plan: e.target.value }))}
                    className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
                  >
                    <option value="essai">Essai</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="secteur" className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
                  Secteur
                </label>
                <input
                  id="secteur"
                  value={entrepriseForm.secteur}
                  onChange={(e) => setEntrepriseForm((f) => ({ ...f, secteur: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
                />
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
                {submitting ? "Creation..." : "Creer l'entreprise"}
              </button>
            </form>
          </>
        ) : !userCreated ? (
          <>
            <p className="mt-2 text-sm text-[var(--color-band)]">
              Entreprise "{entreprise.nom}" creee. Creez maintenant son premier compte.
            </p>
            <form onSubmit={handleUserSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="full_name" className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
                  Nom complet
                </label>
                <input
                  id="full_name"
                  required
                  value={userForm.full_name}
                  onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
                  Role
                </label>
                <select
                  id="role"
                  value={userForm.role}
                  onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
                >
                  {ROLES_ASSIGNABLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <p className="font-mono text-[11px] text-[var(--color-ink-soft)]">
                Un mot de passe temporaire sera genere automatiquement et affiche a l'etape suivante.
              </p>

              {userError && (
                <p role="alert" className="rounded-md bg-[color-mix(in_srgb,var(--color-danger)_10%,white)] px-3.5 py-2.5 text-sm text-[var(--color-danger)]">
                  {userError}
                </p>
              )}

              <button
                type="submit"
                disabled={userSubmitting}
                className="w-full rounded-md bg-[var(--color-ink)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-ink)]/90 disabled:opacity-60"
              >
                {userSubmitting ? "Creation..." : "Creer ce compte et generer le mot de passe"}
              </button>
            </form>
          </>
        ) : (
          <div className="mt-8">
            <p className="text-[var(--color-band)]">
              Compte {userCreated.role} cree pour {userCreated.full_name}.
            </p>
            <div className="mt-4">
              <CredentialsDisplay email={userCreated.email} password={userCreated.temporary_password} />
            </div>
            <Link to="/tableau-de-bord" className="mt-6 inline-block font-medium text-[var(--color-wire)] hover:underline">
              Retour au tableau de bord
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

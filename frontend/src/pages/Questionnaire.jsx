import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import {
  getMyHistory, getEntrepriseDashboard, listEntreprises,
  listUtilisateurs, updateEmploye, deleteEmploye, createEmploye,
  resetEmployePassword, deleteScore, getScoreCapa, ApiError,
} from "../api";
import ScoreGauge from "../components/ScoreGauge";
import CredentialsDisplay from "../components/CredentialsDisplay";

const ROLE_LABELS = {
  super_admin: "Super Administrateur",
  admin_entreprise: "Administrateur Entreprise",
  dg: "Directeur Général",
  drh: "Directeur des Ressources Humaines",
  manager: "Manager",
  employe: "Employé",
};

const ENTREPRISE_VIEW_ROLES = ["admin_entreprise", "manager", "dg", "drh"];

function average(nums) {
  if (!nums || nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function getInitials(name) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* --- UI COMPONENTS WITH ANIMATIONS & BADGES --- */

function Avatar({ name, size = "md", status }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div className="relative inline-block flex-shrink-0">
      <div className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-[var(--color-ink)] font-mono font-semibold text-[var(--color-signal)] shadow-sm ring-2 ring-white/10 transition-transform hover:scale-105`}>
        {getInitials(name)}
      </div>
      {status !== undefined && (
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
            status ? "bg-[var(--color-band)]" : "bg-gray-400"
          }`}
        />
      )}
    </div>
  );
}

function Badge({ children, variant = "default", activeDot = false }) {
  const variants = {
    default: "bg-[var(--color-canvas)] text-[var(--color-ink-soft)] border-[var(--color-canvas-line)]",
    success: "bg-[color-mix(in_srgb,var(--color-band)_12%,white)] text-[var(--color-band)] border-[color-mix(in_srgb,var(--color-band)_25%,transparent)]",
    warning: "bg-[color-mix(in_srgb,var(--color-signal)_15%,white)] text-[var(--color-signal-deep)] border-[color-mix(in_srgb,var(--color-signal)_30%,transparent)]",
    danger: "bg-[color-mix(in_srgb,var(--color-danger)_12%,white)] text-[var(--color-danger)] border-[color-mix(in_srgb,var(--color-danger)_25%,transparent)]",
    info: "bg-[color-mix(in_srgb,var(--color-wire)_12%,white)] text-[var(--color-wire)] border-[color-mix(in_srgb,var(--color-wire)_25%,transparent)]",
    navy: "bg-[var(--color-ink)] text-white border-transparent",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-tight transition-all ${variants[variant]}`}>
      {activeDot && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-band)] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-band)]" />
        </span>
      )}
      {children}
    </span>
  );
}

function StatCard({ label, value, subtext, icon, delayClass = "" }) {
  return (
    <div className={`card-hover-effect animate-fade-in ${delayClass} relative overflow-hidden rounded-xl border border-[var(--color-canvas-line)] bg-white p-5 shadow-xs transition-all hover:border-[var(--color-signal)]`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--color-ink-soft)]">
            {label}
          </p>
          <p className="mt-2 font-[var(--font-display)] text-3xl font-bold tracking-tight text-[var(--color-ink)]">
            {value}
          </p>
          {subtext && <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{subtext}</p>}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-canvas)] text-[var(--color-ink)] transition-transform duration-300 group-hover:scale-110">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

function TopBar({ user, signOut }) {
  return (
    <header className="animate-fade-in flex flex-col gap-4 border-b border-[var(--color-canvas-line)] pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Avatar name={user.full_name} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-ink)]">
              Bonjour, {user.full_name.split(" ")[0]}
            </h1>
            <Badge variant="navy">{ROLE_LABELS[user.role] || user.role}</Badge>
          </div>
          <p className="font-mono text-xs text-[var(--color-ink-soft)]">Nexalys Ecosystem Platform</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {user.role === "super_admin" && (
          <Link
            to="/admin/nouvelle-entreprise"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-white shadow-xs transition-all hover:bg-[var(--color-ink)]/90 hover:shadow-md active:scale-95"
          >
            <svg className="h-4 w-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nouvelle entreprise
          </Link>
        )}
        {user.role !== "super_admin" && (
          <Link
            to="/questionnaire"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-canvas-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] shadow-xs transition-all hover:border-[var(--color-signal)] hover:bg-[var(--color-canvas)] active:scale-95"
          >
            <svg className="h-4 w-4 text-[var(--color-wire)] animate-pulse-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Remplir le questionnaire
          </Link>
        )}
        <button
          onClick={signOut}
          className="rounded-lg border border-[var(--color-canvas-line)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--color-ink-soft)] shadow-xs transition-all hover:bg-red-50 hover:text-[var(--color-danger)] active:scale-95"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}

/* --- VIEW 1: SUPER ADMIN DASHBOARD --- */

function SuperAdminDashboard({ user, token, signOut }) {
  const [entreprises, setEntreprises] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listEntreprises(token)
      .then(setEntreprises)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de charger les entreprises."));
  }, [token]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <TopBar user={user} signOut={signOut} />

        {error && (
          <div role="alert" className="animate-pop-in rounded-xl border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_10%,white)] p-4 text-sm font-medium text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {entreprises && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              delayClass="stagger-1"
              label="Entreprises Clientes"
              value={entreprises.length}
              subtext="Total enregistrées"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            />
            <StatCard
              delayClass="stagger-2"
              label="Abonnements Actifs"
              value={entreprises.filter((e) => e.statut_abonnement === "actif").length}
              subtext="Comptes opérationnels"
              icon={<svg className="h-5 w-5 text-[var(--color-band)] animate-pulse-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              delayClass="stagger-3"
              label="Plans Entreprise"
              value={entreprises.filter((e) => e.plan?.toLowerCase().includes("enterprise")).length}
              subtext="Clients VIP"
              icon={<svg className="h-5 w-5 text-[var(--color-signal-deep)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
            />
          </div>
        )}

        {entreprises && entreprises.length === 0 && (
          <div className="animate-pop-in rounded-xl border border-dashed border-[var(--color-canvas-line)] bg-white p-12 text-center shadow-xs">
            <p className="text-base font-medium text-[var(--color-ink-soft)]">Aucune entreprise cliente pour l'instant.</p>
            <Link to="/admin/nouvelle-entreprise" className="mt-4 inline-flex items-center gap-2 font-medium text-[var(--color-wire)] hover:underline">
              + Créer la première entreprise
            </Link>
          </div>
        )}

        {entreprises && entreprises.length > 0 && (
          <div className="animate-fade-in stagger-4 overflow-hidden rounded-xl border border-[var(--color-canvas-line)] bg-white shadow-xs">
            <div className="border-b border-[var(--color-canvas-line)] bg-[var(--color-canvas)]/50 px-6 py-4">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
                Portefeuille d'entreprises ({entreprises.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-canvas-line)] bg-[var(--color-canvas)]/30 font-mono text-xs text-[var(--color-ink-soft)]">
                    <th className="px-6 py-3.5 font-medium">Entreprise</th>
                    <th className="px-6 py-3.5 font-medium">Secteur</th>
                    <th className="px-6 py-3.5 font-medium">Taille</th>
                    <th className="px-6 py-3.5 font-medium">Plan</th>
                    <th className="px-6 py-3.5 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-canvas-line)]">
                  {entreprises.map((e) => (
                    <tr key={e.id} className="group transition-colors hover:bg-[var(--color-canvas)]/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={e.nom} size="sm" />
                          <Link to={`/admin/entreprises/${e.id}`} className="font-semibold text-[var(--color-ink)] hover:text-[var(--color-wire)] hover:underline">
                            {e.nom}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[var(--color-ink-soft)]">{e.secteur || "--"}</td>
                      <td className="px-6 py-4 font-mono text-xs">{e.taille || "--"} emp.</td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <Badge variant="info">{e.plan || "Standard"}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={e.statut_abonnement === "actif" ? "success" : "danger"} activeDot={e.statut_abonnement === "actif"}>
                          {e.statut_abonnement}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- VIEW 2: EMPLOYEE MANAGEMENT (DRH) --- */

function EmployeeManagement({ token }) {
  const [employes, setEmployes] = useState(null);
  const [error, setError] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: "", email: "", genre: "" });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [justCreated, setJustCreated] = useState(null);

  const [selectedEmploye, setSelectedEmploye] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [resetError, setResetError] = useState(null);

  function reload() {
    listUtilisateurs(token)
      .then((users) => setEmployes(users.filter((u) => u.role === "employe")))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de charger les employés."));
  }

  useEffect(reload, [token]);

  async function handleAdd(e) {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    try {
      const created = await createEmploye(token, { ...addForm, genre: addForm.genre || null });
      setJustCreated(created);
      setAddForm({ full_name: "", email: "", genre: "" });
      reload();
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Impossible de créer le compte.");
    } finally {
      setAdding(false);
    }
  }

  async function handleResetPassword() {
    setResetError(null);
    setResetting(true);
    try {
      const result = await resetEmployePassword(token, selectedEmploye.id);
      setResetResult(result);
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : "Impossible de réinitialiser le mot de passe.");
    } finally {
      setResetting(false);
    }
  }

  async function handleToggleActive(employe) {
    try {
      await updateEmploye(token, employe.id, { is_active: !employe.is_active });
      reload();
      if (selectedEmploye?.id === employe.id) setSelectedEmploye({ ...employe, is_active: !employe.is_active });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de modifier ce compte.");
    }
  }

  async function handleDelete(employe) {
    if (!window.confirm(`Supprimer le compte de ${employe.full_name} ? Cette action est irréversible.`)) return;
    try {
      await deleteEmploye(token, employe.id);
      if (selectedEmploye?.id === employe.id) setSelectedEmploye(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de supprimer ce compte.");
    }
  }

  if (!employes) return null;

  return (
    <div className="animate-fade-in mt-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
            Gestion des Effectifs
          </h2>
          <p className="text-sm font-medium text-[var(--color-ink)]">{employes.length} employé(s) enregistrés</p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setJustCreated(null); setSelectedEmploye(null); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-white shadow-xs transition-all hover:bg-[var(--color-ink)]/90 active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Ajouter un employé
        </button>
      </div>

      {showAddForm && (
        <div className="animate-pop-in rounded-xl border border-[var(--color-canvas-line)] bg-white p-6 shadow-md transition-all">
          {!justCreated ? (
            <form onSubmit={handleAdd} className="space-y-4">
              <h3 className="font-[var(--font-display)] text-lg font-bold text-[var(--color-ink)]">Nouveau compte employé</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">Nom complet</label>
                  <input
                    required
                    value={addForm.full_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, full_name: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-[var(--color-canvas-line)] bg-[var(--color-canvas)]/30 px-3.5 py-2 text-sm text-[var(--color-ink)] outline-none transition-all focus:border-[var(--color-signal-deep)] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">Adresse Email</label>
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-[var(--color-canvas-line)] bg-[var(--color-canvas)]/30 px-3.5 py-2 text-sm text-[var(--color-ink)] outline-none transition-all focus:border-[var(--color-signal-deep)] focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">Genre</label>
                <select
                  value={addForm.genre}
                  onChange={(e) => setAddForm((f) => ({ ...f, genre: e.target.value }))}
                  className="mt-1.5 w-full max-w-xs rounded-lg border border-[var(--color-canvas-line)] bg-[var(--color-canvas)]/30 px-3.5 py-2 text-sm text-[var(--color-ink)] outline-none transition-all focus:border-[var(--color-signal-deep)] focus:bg-white"
                >
                  <option value="">Non précisé</option>
                  <option value="F">Femme</option>
                  <option value="M">Homme</option>
                </select>
              </div>

              {addError && <p className="text-xs font-medium text-[var(--color-danger)]">{addError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-[var(--color-canvas-line)] px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="rounded-lg bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-ink)]/90"
                >
                  {adding ? "Création..." : "Créer le compte"}
                </button>
              </div>
            </form>
          ) : (
            <div className="animate-pop-in space-y-4">
              <Badge variant="success" activeDot>Compte créé avec succès</Badge>
              <CredentialsDisplay email={justCreated.email} password={justCreated.temporary_password} />
              <button onClick={() => setShowAddForm(false)} className="text-xs font-medium text-[var(--color-wire)] hover:underline">
                Fermer
              </button>
            </div>
          )}
        </div>
      )}

      {selectedEmploye && (
        <div className="animate-pop-in rounded-xl border border-[var(--color-canvas-line)] bg-white p-6 shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={selectedEmploye.full_name} status={selectedEmploye.is_active} />
              <div>
                <h3 className="font-bold text-[var(--color-ink)]">{selectedEmploye.full_name}</h3>
                <p className="font-mono text-xs text-[var(--color-ink-soft)]">{selectedEmploye.email}</p>
              </div>
            </div>
            <button onClick={() => setSelectedEmploye(null)} className="text-xs text-[var(--color-ink-soft)] hover:underline">Fermer</button>
          </div>

          <div className="mt-4 border-t border-[var(--color-canvas-line)] pt-4">
            {!resetResult ? (
              <button
                onClick={handleResetPassword}
                disabled={resetting}
                className="rounded-lg border border-[var(--color-canvas-line)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--color-ink)] shadow-xs transition-all hover:bg-[var(--color-canvas)] active:scale-95"
              >
                {resetting ? "Génération..." : "Réinitialiser le mot de passe"}
              </button>
            ) : (
              <CredentialsDisplay email={resetResult.email} password={resetResult.temporary_password} />
            )}
            {resetError && <p className="mt-2 text-xs text-[var(--color-danger)]">{resetError}</p>}
          </div>
        </div>
      )}

      {error && <div className="rounded-xl bg-[color-mix(in_srgb,var(--color-danger)_10%,white)] p-4 text-xs font-medium text-[var(--color-danger)]">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-[var(--color-canvas-line)] bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-canvas-line)] bg-[var(--color-canvas)]/30 font-mono text-xs text-[var(--color-ink-soft)]">
              <th className="px-6 py-3.5 font-medium">Collaborateur</th>
              <th className="px-6 py-3.5 font-medium">Statut</th>
              <th className="px-6 py-3.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-canvas-line)]">
            {employes.map((e) => (
              <tr key={e.id} className="transition-colors hover:bg-[var(--color-canvas)]/50">
                <td className="cursor-pointer px-6 py-4" onClick={() => { setSelectedEmploye(e); setShowAddForm(false); }}>
                  <div className="flex items-center gap-3">
                    <Avatar name={e.full_name} size="sm" status={e.is_active} />
                    <div>
                      <p className="font-medium text-[var(--color-ink)]">{e.full_name}</p>
                      <p className="font-mono text-xs text-[var(--color-ink-soft)]">{e.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleToggleActive(e)}>
                    <Badge variant={e.is_active ? "success" : "default"} activeDot={e.is_active}>
                      {e.is_active ? "Actif" : "Désactivé"}
                    </Badge>
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(e)} className="text-xs font-medium text-[var(--color-danger)] hover:underline">
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- MODALE PLAN CAPA (DRH / DG / Admin entreprise / Manager) --- */

function CapaModal({ score, data, loading, error, onClose }) {
  if (!score) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop-in w-full max-w-lg rounded-xl border border-[var(--color-canvas-line)] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-signal-deep)]">CAPA</p>
            <h2 className="mt-1 font-[var(--font-display)] text-xl font-bold text-[var(--color-ink)]">
              Plan d'actions correctives
            </h2>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              {score.employee_name || score.employee_email}
            </p>
          </div>
          <button onClick={onClose} className="text-sm text-[var(--color-ink-soft)] hover:underline">
            Fermer
          </button>
        </div>

        <div className="mt-5 max-h-[60vh] space-y-3 overflow-y-auto">
          {loading && (
            <p className="text-sm text-[var(--color-ink-soft)]">Chargement du plan CAPA...</p>
          )}

          {error && (
            <p role="alert" className="rounded-md bg-[color-mix(in_srgb,var(--color-danger)_10%,white)] px-3.5 py-2.5 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}

          {data && data.plan_capa.length === 0 && (
            <p className="rounded-md border border-dashed border-[var(--color-canvas-line)] p-4 text-sm text-[var(--color-ink-soft)]">
              Aucune action CAPA declenchee pour cette evaluation : tous les facteurs surveilles sont au-dessus du seuil.
            </p>
          )}

          {data && data.plan_capa.map((r) => (
            <div key={r.titre} className="rounded-md border border-[var(--color-canvas-line)] p-3">
              <p className="text-sm font-medium text-[var(--color-ink)]">{r.titre}</p>
              <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{r.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.facteurs_concernes.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-[color-mix(in_srgb,var(--color-signal)_15%,white)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--color-signal-deep)]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --- VIEW 3: SCORES DASHBOARD (Manager, DRH, Employé) --- */

function ScoresDashboard({ user, token, signOut }) {
  const [scores, setScores] = useState(null);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const isEntrepriseView = ENTREPRISE_VIEW_ROLES.includes(user.role);

  // Seuls l'Employe (ses propres entrees) et le DRH (celles de son
  // entreprise) peuvent supprimer une entree d'historique.
  const peutSupprimer = user.role === "employe" || user.role === "drh";

  // Plan CAPA -- reserve a la vue entreprise (DRH/DG/Admin entreprise/
  // Manager). Jamais accessible depuis la vue Employe.
  const [capaScore, setCapaScore] = useState(null);
  const [capaData, setCapaData] = useState(null);
  const [capaLoading, setCapaLoading] = useState(false);
  const [capaError, setCapaError] = useState(null);

  useEffect(() => {
    const fetcher = isEntrepriseView ? getEntrepriseDashboard : getMyHistory;
    fetcher(token)
      .then(setScores)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de charger le tableau de bord."));
  }, [token, isEntrepriseView]);

  async function handleDeleteScore(score) {
    const cible = score.employee_name ? ` de ${score.employee_name}` : "";
    if (!window.confirm(`Supprimer cette entree d'historique${cible} ? Cette action est irreversible.`)) return;
    setDeletingId(score.id);
    try {
      await deleteScore(token, score.id);
      setScores((prev) => prev.filter((s) => s.id !== score.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de supprimer cette entree.");
    } finally {
      setDeletingId(null);
    }
  }

  async function openCapa(score) {
    if (!isEntrepriseView) return;
    setCapaScore(score);
    setCapaData(null);
    setCapaError(null);
    setCapaLoading(true);
    try {
      const data = await getScoreCapa(token, score.id);
      setCapaData(data);
    } catch (err) {
      setCapaError(err instanceof ApiError ? err.message : "Impossible de charger le plan CAPA.");
    } finally {
      setCapaLoading(false);
    }
  }

  function closeCapa() {
    setCapaScore(null);
    setCapaData(null);
    setCapaError(null);
  }

  const avgScore = scores && scores.length > 0 ? average(scores.map((s) => s.normalized_score)) : 0;
  const latestScore = scores && scores.length > 0 ? scores[0].normalized_score : 0;

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <TopBar user={user} signOut={signOut} />

        {error && (
          <div role="alert" className="animate-pop-in rounded-xl border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_10%,white)] p-4 text-sm font-medium text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {scores && scores.length === 0 && (
          <div className="animate-pop-in rounded-xl border border-dashed border-[var(--color-canvas-line)] bg-white p-12 text-center shadow-xs">
            <p className="text-base font-medium text-[var(--color-ink-soft)]">
              {isEntrepriseView
                ? "Aucun questionnaire n'a encore été soumis dans votre entreprise."
                : "Vous n'avez pas encore rempli de questionnaire."}
            </p>
            <Link to="/questionnaire" className="mt-4 inline-flex items-center gap-2 font-medium text-[var(--color-wire)] hover:underline">
              Remplir le questionnaire maintenant
            </Link>
          </div>
        )}

        {scores && scores.length > 0 && (
          <>
            {/* KPI STATS CARDS WITH CASSCADING ANIMATION */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                delayClass="stagger-1"
                label={isEntrepriseView ? "Moyenne Entreprise" : "Dernier Score"}
                value={`${(isEntrepriseView ? avgScore : latestScore).toFixed(1)}%`}
                subtext="Indice global calibré"
                icon={<svg className="h-5 w-5 text-[var(--color-signal-deep)] animate-pulse-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
              />
              <StatCard
                delayClass="stagger-2"
                label={isEntrepriseView ? "Total Soumissions" : "Mes Évaluations"}
                value={scores.length}
                subtext="Formulaires traités"
                icon={<svg className="h-5 w-5 text-[var(--color-wire)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              />
              {isEntrepriseView ? (
                <StatCard
                  delayClass="stagger-3"
                  label="Employés Évalués"
                  value={new Set(scores.map((s) => s.employee_email)).size}
                  subtext="Participants uniques"
                  icon={<svg className="h-5 w-5 text-[var(--color-band)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
              ) : (
                <StatCard
                  delayClass="stagger-3"
                  label="Modèle Utilisé"
                  value={scores[0].model_used || "Standard"}
                  subtext="Algorithme actif"
                  icon={<svg className="h-5 w-5 text-[var(--color-ink-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>}
                />
              )}
            </div>

            {/* JAUGE DE SCORE ANIMEE */}
            <div className="animate-fade-in stagger-3 rounded-xl border border-[var(--color-canvas-line)] bg-white p-6 shadow-xs">
              <ScoreGauge
                score={isEntrepriseView ? avgScore : latestScore}
                label={isEntrepriseView ? "Niveau de performance global" : "Résultat de la dernière évaluation"}
              />
            </div>

            {/* HISTORIQUE DE SCORE */}
            <div className="animate-fade-in stagger-4 overflow-hidden rounded-xl border border-[var(--color-canvas-line)] bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-[var(--color-canvas-line)] bg-[var(--color-canvas)]/50 px-6 py-4">
                <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
                  Historique des Réponses
                </h2>
                {isEntrepriseView && (
                  <p className="font-mono text-[11px] text-[var(--color-ink-soft)]">
                    Cliquez sur un collaborateur pour voir son plan CAPA
                  </p>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-canvas-line)] bg-[var(--color-canvas)]/30 font-mono text-xs text-[var(--color-ink-soft)]">
                      {isEntrepriseView && <th className="px-6 py-3.5 font-medium">Collaborateur</th>}
                      <th className="px-6 py-3.5 font-medium">Modèle de calcul</th>
                      <th className="px-6 py-3.5 font-medium">Score</th>
                      <th className="px-6 py-3.5 font-medium">Date & Heure</th>
                      {peutSupprimer && <th className="px-6 py-3.5 font-medium text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-canvas-line)]">
                    {scores.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => openCapa(s)}
                        className={`transition-colors hover:bg-[var(--color-canvas)]/50 ${isEntrepriseView ? "cursor-pointer" : ""}`}
                      >
                        {isEntrepriseView && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={s.employee_name || s.employee_email} size="sm" />
                              <div>
                                <p className="font-semibold text-[var(--color-ink)]">{s.employee_name || "Nom non défini"}</p>
                                <p className="font-mono text-xs text-[var(--color-ink-soft)]">{s.employee_email}</p>
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <Badge variant="info">{s.model_used}</Badge>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-[var(--color-ink)]">
                          {s.normalized_score.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 text-xs text-[var(--color-ink-soft)]">{formatDate(s.computed_at)}</td>
                        {peutSupprimer && (
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteScore(s)}
                              disabled={deletingId === s.id}
                              className="text-xs font-medium text-[var(--color-danger)] hover:underline disabled:opacity-50"
                            >
                              {deletingId === s.id ? "Suppression..." : "Supprimer"}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* SECTION DRH SI COMPTE DRH */}
        {user.role === "drh" && <EmployeeManagement token={token} />}
      </div>

      <CapaModal
        score={capaScore}
        data={capaData}
        loading={capaLoading}
        error={capaError}
        onClose={closeCapa}
      />
    </div>
  );
}

export default function Dashboard() {
  const { user, token, signOut } = useAuth();

  if (!user) return null;

  return user.role === "super_admin"
    ? <SuperAdminDashboard user={user} token={token} signOut={signOut} />
    : <ScoresDashboard user={user} token={token} signOut={signOut} />;
}
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import {
  getEntreprise, deleteEntreprise, listUtilisateurs, updateUtilisateur,
  deleteUtilisateur, createUtilisateur, resetUtilisateurPassword, ApiError,
} from "../api";
import CredentialsDisplay from "../components/CredentialsDisplay";

const ROLE_LABELS = {
  super_admin: "Super Administrateur",
  admin_entreprise: "Administrateur entreprise",
  dg: "Directeur General",
  drh: "Directeur des Ressources Humaines",
  manager: "Manager",
  employe: "Employe",
};

const ROLES_ASSIGNABLES = Object.entries(ROLE_LABELS).filter(([v]) => v !== "super_admin");

const emptyNewUserForm = { full_name: "", email: "", role: "employe", genre: "" };

export default function EntrepriseDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [entreprise, setEntreprise] = useState(null);
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [deletingEntreprise, setDeletingEntreprise] = useState(false);

  // Ajout d'un compte
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState(emptyNewUserForm);
  const [addingUser, setAddingUser] = useState(false);
  const [addError, setAddError] = useState(null);
  const [justCreated, setJustCreated] = useState(null);

  // Detail d'un compte existant
  const [selectedUser, setSelectedUser] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [resetError, setResetError] = useState(null);

  function reload() {
    setError(null);
    Promise.all([getEntreprise(token, id), listUtilisateurs(token, id)])
      .then(([ent, u]) => {
        setEntreprise(ent);
        setUsers(u);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de charger l'entreprise."));
  }

  useEffect(reload, [token, id]);

  async function handleAddUser(e) {
    e.preventDefault();
    setAddError(null);
    setAddingUser(true);
    try {
      const created = await createUtilisateur(token, {
        ...newUserForm,
        genre: newUserForm.genre || null,
        entreprise_id: id,
      });
      setJustCreated(created);
      setNewUserForm(emptyNewUserForm);
      reload();
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Impossible de creer le compte.");
    } finally {
      setAddingUser(false);
    }
  }

  function openAddForm() {
    setShowAddForm(true);
    setJustCreated(null);
    setAddError(null);
    setSelectedUser(null);
  }

  function selectUser(user) {
    setSelectedUser(user);
    setResetResult(null);
    setResetError(null);
    setShowAddForm(false);
  }

  async function handleResetPassword() {
    setResetError(null);
    setResetting(true);
    try {
      const result = await resetUtilisateurPassword(token, selectedUser.id);
      setResetResult(result);
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : "Impossible de reinitialiser le mot de passe.");
    } finally {
      setResetting(false);
    }
  }

  async function handleToggleActive(user) {
    try {
      await updateUtilisateur(token, user.id, { is_active: !user.is_active });
      reload();
      if (selectedUser?.id === user.id) setSelectedUser({ ...user, is_active: !user.is_active });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de modifier ce compte.");
    }
  }

  async function handleRoleChange(user, newRole) {
    try {
      await updateUtilisateur(token, user.id, { role: newRole });
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de modifier le role.");
    }
  }

  async function handleDeleteUser(user) {
    if (!window.confirm(`Supprimer le compte de ${user.full_name} ? Cette action est irreversible.`)) return;
    try {
      await deleteUtilisateur(token, user.id);
      if (selectedUser?.id === user.id) setSelectedUser(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de supprimer ce compte.");
    }
  }

  async function handleDeleteEntreprise() {
    if (!window.confirm(
      `Supprimer definitivement "${entreprise.nom}" ? Tous ses comptes, questionnaires et scores seront perdus. Cette action est irreversible.`
    )) return;
    setDeletingEntreprise(true);
    try {
      await deleteEntreprise(token, id);
      navigate("/tableau-de-bord");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de supprimer l'entreprise.");
      setDeletingEntreprise(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">NEXALYS — Super Admin</p>
          <Link to="/tableau-de-bord" className="text-sm text-[var(--color-wire)] hover:underline">
            Retour au tableau de bord
          </Link>
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-md bg-[color-mix(in_srgb,var(--color-danger)_10%,white)] px-3.5 py-2.5 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}

        {entreprise && (
          <>
            <div className="mt-6 flex items-start justify-between">
              <div>
                <h1 className="font-[var(--font-display)] text-3xl text-[var(--color-ink)]">{entreprise.nom}</h1>
                <p className="mt-1 font-mono text-xs text-[var(--color-ink-soft)]">
                  {entreprise.secteur} · {entreprise.taille} · plan {entreprise.plan} ·{" "}
                  <span className={entreprise.statut_abonnement === "actif" ? "text-[var(--color-band)]" : "text-[var(--color-danger)]"}>
                    {entreprise.statut_abonnement}
                  </span>
                </p>
              </div>
              <button
                onClick={handleDeleteEntreprise}
                disabled={deletingEntreprise}
                className="rounded-md border border-[var(--color-danger)] px-3.5 py-2 text-sm font-medium text-[var(--color-danger)] transition hover:bg-[color-mix(in_srgb,var(--color-danger)_8%,white)] disabled:opacity-60"
              >
                {deletingEntreprise ? "Suppression..." : "Supprimer l'entreprise"}
              </button>
            </div>

            <div className="mt-10 flex items-center justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-wide text-[var(--color-ink-soft)]">
                Comptes ({users ? users.length : "..."})
              </h2>
              <button
                onClick={openAddForm}
                className="rounded-md bg-[var(--color-ink)] px-3.5 py-2 text-sm font-medium text-white hover:bg-[var(--color-ink)]/90"
              >
                Ajouter un compte
              </button>
            </div>

            {/* Formulaire d'ajout de compte */}
            {showAddForm && (
              <div className="mt-4 rounded-lg border border-[var(--color-canvas-line)] bg-white p-6">
                {!justCreated ? (
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
                          Nom complet
                        </label>
                        <input
                          required
                          value={newUserForm.full_name}
                          onChange={(e) => setNewUserForm((f) => ({ ...f, full_name: e.target.value }))}
                          className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
                          Email
                        </label>
                        <input
                          type="email"
                          required
                          value={newUserForm.email}
                          onChange={(e) => setNewUserForm((f) => ({ ...f, email: e.target.value }))}
                          className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
                          Role
                        </label>
                        <select
                          value={newUserForm.role}
                          onChange={(e) => setNewUserForm((f) => ({ ...f, role: e.target.value }))}
                          className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
                        >
                          {ROLES_ASSIGNABLES.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
                          Genre
                        </label>
                        <select
                          value={newUserForm.genre}
                          onChange={(e) => setNewUserForm((f) => ({ ...f, genre: e.target.value }))}
                          className="mt-2 w-full rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-signal-deep)]"
                        >
                          <option value="">Non precise</option>
                          <option value="F">Femme</option>
                          <option value="M">Homme</option>
                        </select>
                      </div>
                    </div>

                    {addError && (
                      <p role="alert" className="rounded-md bg-[color-mix(in_srgb,var(--color-danger)_10%,white)] px-3.5 py-2.5 text-sm text-[var(--color-danger)]">
                        {addError}
                      </p>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={addingUser}
                        className="rounded-md bg-[var(--color-ink)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-ink)]/90 disabled:opacity-60"
                      >
                        {addingUser ? "Creation..." : "Creer le compte"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="rounded-md border border-[var(--color-canvas-line)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-canvas)]"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <p className="text-sm text-[var(--color-band)]">
                      Compte {justCreated.role} cree pour {justCreated.full_name}.
                    </p>
                    <div className="mt-3">
                      <CredentialsDisplay email={justCreated.email} password={justCreated.temporary_password} />
                    </div>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="mt-4 text-sm font-medium text-[var(--color-wire)] hover:underline"
                    >
                      Fermer
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Detail d'un compte selectionne */}
            {selectedUser && (
              <div className="mt-4 rounded-lg border border-[var(--color-canvas-line)] bg-white p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-[var(--color-ink)]">{selectedUser.full_name}</p>
                    <p className="font-mono text-sm text-[var(--color-ink-soft)]">{selectedUser.email}</p>
                    <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                      {ROLE_LABELS[selectedUser.role]} · {selectedUser.is_active ? "Actif" : "Desactive"}
                    </p>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="text-sm text-[var(--color-ink-soft)] hover:underline">
                    Fermer
                  </button>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                  Le mot de passe original n'est jamais stocke en clair et ne peut donc pas
                  etre affiche a nouveau. Pour redonner l'acces a cette personne, generez-en un nouveau.
                </p>

                {!resetResult ? (
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="mt-3 rounded-md border border-[var(--color-canvas-line)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-canvas)] disabled:opacity-60"
                  >
                    {resetting ? "Generation..." : "Reinitialiser le mot de passe"}
                  </button>
                ) : (
                  <div className="mt-3">
                    <CredentialsDisplay email={resetResult.email} password={resetResult.temporary_password} />
                  </div>
                )}

                {resetError && (
                  <p role="alert" className="mt-3 rounded-md bg-[color-mix(in_srgb,var(--color-danger)_10%,white)] px-3.5 py-2.5 text-sm text-[var(--color-danger)]">
                    {resetError}
                  </p>
                )}
              </div>
            )}

            {users && users.length === 0 && (
              <p className="mt-4 text-sm text-[var(--color-ink-soft)]">Aucun compte pour cette entreprise.</p>
            )}

            {users && users.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-canvas-line)] bg-white">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-canvas-line)] bg-[var(--color-canvas)]">
                      <th className="px-4 py-3 font-medium text-[var(--color-ink-soft)]">Nom</th>
                      <th className="px-4 py-3 font-medium text-[var(--color-ink-soft)]">Role</th>
                      <th className="px-4 py-3 font-medium text-[var(--color-ink-soft)]">Statut</th>
                      <th className="px-4 py-3 font-medium text-[var(--color-ink-soft)]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-[var(--color-canvas-line)] last:border-0 hover:bg-[var(--color-canvas)]">
                        <td className="cursor-pointer px-4 py-3" onClick={() => selectUser(u)}>
                          <div className="font-medium text-[var(--color-wire)]">{u.full_name}</div>
                          <div className="text-xs text-[var(--color-ink-soft)]">{u.email}</div>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            className="rounded-md border border-[var(--color-canvas-line)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--color-signal-deep)]"
                          >
                            {ROLES_ASSIGNABLES.map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={u.is_active ? "text-[var(--color-band)] hover:underline" : "text-[var(--color-danger)] hover:underline"}
                          >
                            {u.is_active ? "Actif" : "Desactive"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="text-xs text-[var(--color-danger)] hover:underline"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

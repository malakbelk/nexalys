/*
  Client API -- fine couche au-dessus de fetch() pour parler au backend
  FastAPI. En developpement, Vite proxy /api/* vers http://127.0.0.1:8000
  (voir vite.config.js), donc on utilise des chemins relatifs ici et on
  n'a jamais a coder l'URL du backend en dur.
*/

   const BASE = "/backend";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function handle(response) {
  if (!response.ok) {
    let detail = "Une erreur est survenue. Veuillez reessayer.";
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") {
        // Erreur "normale" -- un message de detail en texte.
        detail = body.detail;
      } else if (Array.isArray(body?.detail)) {
        // Erreur de validation FastAPI (422) -- une liste d'objets
        // {loc, msg, type}. On les transforme en texte lisible, en
        // incluant le nom du champ concerne pour faciliter le debug.
        detail = body.detail
          .map((e) => {
            const field = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : null;
            return field ? `${field} : ${e.msg}` : e.msg || JSON.stringify(e);
          })
          .join(" · ");
      }
    } catch {
      /* reponse non-JSON, on garde le message par defaut */
    }
    throw new ApiError(detail, response.status);
  }
  return response.json();
}

export async function login({ email, password }) {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  return handle(res); // { access_token, token_type }
}

export async function getCurrentUser(token) {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

// Reserve au Super Admin -- cree une nouvelle entreprise cliente.
export async function createEntreprise(token, payload) {
  const res = await fetch(`${BASE}/entreprises/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return handle(res); // EntrepriseOut
}

// Reserve au Super Admin -- cree un compte de n'importe quel role.
// Le mot de passe est genere cote serveur, renvoye une seule fois
// dans le champ temporary_password de la reponse.
export async function createUtilisateur(token, payload) {
  const res = await fetch(`${BASE}/utilisateurs/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return handle(res); // UserCreatedOut
}

// Reserve au DRH -- cree un compte Employe dans sa propre entreprise.
// Meme principe : mot de passe genere, renvoye une seule fois.
export async function createEmploye(token, payload) {
  const res = await fetch(`${BASE}/utilisateurs/employes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return handle(res); // UserCreatedOut
}

export async function listEntreprises(token) {
  const res = await fetch(`${BASE}/entreprises/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res); // EntrepriseOut[]
}

export async function getEntreprise(token, entrepriseId) {
  const res = await fetch(`${BASE}/entreprises/${entrepriseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res); // EntrepriseOut
}

// Reserve au Super Admin -- irreversible, supprime l'entreprise et
// toutes ses donnees (utilisateurs, reponses, scores).
export async function deleteEntreprise(token, entrepriseId) {
  const res = await fetch(`${BASE}/entreprises/${entrepriseId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return handle(res);
}

// Liste les utilisateurs. Le Super Admin peut filtrer par entrepriseId ;
// les autres roles ne voient de toute facon que leur propre entreprise.
export async function listUtilisateurs(token, entrepriseId) {
  const url = entrepriseId
    ? `${BASE}/utilisateurs/?entreprise_id=${entrepriseId}`
    : `${BASE}/utilisateurs/`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return handle(res); // UserOut[]
}

// Reserve au Super Admin -- modifie n'importe quel champ d'un compte.
export async function updateUtilisateur(token, userId, payload) {
  const res = await fetch(`${BASE}/utilisateurs/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return handle(res); // UserOut
}

// Reserve au Super Admin -- supprime n'importe quel compte.
export async function deleteUtilisateur(token, userId) {
  const res = await fetch(`${BASE}/utilisateurs/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return handle(res);
}

// Reserve au Super Admin -- genere un nouveau mot de passe pour n'importe
// quel compte (l'ancien devient invalide immediatement).
export async function resetUtilisateurPassword(token, userId) {
  const res = await fetch(`${BASE}/utilisateurs/${userId}/reinitialiser-mot-de-passe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res); // UserCreatedOut
}

// Reserve au DRH -- active/desactive un employe de sa propre entreprise.
export async function updateEmploye(token, userId, payload) {
  const res = await fetch(`${BASE}/utilisateurs/employes/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return handle(res); // UserOut
}

// Reserve au DRH -- supprime un employe de sa propre entreprise.
export async function deleteEmploye(token, userId) {
  const res = await fetch(`${BASE}/utilisateurs/employes/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return handle(res);
}

// Reserve au DRH -- genere un nouveau mot de passe pour un employe de
// sa propre entreprise.
export async function resetEmployePassword(token, userId) {
  const res = await fetch(`${BASE}/utilisateurs/employes/${userId}/reinitialiser-mot-de-passe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res); // UserCreatedOut
}

export async function submitQuestionnaire(token, payload) {
  const res = await fetch(`${BASE}/questionnaires/soumettre`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return handle(res); // ProductivityScoreOut
}

export async function getMyHistory(token) {
  const res = await fetch(`${BASE}/questionnaires/mon-historique`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res); // ProductivityScoreOut[]
}

export async function getEntrepriseDashboard(token) {
  const res = await fetch(`${BASE}/questionnaires/tableau-de-bord-entreprise`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res); // ProductivityScoreOut[]
}

// Supprime une entree d'historique (reponse + score). Un Employe ne peut
// supprimer que les siennes ; un DRH peut supprimer celles de n'importe
// quel membre de sa propre entreprise.
export async function deleteScore(token, scoreId) {
  const res = await fetch(`${BASE}/questionnaires/${scoreId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return handle(res);
}

export { ApiError };

// Reserve au DRH/DG (et Admin entreprise / Manager) -- recalcule et
// renvoie le plan CAPA d'un employe de leur entreprise pour une entree
// d'historique donnee. Jamais accessible a l'employe lui-meme.
export async function getScoreCapa(token, scoreId) {
  const res = await fetch(`${BASE}/questionnaires/${scoreId}/capa`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res); // CapaOut
}

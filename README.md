# Nexalys -- MVP Phase 1

API backend pour la plateforme Nexalys de calcul de productivite. Modele
SaaS B2B multi-tenant : chaque entreprise cliente a son propre abonnement
(essai / standard / premium) et son propre espace de donnees.

Boucle principale : **questionnaire -> moteur de calcul (6 modeles) ->
score de productivite stocke**, avec verification d'abonnement a chaque
requete payante.

## ⚠️ A regler avant une vraie demonstration

Les 6 formules de regression issues du brevet produisent des valeurs
brutes tres en dehors de la plage documentee de 30%-87% tant que les 11
facteurs d'entree (qualite, comportement, acces, etc.) ne sont pas saisis
exactement sur la meme echelle que celle utilisee dans l'etude
SPSS/MINITAB d'origine -- echelle qui n'est precisee nulle part dans le
texte du brevet fourni. Voir `calculation_engine.py` pour le detail.

## Modele de permissions

Il n'y a **plus d'inscription publique**. La creation de comptes suit des
regles strictes :

| Qui | Peut creer |
|---|---|
| **Super Admin** | Des entreprises (`POST /entreprises/`) et n'importe quel compte, de n'importe quel role, dans n'importe quelle entreprise (`POST /utilisateurs/`) |
| **DRH** | Des comptes Employe, uniquement dans sa propre entreprise (`POST /utilisateurs/employes`) |
| Tous les autres roles | Aucun compte |

Le tout premier Super Admin ne peut pas passer par l'API (il faudrait
deja etre authentifie) : il est cree via `create_super_admin.py`, en
dehors de l'API.

6 des 10 roles du brevet sont implementes : Super Admin, Admin entreprise,
DG, DRH, Manager, Employe. Restent : Responsable Qualite/Performance,
Analyste RH/Data Analyst, Auditeur, Chercheur.

## Installation

1. Demarrez votre conteneur Postgres :
   ```bash
   docker start nexalys-db
   ```

2. Creez un environnement virtuel et installez les dependances :
   ```bash
   python -m venv venv
   venv\Scripts\activate      # Windows
   # source venv/bin/activate  # Mac/Linux
   pip install -r requirements.txt
   ```

3. Copiez `.env.example` vers `.env` :
   ```bash
   copy .env.example .env      # Windows
   # cp .env.example .env       # Mac/Linux
   ```

4. **Pour une vraie mise en route** : creez le premier Super Admin, puis
   utilisez son compte pour creer vos entreprises et utilisateurs via l'API :
   ```bash
   python create_super_admin.py
   ```

   **Pour la demo rapide** : ce script cree directement une entreprise
   deja abonnee avec un Super Admin, un DG, un DRH et 3 employes :
   ```bash
   python seed_demo.py
   ```
   Comptes crees (mot de passe `demo1234` pour tous) :
   - Super Admin -> `super.admin@nexalys.dz`
   - DG -> `dg@ooredoo-demo.dz`
   - DRH -> `admin@ooredoo-demo.dz`
   - 3 employes (voir le script pour la liste)

5. Lancez l'API :
   ```bash
   uvicorn app.main:app --reload
   ```

6. Ouvrez la documentation interactive :
   ```
   http://127.0.0.1:8000/docs
   ```

## Tester le parcours complet (via /docs)

1. **POST /auth/login** avec `admin@ooredoo-demo.dz` / `demo1234`
   (DRH). Cliquez "Authorize" et collez le token.
2. **POST /utilisateurs/employes** -- creez un nouvel employe (reserve DRH).
3. Connectez-vous avec cet employe, **POST /questionnaires/soumettre**
   -- le score est calcule immediatement.
4. Reconnectez-vous en DRH, **GET /questionnaires/tableau-de-bord-entreprise**
   -- consultez les scores de toute l'entreprise.
5. Connectez-vous avec `super.admin@nexalys.dz` / `demo1234`,
   **POST /entreprises/** -- creez une deuxieme entreprise cliente.

## Simuler un abonnement expire ou suspendu

```sql
UPDATE entreprises SET statut_abonnement = 'suspendu' WHERE nom = 'Ooredoo Algerie (Demo)';
```

Toute requete vers une route protegee renverra alors une erreur
`402 Payment Required`. Le Super Admin n'est jamais concerne par cette
verification (il ne depend d'aucun abonnement).

## Ce qui est implemente (perimetre Phase 1)

- [x] 6 roles (Super Admin, Admin entreprise, DG, DRH, Manager, Employe)
- [x] Creation de comptes restreinte (Super Admin cree les entreprises et
      tous les comptes ; DRH cree uniquement des Employes dans son entreprise)
- [x] Entreprises multi-tenant avec **abonnement** (plan + statut + dates)
- [x] Verification d'abonnement actif sur toutes les routes payantes
- [x] Soumission de questionnaire (11 facteurs)
- [x] Moteur de calcul -- les 6 modeles, selection automatique selon
      taille de l'entreprise + genre
- [x] Tableau de bord (scores de toute l'entreprise avec identite des employes)
- [x] Authentification JWT, controle d'acces par role

## Ce qui n'est PAS encore implemente (Phase 2+)

- Les 4 roles restants (Responsable Qualite/Performance, Analyste RH,
  Auditeur, Chercheur)
- Export PDF/Excel des rapports
- Module d'intelligence artificielle / recommandations
- Facturation reelle (Stripe ou equivalent) -- pour l'instant le statut
  d'abonnement est gere manuellement en base
- Migrations Alembic (pour l'instant simple `create_all` au demarrage)
- **"Mot de passe oublie" en libre-service** (necessite un service d'envoi
  d'email) -- actuellement, seul un DRH ou Super Admin peut reinitialiser
  le mot de passe de quelqu'un d'autre depuis l'interface
- **Recuperation du Super Admin lui-meme** si son mot de passe est perdu --
  aucun mecanisme dans l'interface pour l'instant ; passer par
  `create_super_admin.py` ou une modification manuelle en base

## Structure du projet

```
app/
  main.py               Application FastAPI, montage des routes
  config.py             Chargement des variables d'environnement
  database.py            Connexion/session SQLAlchemy
  models.py                Tables (Entreprise+abonnement, User, QuestionnaireResponse, ProductivityScore)
  schemas.py                 Formes des requetes/reponses Pydantic
  auth.py                      Hachage mot de passe, JWT, verification abonnement, controle de role
  calculation_engine.py         Les 6 formules de regression (coeur de l'IP)
  routers/
    auth.py                       /auth/login, /auth/me
    entreprises.py                  /entreprises/* (creation reservee Super Admin)
    utilisateurs.py                   /utilisateurs/* (creation reservee Super Admin / DRH)
    questionnaires.py                   /questionnaires/soumettre, /mon-historique, /tableau-de-bord-entreprise
create_super_admin.py    Bootstrap : cree le tout premier Super Admin (hors API)
seed_demo.py              Script de simulation d'une entreprise cliente deja abonnee, avec tous les roles
```
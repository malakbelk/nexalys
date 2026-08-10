# Nexalys -- Frontend

Interface React (Vite + Tailwind v4) pour Nexalys.

## Ce qui est fait

- `/connexion` -- connexion, appelle `POST /auth/login`
- `/tableau-de-bord` -- vue differente selon le role :
  - **Super Admin** : liste des entreprises clientes de la plateforme
  - **DG / DRH / Admin entreprise / Manager** : scores de toute l'entreprise
  - **Employe** : son propre historique
- `/questionnaire` -- formulaire des 11 facteurs, affiche le score calcule
- `/admin/nouvelle-entreprise` -- **Super Admin uniquement** : cree une
  entreprise cliente puis son premier compte
- `/drh/nouvel-employe` -- **DRH uniquement** : cree un compte Employe
  dans sa propre entreprise

Il n'y a **plus d'inscription publique** : les comptes sont crees par le
Super Admin ou le DRH, en accord avec le modele de permissions du backend.

## Installation

Assurez-vous que le backend FastAPI tourne deja sur `http://127.0.0.1:8000`.

```bash
npm install
npm run dev
```

Ouvrez `http://localhost:5173`.

## Tester le parcours

1. Cote backend, executez `python seed_demo.py`
2. Connectez-vous sur `/connexion` avec :
   - `super.admin@nexalys.dz` / `demo1234` -> voit la liste des entreprises
   - `dg@ooredoo-demo.dz` / `demo1234` -> voit le tableau de bord entreprise
   - `admin@ooredoo-demo.dz` / `demo1234` (DRH) -> tableau de bord + bouton "Nouvel employe"
3. En tant que DRH, testez `/drh/nouvel-employe` pour creer un compte
4. Connectez-vous avec ce nouveau compte, remplissez `/questionnaire`
5. Reconnectez-vous en DRH ou DG pour voir le score apparaitre au tableau de bord

## Structure

```
src/
  main.jsx              Point d'entree
  App.jsx                Routes + protection par role (RequireRole)
  AuthContext.jsx          Etat de connexion global (token, utilisateur)
  api.js                     Appels fetch vers le backend
  index.css                   Tokens de design (couleurs, polices, animations)
  components/
    BrandPanel.jsx               Panneau de marque (trace de calibration animee)
    ScoreGauge.jsx                 Jauge reutilisable (echelle 30%-87%)
  pages/
    Login.jsx                      Connexion
    Dashboard.jsx                    Vue role-aware (Super Admin / entreprise / employe)
    Questionnaire.jsx                  Formulaire des 11 facteurs
    CreateEntreprise.jsx                 Super Admin : onboarding entreprise + premier compte
    CreateEmploye.jsx                      DRH : creation de compte employe
```

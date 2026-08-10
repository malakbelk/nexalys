"""
Schemas Pydantic -- definissent ce que l'API accepte en entree et
renvoie en sortie. Separes des modeles SQLAlchemy (app/models.py) pour
que la structure de la base de donnees et celle de l'API puissent
evoluer independamment.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict, field_validator, computed_field

from app.models import RoleEnum, TailleEntreprise, PlanAbonnement, StatutAbonnement


# ---- Entreprise ----

class EntrepriseCreate(BaseModel):
    nom: str
    secteur: str = "telecom"
    taille: TailleEntreprise
    plan: PlanAbonnement = PlanAbonnement.ESSAI


class EntrepriseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nom: str
    secteur: str
    taille: TailleEntreprise
    plan: PlanAbonnement
    statut_abonnement: StatutAbonnement
    date_debut_abonnement: datetime
    date_fin_abonnement: Optional[datetime]
    created_at: datetime


# ---- User ----

class UserCreate(BaseModel):
    """
    Utilisee par le Super Admin pour creer un compte de n'importe quel
    role, dans n'importe quelle entreprise (ou aucune, pour un autre
    Super Admin). entreprise_id est optionnel uniquement dans ce cas.

    Pas de champ mot de passe : il est genere automatiquement cote
    serveur et renvoye une seule fois dans la reponse (voir UserCreatedOut).
    """
    email: EmailStr
    full_name: str
    role: RoleEnum
    genre: Optional[str] = None  # "M" or "F"
    entreprise_id: Optional[str] = None


class EmployeCreate(BaseModel):
    """
    Utilisee par un DRH pour creer un compte Employe. Pas de champ role,
    entreprise_id, ni mot de passe : role et entreprise sont fixes cote
    serveur (role=employe, entreprise = celle du DRH), et le mot de passe
    est genere automatiquement (voir UserCreatedOut).
    """
    email: EmailStr
    full_name: str
    genre: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str
    role: RoleEnum
    genre: Optional[str]
    entreprise_id: Optional[str]
    is_active: bool


class UserCreatedOut(UserOut):
    """
    Renvoyee uniquement au moment de la creation d'un compte : inclut le
    mot de passe temporaire en clair, generE automatiquement, pour que
    la personne qui cree le compte (Super Admin ou DRH) puisse le
    transmettre. Ce mot de passe n'est jamais stocke ni consultable a
    nouveau ensuite -- seul son hash l'est.
    """
    temporary_password: str


class UserUpdate(BaseModel):
    """
    Champs modifiables sur un compte existant. Tous optionnels : seuls
    les champs fournis sont mis a jour. Utilisee par le Super Admin
    (tous les champs) et par le DRH via une route separee qui n'autorise
    que is_active (voir routers/utilisateurs.py).
    """
    full_name: Optional[str] = None
    role: Optional[RoleEnum] = None
    genre: Optional[str] = None
    is_active: Optional[bool] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---- Questionnaire ----

# Echelle de Likert a 4 niveaux (these Dr NEDIL, p.122), appliquee aux
# 9 facteurs qualitatifs (C a K) : 1 / 2 / 3 / 4. Converties en valeur
# centrale (12.5/37.5/62.5/87.5) cote calcul -- voir calculation_engine.py.
NIVEAUX_LIKERT_VALIDES = (1.0, 2.0, 3.0, 4.0)

# absenteisme et remuneration (A et B) sont binaires : 0.0 = niveau faible
# (reference), 1.0 = niveau eleve (le coefficient plein de la formule
# s'applique).
NIVEAU_BINAIRE_VALIDE = (0.0, 1.0)


class QuestionnaireResponseCreate(BaseModel):
    absenteisme: float
    remuneration: float
    qualite: float
    comportement: float
    acces_info: float
    reactivite: float
    formation: float
    competence: float
    motivation: float
    besoins: float
    soutien: float

    @field_validator("absenteisme", "remuneration")
    @classmethod
    def valider_niveau_binaire(cls, v: float) -> float:
        if v not in NIVEAU_BINAIRE_VALIDE:
            raise ValueError(
                f"Valeur invalide ({v}). Ce facteur doit valoir 0 (faible) "
                f"ou 1 (eleve)."
            )
        return v

    @field_validator(
        "qualite", "comportement", "acces_info", "reactivite",
        "formation", "competence", "motivation", "besoins", "soutien",
    )
    @classmethod
    def valider_echelle_likert(cls, v: float) -> float:
        if v not in NIVEAUX_LIKERT_VALIDES:
            raise ValueError(
                f"Valeur invalide ({v}). Chaque facteur doit valoir "
                f"1, 2, 3 ou 4 (echelle de Likert a 4 niveaux)."
            )
        return v


class QuestionnaireResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    submitted_at: datetime


# ---- Score ----

class ProductivityScoreOut(BaseModel):
    """
    raw_score : score brut de la regression, conserve pour audit/
    tracabilite (voir calculation_engine.py).
    normalized_score : stocke en base sous ce nom historique, mais
    represente la Productivite Indexee finale (toujours dans [30, 87]),
    exposee egalement sous le nom `score_indexe` pour plus de clarte.

    NB : ne contient volontairement AUCUNE recommandation/CAPA -- c'est
    la reponse renvoyee a la personne qui soumet le questionnaire
    (generalement un Employe). Le plan CAPA est reserve au DRH/DG et se
    consulte separement via GET /questionnaires/{score_id}/capa.
    """
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: str
    response_id: str
    model_used: str
    raw_score: float
    normalized_score: float
    computed_at: datetime

    @computed_field
    @property
    def score_indexe(self) -> float:
        """Alias explicite de normalized_score : la Productivite Indexee (%)."""
        return self.normalized_score


class ProductivityScoreAdminOut(BaseModel):
    """
    Meme forme que ProductivityScoreOut, avec l'identite de l'employe en
    plus -- utilisee uniquement sur le tableau de bord entreprise
    (Admin entreprise / Manager / DG / DRH), jamais exposee a l'employe
    lui-meme.
    """
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: str
    response_id: str
    model_used: str
    raw_score: float
    normalized_score: float
    computed_at: datetime
    employee_name: str
    employee_email: str

    @computed_field
    @property
    def score_indexe(self) -> float:
        return self.normalized_score


# ---- CAPA (Corrective and Preventive Action) ----

class ActionCapa(BaseModel):
    """
    Une action du plan CAPA, declenchee selon les conclusions du
    chapitre 5 de la these a partir des facteurs faibles du questionnaire.
    Calculee a la volee -- non persistee en base.

    type_action distingue :
        - "corrective" : le probleme est deja avere (facteur au niveau
          le plus faible), il faut corriger l'existant.
        - "preventive" : le facteur est faible mais pas critique, l'action
          vise a eviter une degradation.
    """
    titre: str
    description: str
    facteurs_concernes: list[str]
    type_action: str


class CapaOut(BaseModel):
    """
    Plan CAPA d'un employe pour une evaluation donnee, recalcule a la
    demande a partir des reponses stockees. Reserve au DRH/DG (et aux
    roles Admin entreprise / Manager) de la meme entreprise que l'employe
    concerne -- voir GET /questionnaires/{score_id}/capa.
    """
    score_id: str
    employee_name: str
    employee_email: str
    plan_capa: list[ActionCapa] = []
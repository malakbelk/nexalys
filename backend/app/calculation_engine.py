"""
Calculation Engine -- Nexalys core IP.

Implements the 6 regression models derived from the SPSS/MINITAB research
described in the these de doctorat de L. NEDIL (secteur Telecom en Algerie,
chapitre 5) :

  Grande entreprise (>= 10 000 employes) -- coefficients "Algerie Telecom":
    1. Globale
    2. Masculin
    3. Feminin

  Petite entreprise (< 10 000 employes) -- coefficients "Mobilis":
    1. Globale
    2. Masculin
    3. Feminin

Model selection is automatic: based on the company's `taille` and the
employee's `genre`, exactly one of the 6 formulas is applied.

PILIER 1 -- ENCODAGE DES ENTREES :
  - Les 9 facteurs qualitatifs (qualite, comportement, acces_info, reactivite,
    formation, competence, motivation, besoins, soutien) sont collectes via
    une echelle de Likert a 4 niveaux (1/2/3/4), puis CONVERTIS en valeur
    centrale avant d'etre injectes dans les formules de regression :
        1 (pas du tout d'accord / insatisfait) -> 12.5
        2 (plutot pas d'accord / moyennement satisfait) -> 37.5
        3 (plutot d'accord / satisfait) -> 62.5
        4 (tout a fait d'accord / tres satisfait) -> 87.5

  - Les 2 facteurs quantitatifs (absenteisme, remuneration) sont binaires :
        0.0 = niveau faible (valeur de reference, aucune contribution)
        1.0 = niveau eleve (le coefficient plein de la formule s'applique)

PILIER 3 -- NORMALISATION ET CLAMPING (securite mathematique) :
  Les coefficients de la these ont ete calibres sur des variations infimes
  du score brut (ex: comportement teste entre 62,5 et 62,76 dans le plan de
  criblage MINITAB), ce qui fait exploser le score brut quand on injecte
  l'echelle Likert complete (12.5 a 87.5). Le score brut n'est donc PAS
  directement lisible comme un pourcentage.

  Etapes :
    1. Calcul du score brut (raw_score) via la formule de regression.
    2. Plafonnement de securite : si raw_score > 108.9 (maximum observe
       dans les simulations de la these), on le ramene a 108.9.
    3. Normalisation lineaire (regle de trois) du score plafonne, sur le
       domaine [0, 100], vers la fourchette cible de l'etude [30%, 87%] :
          raw <= 0    -> 30 %
          raw >= 100  -> 87 %
          sinon       -> 30 + (raw / 100) * (87 - 30)

  Le resultat de cette normalisation est le score final affiche a
  l'utilisateur : la "Productivite Indexee".
"""
from dataclasses import dataclass


# ---------------------------------------------------------------------------
# PILIER 1 -- Echelle de mesure
# ---------------------------------------------------------------------------

LIKERT_NIVEAUX = (1.0, 2.0, 3.0, 4.0)
NIVEAUX_BINAIRES = (0.0, 1.0)

LIKERT_VERS_VALEUR_CENTRALE = {
    1.0: 12.5,
    2.0: 37.5,
    3.0: 62.5,
    4.0: 87.5,
}


def _valeur_centrale(reponse_likert: float) -> float:
    """Convertit une reponse Likert (1-4) en valeur centrale (12.5-87.5)."""
    try:
        return LIKERT_VERS_VALEUR_CENTRALE[reponse_likert]
    except KeyError:
        raise ValueError(
            f"Reponse Likert invalide: {reponse_likert!r}. Attendu 1, 2, 3 ou 4."
        )


@dataclass
class FactorInputs:
    """Reponses brutes soumises par l'employe via le questionnaire.

    - absenteisme, remuneration: binaire, 0.0 (faible) ou 1.0 (eleve).
    - tous les autres facteurs: echelle de Likert 1-4 (voir LIKERT_NIVEAUX).
    """
    absenteisme: float     # A - binaire (0 ou 1)
    remuneration: float    # B - binaire (0 ou 1)
    qualite: float          # C - Likert 1-4
    comportement: float      # D - Likert 1-4
    acces_info: float         # E - Likert 1-4
    reactivite: float          # F - Likert 1-4
    formation: float             # G - Likert 1-4 (Propost dans la these)
    competence: float             # H - Likert 1-4
    motivation: float               # I - Likert 1-4
    besoins: float                    # J - Likert 1-4
    soutien: float                      # K - Likert 1-4


@dataclass
class _ModelInputs:
    """Valeurs converties, pretes a etre injectees dans les formules de
    regression (echelle 12.5-87.5 pour les facteurs qualitatifs, binaire
    0/1 inchange pour absenteisme et remuneration)."""
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


def _convertir(f: FactorInputs) -> _ModelInputs:
    return _ModelInputs(
        absenteisme=f.absenteisme,
        remuneration=f.remuneration,
        qualite=_valeur_centrale(f.qualite),
        comportement=_valeur_centrale(f.comportement),
        acces_info=_valeur_centrale(f.acces_info),
        reactivite=_valeur_centrale(f.reactivite),
        formation=_valeur_centrale(f.formation),
        competence=_valeur_centrale(f.competence),
        motivation=_valeur_centrale(f.motivation),
        besoins=_valeur_centrale(f.besoins),
        soutien=_valeur_centrale(f.soutien),
    )


# ---------------------------------------------------------------------------
# PILIER 2 -- Formules de regression (unites non codees)
# ---------------------------------------------------------------------------

# GRANDE ENTREPRISE (>= 10 000 employes) -- coefficients "Algerie Telecom"

def _grande_globale(f: _ModelInputs) -> float:
    return (
        1654
        - 0.772 * f.qualite
        + 6.34 * f.comportement
        + 0.874 * f.acces_info
        - 7.53 * f.reactivite
        + 0.907 * f.formation
        - 23.70 * f.competence
        + 0.478 * f.motivation
        - 0.973 * f.besoins
        - 0.932 * f.soutien
        + 4.80 * f.absenteisme
        + 3.30 * f.remuneration
    )


def _grande_masculin(f: _ModelInputs) -> float:
    return (
        -32
        - 0.772 * f.qualite
        + 14.18 * f.comportement
        + 0.899 * f.acces_info
        - 8.36 * f.reactivite
        + 0.922 * f.formation
        - 3.589 * f.competence
        + 0.848 * f.motivation
        - 0.990 * f.besoins
        - 1.361 * f.soutien
        + 4.80 * f.absenteisme
        + 3.30 * f.remuneration
    )


def _grande_feminin(f: _ModelInputs) -> float:
    return (
        -724
        - 0.772 * f.qualite
        + 30.0 * f.comportement
        + 0.792 * f.acces_info
        - 8.16 * f.reactivite
        + 0.913 * f.formation
        - 8.73 * f.competence
        + 1.001 * f.motivation
        - 1.001 * f.besoins
        - 1.318 * f.soutien
        + 4.80 * f.absenteisme
        + 3.30 * f.remuneration
    )


# PETITE ENTREPRISE (< 10 000 employes) -- coefficients "Mobilis"

def _petite_globale(f: _ModelInputs) -> float:
    return (
        1821
        - 1.35 * f.qualite
        + 0.794 * f.comportement
        + 0.940 * f.acces_info
        - 6.61 * f.reactivite
        + 1.344 * f.formation
        - 3.299 * f.competence
        + 0.601 * f.motivation
        - 16.00 * f.besoins
        - 4.41 * f.soutien
        + 4.80 * f.absenteisme
        + 3.30 * f.remuneration
    )


def _petite_masculin(f: _ModelInputs) -> float:
    return (
        2374
        - 1.355 * f.qualite
        + 0.897 * f.comportement
        + 2.453 * f.acces_info
        - 9.44 * f.reactivite
        + 1.302 * f.formation
        - 1.077 * f.competence
        + 0.640 * f.motivation
        - 28.8 * f.besoins
        - 2.031 * f.soutien
        + 4.80 * f.absenteisme
        + 3.30 * f.remuneration
    )


def _petite_feminin(f: _ModelInputs) -> float:
    return (
        9748
        - 1.355 * f.qualite
        + 0.2774 * f.comportement
        + 0.959 * f.acces_info
        - 8.00 * f.reactivite
        + 1.444 * f.formation
        - 2.779 * f.competence
        + 0.592 * f.motivation
        - 144.0 * f.besoins
        - 1.965 * f.soutien
        + 4.80 * f.absenteisme
        + 3.30 * f.remuneration
    )


_MODEL_REGISTRY = {
    ("grande", "global"): ("grande_globale", _grande_globale),
    ("grande", "M"): ("grande_masculin", _grande_masculin),
    ("grande", "F"): ("grande_feminin", _grande_feminin),
    ("petite", "global"): ("petite_globale", _petite_globale),
    ("petite", "M"): ("petite_masculin", _petite_masculin),
    ("petite", "F"): ("petite_feminin", _petite_feminin),
}


# ---------------------------------------------------------------------------
# PILIER 3 -- Normalisation et clamping
# ---------------------------------------------------------------------------

RAW_SCORE_MAX_AJUSTE = 108.9   # plafonnement de securite (max observe these)
DOMAINE_NORMALISATION_MAX = 100.0
PRODUCTIVITE_MIN = 30.0
PRODUCTIVITE_MAX = 87.0


def _normaliser(raw_score: float) -> float:
    """
    Normalise le score brut (plafonne) en un pourcentage compris dans la
    fourchette cible de l'etude [30 %, 87 %], via une regle de trois
    lineaire sur le domaine [0, 100].
    """
    raw_plafonne = min(raw_score, RAW_SCORE_MAX_AJUSTE)

    if raw_plafonne >= DOMAINE_NORMALISATION_MAX:
        return PRODUCTIVITE_MAX
    if raw_plafonne <= 0:
        return PRODUCTIVITE_MIN

    ratio = raw_plafonne / DOMAINE_NORMALISATION_MAX
    return PRODUCTIVITE_MIN + ratio * (PRODUCTIVITE_MAX - PRODUCTIVITE_MIN)


def compute_score(taille: str, genre: str, factors: FactorInputs) -> dict:
    """
    Selectionne le bon modele, calcule le score brut, puis la Productivite
    Indexee (score final normalise, affiche a l'utilisateur).

    Args:
        taille: "grande" ou "petite" (taille de l'entreprise cliente)
        genre: "M", "F", ou "global" -- quel segment de formule utiliser.
        factors: les 11 reponses brutes du questionnaire.

    Returns:
        dict avec model_used, raw_score (valeur reelle non plafonnee, pour
        audit/tracabilite), et score_indexe (Productivite Indexee finale,
        toujours comprise dans [30, 87]).
    """
    key = (taille, genre)
    if key not in _MODEL_REGISTRY:
        raise ValueError(
            f"No model for taille={taille!r}, genre={genre!r}. "
            f"Valid combinations: {list(_MODEL_REGISTRY.keys())}"
        )

    model_name, model_fn = _MODEL_REGISTRY[key]
    model_inputs = _convertir(factors)
    raw = model_fn(model_inputs)
    score_indexe = _normaliser(raw)

    return {
        "model_used": model_name,
        "raw_score": raw,
        "score_indexe": score_indexe,
    }


# ---------------------------------------------------------------------------
# PILIER 4 -- Analyse et plan CAPA (Corrective and Preventive Action)
# ---------------------------------------------------------------------------

# Seuil (sur l'echelle Likert brute 1-4) en dessous duquel un facteur est
# considere comme "faible" et peut declencher une action du plan CAPA.
SEUIL_FACTEUR_FAIBLE = 2.0

# Seuil en dessous duquel une action est classee CORRECTIVE plutot que
# PREVENTIVE : niveau 1 ("pas du tout d'accord" / "insatisfait") signifie
# que le probleme est deja avere -- il faut corriger l'existant. Niveau 2
# ("plutot pas d'accord") signale un risque emergent -- on agit avant que
# la situation ne se degrade davantage, d'ou une action preventive.
SEUIL_ACTION_CORRECTIVE = 1.0

_LIBELLES_FACTEURS = {
    "motivation": "Motivation",
    "formation": "Formation",
    "soutien": "Soutien social",
    "reactivite": "Reactivite",
}

# Les deux regles issues des conclusions du chapitre 5 de la these.
_REGLES_RECOMMANDATION = [
    {
        "titre": "Interconnexion des talents et intelligence collective",
        "description": (
            "Interconnecter les talents existants dans l'equipe et combiner "
            "les intelligences individuelles pour generer de l'enthousiasme "
            "et aboutir a des resultats plus innovants et performants."
        ),
        "declencheurs": ("motivation", "formation"),
    },
    {
        "titre": "Delegation des taches et clarification des attentes",
        "description": (
            "Deleguer davantage les taches pour reduire la charge de travail "
            "et clarifier les attentes de chacun, afin de renforcer la "
            "reactivite de l'equipe et le soutien social entre collegues."
        ),
        "declencheurs": ("soutien", "reactivite"),
    },
]


def generate_recommandations(factors: FactorInputs) -> list[dict]:
    """
    Analyse les reponses brutes (echelle Likert 1-4) et retourne les
    actions du plan CAPA declenchees selon les conclusions de la these :

    - Motivation ou Formation faible -> intelligence collective / talents.
    - Soutien social ou Reactivite faible -> delegation / clarification.

    Une regle n'est declenchee que si AU MOINS un de ses facteurs est en
    dessous du seuil (SEUIL_FACTEUR_FAIBLE). Chaque action declenchee est
    en outre classee :
        - "corrective" si au moins un des facteurs declencheurs est au
          niveau le plus faible (SEUIL_ACTION_CORRECTIVE) -- le probleme
          existe deja, il faut le corriger ;
        - "preventive" sinon -- le facteur est faible mais pas critique,
          l'action vise a eviter une degradation.
    """
    recommandations = []
    for regle in _REGLES_RECOMMANDATION:
        facteurs_declenches = [
            (cle, getattr(factors, cle))
            for cle in regle["declencheurs"]
            if getattr(factors, cle) <= SEUIL_FACTEUR_FAIBLE
        ]
        if facteurs_declenches:
            type_action = (
                "corrective"
                if any(valeur <= SEUIL_ACTION_CORRECTIVE for _, valeur in facteurs_declenches)
                else "preventive"
            )
            recommandations.append({
                "titre": regle["titre"],
                "description": regle["description"],
                "facteurs_concernes": [_LIBELLES_FACTEURS[cle] for cle, _ in facteurs_declenches],
                "type_action": type_action,
            })
    return recommandations
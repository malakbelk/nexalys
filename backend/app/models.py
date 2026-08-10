"""
Database tables (SQLAlchemy ORM models).

Phase 1 MVP scope, deliberately kept small:
- Entreprise: the tenant (company using Nexalys)
- User: belongs to one Entreprise, has one Role
- QuestionnaireResponse: one employee's answers to the 11 factors
- ProductivityScore: the computed result from the calculation engine
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Float, ForeignKey, DateTime, Enum, Integer, Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class RoleEnum(str, enum.Enum):
    """
    6 des 10 roles du brevet sont implementes. Restent a ajouter :
    Responsable Qualite/Performance, Analyste RH/Data Analyst,
    Auditeur, Chercheur/Administrateur scientifique.
    """
    SUPER_ADMIN = "super_admin"          # plateforme entiere, aucune entreprise associee
    ADMIN_ENTREPRISE = "admin_entreprise"
    DG = "dg"
    DRH = "drh"
    MANAGER = "manager"
    EMPLOYE = "employe"


class TailleEntreprise(str, enum.Enum):
    GRANDE = "grande"   # >= 10 000 employees -> "large" model set
    PETITE = "petite"   # < 10 000 employees  -> "small" model set


class PlanAbonnement(str, enum.Enum):
    """Les formules d'abonnement proposees aux entreprises clientes."""
    ESSAI = "essai"              # periode d'essai gratuite
    STANDARD = "standard"
    PREMIUM = "premium"


class StatutAbonnement(str, enum.Enum):
    ACTIF = "actif"
    EXPIRE = "expire"
    SUSPENDU = "suspendu"


class Entreprise(Base):
    __tablename__ = "entreprises"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    nom = Column(String, nullable=False)
    secteur = Column(String, default="telecom")  # future: banque, assurance, sante...
    taille = Column(Enum(TailleEntreprise), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # -- Abonnement (SaaS subscription) --
    plan = Column(Enum(PlanAbonnement), nullable=False, default=PlanAbonnement.ESSAI)
    statut_abonnement = Column(Enum(StatutAbonnement), nullable=False, default=StatutAbonnement.ACTIF)
    date_debut_abonnement = Column(DateTime, default=datetime.utcnow)
    date_fin_abonnement = Column(DateTime, nullable=True)  # null = pas de date d'expiration fixee

    users = relationship("User", back_populates="entreprise")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    genre = Column(String, nullable=True)  # "M" / "F" -- used to pick masculin/feminin model
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Nullable : un Super Admin gere la plateforme entiere et n'appartient
    # a aucune entreprise cliente. Tous les autres roles doivent en avoir une
    # (applique au niveau applicatif, dans les routers de creation d'utilisateurs).
    entreprise_id = Column(UUID(as_uuid=False), ForeignKey("entreprises.id"), nullable=True)
    entreprise = relationship("Entreprise", back_populates="users")

    responses = relationship("QuestionnaireResponse", back_populates="user")


class QuestionnaireResponse(Base):
    """
    One employee's answers to the 11 factors identified in the research.
    Each factor is scored on a scale (e.g. 0-100) by the questionnaire UI;
    the calculation engine consumes these directly as model inputs.
    """
    __tablename__ = "questionnaire_responses"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="responses")

    # The 11 factors (A-K from the brevet document)
    absenteisme = Column(Float, nullable=False)      # A
    remuneration = Column(Float, nullable=False)      # B
    qualite = Column(Float, nullable=False)            # C
    comportement = Column(Float, nullable=False)       # D
    acces_info = Column(Float, nullable=False)         # E
    reactivite = Column(Float, nullable=False)          # F
    formation = Column(Float, nullable=False)           # G
    competence = Column(Float, nullable=False)          # H
    motivation = Column(Float, nullable=False)          # I
    besoins = Column(Float, nullable=False)              # J
    soutien = Column(Float, nullable=False)              # K

    submitted_at = Column(DateTime, default=datetime.utcnow)

    score = relationship("ProductivityScore", back_populates="response", uselist=False)


class ProductivityScore(Base):
    """
    The output of the calculation engine for one questionnaire response.
    We store the raw formula output AND which model was used, so results
    stay auditable/reproducible even if the formulas evolve later.
    """
    __tablename__ = "productivity_scores"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    response_id = Column(UUID(as_uuid=False), ForeignKey("questionnaire_responses.id"), nullable=False, unique=True)
    response = relationship("QuestionnaireResponse", back_populates="score")

    model_used = Column(String, nullable=False)   # e.g. "grande_globale", "petite_feminin"
    raw_score = Column(Float, nullable=False)
    normalized_score = Column(Float, nullable=False)  # clamped to the 30-87% band from the research
    computed_at = Column(DateTime, default=datetime.utcnow)

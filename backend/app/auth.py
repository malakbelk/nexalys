"""
Utilitaires d'authentification : hachage des mots de passe + JWT.
Ajoute egalement la verification de l'abonnement de l'entreprise :
un utilisateur dont l'entreprise n'a plus un abonnement actif ne peut
pas utiliser les fonctionnalites payantes de la plateforme.

Phase 1 : reste volontairement simple (un seul secret JWT, pas de
refresh token, pas de verification d'email). Suffisant pour une
demonstration MVP ; a revoir avant de traiter de vraies donnees clients.
"""
from datetime import datetime, timedelta
from typing import Optional
import secrets
import string

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def generate_temporary_password(length: int = 12) -> str:
    """
    Genere un mot de passe temporaire lisible (lettres + chiffres, sans
    caracteres ambigus comme 0/O ou 1/l) -- utilise quand le Super Admin
    cree un compte ou que le DRH cree un employe. Le mot de passe en
    clair n'est jamais stocke ; seul son hash l'est. Il est retourne
    une seule fois, dans la reponse de creation, pour etre transmis a
    la personne concernee.
    """
    alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    identifiants_invalides = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants invalides",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise identifiants_invalides
    except JWTError:
        raise identifiants_invalides

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise identifiants_invalides
    return user


def require_active_subscription(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """
    Dependance a utiliser sur toute route payante : verifie que
    l'entreprise de l'utilisateur a un abonnement actif avant de
    laisser passer la requete.

    Le Super Admin gere la plateforme, pas une entreprise cliente -- il
    n'est rattache a aucun abonnement et contourne systematiquement
    cette verification.
    """
    if current_user.role == models.RoleEnum.SUPER_ADMIN:
        return current_user

    entreprise = current_user.entreprise
    if entreprise is None or entreprise.statut_abonnement != models.StatutAbonnement.ACTIF:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="L'abonnement de votre entreprise n'est pas actif. "
                   "Veuillez contacter votre administrateur ou renouveler votre abonnement.",
        )
    return current_user


def require_role(*allowed_roles: models.RoleEnum):
    """Fabrique de dependance : restreint une route a certains roles."""
    def checker(current_user: models.User = Depends(require_active_subscription)) -> models.User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas la permission d'effectuer cette action",
            )
        return current_user
    return checker
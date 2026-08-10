from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["authentification"])

# NB : il n'y a plus d'inscription publique ici. La creation de comptes
# suit desormais des regles strictes (voir routers/utilisateurs.py) :
#   - le Super Admin cree les entreprises et n'importe quel compte
#   - le DRH cree uniquement des comptes Employe, dans sa propre entreprise
# Le tout premier Super Admin est cree hors API, via le script
# create_super_admin.py (probleme classique de bootstrap : il faut deja
# etre authentifie pour creer des comptes via l'API).


@router.post("/login", response_model=schemas.Token)
def connexion(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    token = auth.create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def utilisateur_courant(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

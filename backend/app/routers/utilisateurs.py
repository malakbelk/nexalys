from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/utilisateurs", tags=["utilisateurs"])


def _supprimer_utilisateur_cascade(db: Session, user: models.User) -> None:
    """
    Supprime un utilisateur et tout ce qui en depend (ses reponses aux
    questionnaires et les scores calcules a partir de celles-ci), pour
    respecter les contraintes de cle etrangere.
    """
    response_ids = [
        r.id for r in db.query(models.QuestionnaireResponse.id).filter(
            models.QuestionnaireResponse.user_id == user.id
        ).all()
    ]
    if response_ids:
        db.query(models.ProductivityScore).filter(
            models.ProductivityScore.response_id.in_(response_ids)
        ).delete(synchronize_session=False)
        db.query(models.QuestionnaireResponse).filter(
            models.QuestionnaireResponse.user_id == user.id
        ).delete(synchronize_session=False)
    db.delete(user)


@router.post("/", response_model=schemas.UserCreatedOut, status_code=status.HTTP_201_CREATED)
def creer_utilisateur(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(models.RoleEnum.SUPER_ADMIN)),
):
    """
    Reserve au Super Admin : cree un compte de n'importe quel role,
    dans n'importe quelle entreprise. C'est la seule facon de creer un
    DG, un DRH, un Manager ou un autre Super Admin.

    Le mot de passe est genere automatiquement et renvoye en clair une
    seule fois dans la reponse, a transmettre a la personne concernee.
    """
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est deja utilise")

    if payload.role == models.RoleEnum.SUPER_ADMIN:
        entreprise_id = None
    else:
        if not payload.entreprise_id:
            raise HTTPException(
                status_code=400,
                detail="entreprise_id est requis pour ce role",
            )
        entreprise = db.query(models.Entreprise).filter(models.Entreprise.id == payload.entreprise_id).first()
        if not entreprise:
            raise HTTPException(status_code=404, detail="Entreprise introuvable")
        entreprise_id = payload.entreprise_id

    mot_de_passe_temporaire = auth.generate_temporary_password()

    user = models.User(
        email=payload.email,
        hashed_password=auth.hash_password(mot_de_passe_temporaire),
        full_name=payload.full_name,
        role=payload.role,
        genre=payload.genre,
        entreprise_id=entreprise_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return schemas.UserCreatedOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        genre=user.genre,
        entreprise_id=user.entreprise_id,
        is_active=user.is_active,
        temporary_password=mot_de_passe_temporaire,
    )


@router.post("/employes", response_model=schemas.UserCreatedOut, status_code=status.HTTP_201_CREATED)
def creer_employe(
    payload: schemas.EmployeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(models.RoleEnum.DRH)),
):
    """
    Reserve au DRH : cree un compte Employe dans SA PROPRE entreprise
    uniquement. Le role et l'entreprise sont fixes cote serveur -- pas
    moyen pour un DRH de creer un compte a role eleve ou hors de son
    entreprise, meme en modifiant la requete.

    Le mot de passe est genere automatiquement et renvoye en clair une
    seule fois dans la reponse, a transmettre a l'employe.
    """
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est deja utilise")

    mot_de_passe_temporaire = auth.generate_temporary_password()

    employe = models.User(
        email=payload.email,
        hashed_password=auth.hash_password(mot_de_passe_temporaire),
        full_name=payload.full_name,
        role=models.RoleEnum.EMPLOYE,
        genre=payload.genre,
        entreprise_id=current_user.entreprise_id,
    )
    db.add(employe)
    db.commit()
    db.refresh(employe)

    return schemas.UserCreatedOut(
        id=employe.id,
        email=employe.email,
        full_name=employe.full_name,
        role=employe.role,
        genre=employe.genre,
        entreprise_id=employe.entreprise_id,
        is_active=employe.is_active,
        temporary_password=mot_de_passe_temporaire,
    )


@router.get("/", response_model=list[schemas.UserOut])
def lister_utilisateurs(
    entreprise_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.require_role(
            models.RoleEnum.SUPER_ADMIN,
            models.RoleEnum.DG,
            models.RoleEnum.DRH,
            models.RoleEnum.ADMIN_ENTREPRISE,
        )
    ),
):
    """
    Le Super Admin voit tout le monde, et peut filtrer par entreprise via
    ?entreprise_id=... (utilise par la page de detail d'une entreprise).
    DG / DRH / Admin entreprise ne voient que les comptes de leur propre
    entreprise, quel que soit le parametre fourni.
    """
    query = db.query(models.User)
    if current_user.role == models.RoleEnum.SUPER_ADMIN:
        if entreprise_id:
            query = query.filter(models.User.entreprise_id == entreprise_id)
    else:
        query = query.filter(models.User.entreprise_id == current_user.entreprise_id)
    return query.all()


@router.patch("/{user_id}", response_model=schemas.UserOut)
def modifier_utilisateur(
    user_id: str,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(models.RoleEnum.SUPER_ADMIN)),
):
    """Reserve au Super Admin : modifie n'importe quel champ d'un compte."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    if payload.genre is not None:
        user.genre = payload.genre
    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_utilisateur(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(models.RoleEnum.SUPER_ADMIN)),
):
    """Reserve au Super Admin : supprime n'importe quel compte."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    _supprimer_utilisateur_cascade(db, user)
    db.commit()


@router.post("/{user_id}/reinitialiser-mot-de-passe", response_model=schemas.UserCreatedOut)
def reinitialiser_mot_de_passe(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(models.RoleEnum.SUPER_ADMIN)),
):
    """
    Reserve au Super Admin : genere un nouveau mot de passe temporaire
    pour n'importe quel compte et l'invalide immediatement (l'ancien ne
    fonctionne plus). Le mot de passe precedent n'a jamais ete recuperable
    (seul son hash etait stocke) -- c'est le seul moyen de redonner
    l'acces a quelqu'un qui a perdu ses identifiants.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    mot_de_passe_temporaire = auth.generate_temporary_password()
    user.hashed_password = auth.hash_password(mot_de_passe_temporaire)
    db.commit()
    db.refresh(user)

    return schemas.UserCreatedOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        genre=user.genre,
        entreprise_id=user.entreprise_id,
        is_active=user.is_active,
        temporary_password=mot_de_passe_temporaire,
    )


@router.patch("/employes/{user_id}", response_model=schemas.UserOut)
def modifier_employe(
    user_id: str,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(models.RoleEnum.DRH)),
):
    """
    Reserve au DRH : active/desactive un compte Employe de sa propre
    entreprise. Seul is_active est pris en compte -- un DRH ne peut pas
    changer le role ou l'entreprise d'un compte, meme en l'envoyant.
    """
    employe = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.entreprise_id == current_user.entreprise_id,
        models.User.role == models.RoleEnum.EMPLOYE,
    ).first()
    if not employe:
        raise HTTPException(status_code=404, detail="Employe introuvable dans votre entreprise")

    if payload.is_active is not None:
        employe.is_active = payload.is_active

    db.commit()
    db.refresh(employe)
    return employe


@router.delete("/employes/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_employe(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(models.RoleEnum.DRH)),
):
    """Reserve au DRH : supprime un compte Employe de sa propre entreprise."""
    employe = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.entreprise_id == current_user.entreprise_id,
        models.User.role == models.RoleEnum.EMPLOYE,
    ).first()
    if not employe:
        raise HTTPException(status_code=404, detail="Employe introuvable dans votre entreprise")

    _supprimer_utilisateur_cascade(db, employe)
    db.commit()


@router.post("/employes/{user_id}/reinitialiser-mot-de-passe", response_model=schemas.UserCreatedOut)
def reinitialiser_mot_de_passe_employe(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(models.RoleEnum.DRH)),
):
    """Reserve au DRH : reinitialise le mot de passe d'un Employe de sa propre entreprise."""
    employe = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.entreprise_id == current_user.entreprise_id,
        models.User.role == models.RoleEnum.EMPLOYE,
    ).first()
    if not employe:
        raise HTTPException(status_code=404, detail="Employe introuvable dans votre entreprise")

    mot_de_passe_temporaire = auth.generate_temporary_password()
    employe.hashed_password = auth.hash_password(mot_de_passe_temporaire)
    db.commit()
    db.refresh(employe)

    return schemas.UserCreatedOut(
        id=employe.id,
        email=employe.email,
        full_name=employe.full_name,
        role=employe.role,
        genre=employe.genre,
        entreprise_id=employe.entreprise_id,
        is_active=employe.is_active,
        temporary_password=mot_de_passe_temporaire,
    )

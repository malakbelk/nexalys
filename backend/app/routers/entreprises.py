from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/entreprises", tags=["entreprises"])


@router.post("/", response_model=schemas.EntrepriseOut, status_code=status.HTTP_201_CREATED)
def creer_entreprise(
    payload: schemas.EntrepriseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(models.RoleEnum.SUPER_ADMIN)),
):
    """
    Cree une nouvelle entreprise cliente (tenant) avec son abonnement.
    Reserve au Super Admin -- c'est lui qui gere l'onboarding des
    nouveaux clients sur la plateforme.
    """
    entreprise = models.Entreprise(
        nom=payload.nom,
        secteur=payload.secteur,
        taille=payload.taille,
        plan=payload.plan,
        statut_abonnement=models.StatutAbonnement.ACTIF,
    )
    db.add(entreprise)
    db.commit()
    db.refresh(entreprise)
    return entreprise


@router.get("/", response_model=list[schemas.EntrepriseOut])
def lister_entreprises(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(models.RoleEnum.SUPER_ADMIN)),
):
    return db.query(models.Entreprise).all()


@router.get("/{entreprise_id}", response_model=schemas.EntrepriseOut)
def obtenir_entreprise(
    entreprise_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Consultable par tout utilisateur connecte appartenant a cette
    entreprise, ou par le Super Admin pour n'importe laquelle -- utile
    par exemple pour qu'un DRH retrouve les infos de sa propre entreprise.
    """
    entreprise = db.query(models.Entreprise).filter(models.Entreprise.id == entreprise_id).first()
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")

    if current_user.role != models.RoleEnum.SUPER_ADMIN and current_user.entreprise_id != entreprise_id:
        raise HTTPException(status_code=403, detail="Acces refuse")

    return entreprise


@router.delete("/{entreprise_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_entreprise(
    entreprise_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(models.RoleEnum.SUPER_ADMIN)),
):
    """
    Reserve au Super Admin : supprime une entreprise et TOUTES ses
    donnees associees (utilisateurs, reponses aux questionnaires, scores
    calcules). Irreversible -- le frontend doit demander confirmation
    avant d'appeler cette route.
    """
    entreprise = db.query(models.Entreprise).filter(models.Entreprise.id == entreprise_id).first()
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")

    user_ids = [u.id for u in db.query(models.User.id).filter(models.User.entreprise_id == entreprise_id).all()]

    if user_ids:
        response_ids = [
            r.id for r in db.query(models.QuestionnaireResponse.id).filter(
                models.QuestionnaireResponse.user_id.in_(user_ids)
            ).all()
        ]
        if response_ids:
            db.query(models.ProductivityScore).filter(
                models.ProductivityScore.response_id.in_(response_ids)
            ).delete(synchronize_session=False)
            db.query(models.QuestionnaireResponse).filter(
                models.QuestionnaireResponse.user_id.in_(user_ids)
            ).delete(synchronize_session=False)
        db.query(models.User).filter(models.User.entreprise_id == entreprise_id).delete(synchronize_session=False)

    db.delete(entreprise)
    db.commit()

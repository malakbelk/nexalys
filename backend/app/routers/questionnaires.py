from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas, auth, calculation_engine
from app.database import get_db

router = APIRouter(prefix="/questionnaires", tags=["questionnaires"])


@router.post(
    "/soumettre",
    response_model=schemas.ProductivityScoreOut,
    status_code=status.HTTP_201_CREATED,
)
def soumettre_questionnaire(
    payload: schemas.QuestionnaireResponseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_active_subscription),
):
    """
    Soumet les reponses d'un employe aux 11 facteurs et calcule la
    Productivite Indexee via le moteur de calcul (regression + plafonnement
    + normalisation lineaire dans [30%, 87%]).

    Le plan CAPA n'est PAS calcule ni renvoye ici : il est reserve au
    DRH/DG et se consulte separement via GET /questionnaires/{score_id}/capa,
    une fois l'entree apparue au tableau de bord entreprise.

    Necessite un abonnement actif.
    """
    entreprise = current_user.entreprise
    if entreprise is None:
        raise HTTPException(status_code=400, detail="Aucune entreprise associee a cet utilisateur")

    response = models.QuestionnaireResponse(
        user_id=current_user.id,
        absenteisme=payload.absenteisme,
        remuneration=payload.remuneration,
        qualite=payload.qualite,
        comportement=payload.comportement,
        acces_info=payload.acces_info,
        reactivite=payload.reactivite,
        formation=payload.formation,
        competence=payload.competence,
        motivation=payload.motivation,
        besoins=payload.besoins,
        soutien=payload.soutien,
    )
    db.add(response)
    db.commit()
    db.refresh(response)

    # Determine quel jeu de formules utiliser selon la taille de l'entreprise
    taille = "grande" if entreprise.taille == models.TailleEntreprise.GRANDE else "petite"

    # Determine le segment (masculin/feminin/global) selon le genre de l'utilisateur
    genre = current_user.genre if current_user.genre in ("M", "F") else "global"

    factors = calculation_engine.FactorInputs(
        absenteisme=payload.absenteisme,
        remuneration=payload.remuneration,
        qualite=payload.qualite,
        comportement=payload.comportement,
        acces_info=payload.acces_info,
        reactivite=payload.reactivite,
        formation=payload.formation,
        competence=payload.competence,
        motivation=payload.motivation,
        besoins=payload.besoins,
        soutien=payload.soutien,
    )

    result = calculation_engine.compute_score(taille=taille, genre=genre, factors=factors)

    score = models.ProductivityScore(
        response_id=response.id,
        model_used=result["model_used"],
        raw_score=result["raw_score"],
        normalized_score=result["score_indexe"],
    )
    db.add(score)
    db.commit()
    db.refresh(score)

    return score


@router.get("/mon-historique", response_model=list[schemas.ProductivityScoreOut])
def mon_historique(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_active_subscription),
):
    """Module 9 (Historique et statistiques) -- version minimale : l'historique de l'utilisateur connecte."""
    scores = (
        db.query(models.ProductivityScore)
        .join(models.QuestionnaireResponse)
        .filter(models.QuestionnaireResponse.user_id == current_user.id)
        .order_by(models.ProductivityScore.computed_at.desc())
        .all()
    )
    return scores


@router.get("/tableau-de-bord-entreprise", response_model=list[schemas.ProductivityScoreAdminOut])
def tableau_de_bord_entreprise(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.require_role(
            models.RoleEnum.ADMIN_ENTREPRISE,
            models.RoleEnum.MANAGER,
            models.RoleEnum.DG,
            models.RoleEnum.DRH,
        )
    ),
):
    """
    Module 5 (Tableau de bord) -- version minimale : tous les scores de
    tous les employes de l'entreprise de l'utilisateur connecte, avec
    l'identite de l'employe pour chaque score. Reserve aux roles Admin
    entreprise, Manager, DG et DRH.
    """
    rows = (
        db.query(models.ProductivityScore, models.User)
        .join(models.QuestionnaireResponse, models.ProductivityScore.response_id == models.QuestionnaireResponse.id)
        .join(models.User, models.QuestionnaireResponse.user_id == models.User.id)
        .filter(models.User.entreprise_id == current_user.entreprise_id)
        .order_by(models.ProductivityScore.computed_at.desc())
        .all()
    )
    return [
        schemas.ProductivityScoreAdminOut(
            id=score.id,
            response_id=score.response_id,
            model_used=score.model_used,
            raw_score=score.raw_score,
            normalized_score=score.normalized_score,
            computed_at=score.computed_at,
            employee_name=user.full_name,
            employee_email=user.email,
        )
        for score, user in rows
    ]


@router.get("/{score_id}/capa", response_model=schemas.CapaOut)
def obtenir_plan_capa(
    score_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.require_role(
            models.RoleEnum.ADMIN_ENTREPRISE,
            models.RoleEnum.MANAGER,
            models.RoleEnum.DG,
            models.RoleEnum.DRH,
        )
    ),
):
    """
    Reserve au DRH/DG (et Admin entreprise / Manager) : recalcule et
    renvoie le plan CAPA d'un employe de SA PROPRE entreprise, a partir
    des reponses stockees pour cette entree d'historique.

    L'employe concerne ne peut jamais consulter cette route (elle est
    protegee par role), et le plan CAPA n'est jamais inclus dans la
    reponse que l'employe recoit en soumettant son questionnaire.
    """
    score = db.query(models.ProductivityScore).filter(models.ProductivityScore.id == score_id).first()
    if not score:
        raise HTTPException(status_code=404, detail="Entree introuvable")

    response = db.query(models.QuestionnaireResponse).filter(
        models.QuestionnaireResponse.id == score.response_id
    ).first()
    if not response:
        raise HTTPException(status_code=404, detail="Reponse introuvable")

    employe = db.query(models.User).filter(models.User.id == response.user_id).first()
    if not employe or employe.entreprise_id != current_user.entreprise_id:
        raise HTTPException(status_code=403, detail="Acces refuse")

    factors = calculation_engine.FactorInputs(
        absenteisme=response.absenteisme,
        remuneration=response.remuneration,
        qualite=response.qualite,
        comportement=response.comportement,
        acces_info=response.acces_info,
        reactivite=response.reactivite,
        formation=response.formation,
        competence=response.competence,
        motivation=response.motivation,
        besoins=response.besoins,
        soutien=response.soutien,
    )
    plan_capa = calculation_engine.generate_recommandations(factors)

    return schemas.CapaOut(
        score_id=score.id,
        employee_name=employe.full_name,
        employee_email=employe.email,
        plan_capa=plan_capa,
    )


@router.delete("/{score_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_entree_historique(
    score_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_active_subscription),
):
    """
    Supprime une entree d'historique (reponse + score associe).

    - Un Employe ne peut supprimer que ses propres entrees.
    - Un DRH peut supprimer n'importe quelle entree d'un membre de sa
      propre entreprise (nettoyage du tableau de bord entreprise).
    - Tous les autres roles : acces refuse.
    """
    score = db.query(models.ProductivityScore).filter(models.ProductivityScore.id == score_id).first()
    if not score:
        raise HTTPException(status_code=404, detail="Entree introuvable")

    response = db.query(models.QuestionnaireResponse).filter(
        models.QuestionnaireResponse.id == score.response_id
    ).first()
    proprietaire = db.query(models.User).filter(models.User.id == response.user_id).first() if response else None

    autorise = False
    if current_user.role == models.RoleEnum.EMPLOYE:
        autorise = proprietaire is not None and proprietaire.id == current_user.id
    elif current_user.role == models.RoleEnum.DRH:
        autorise = proprietaire is not None and proprietaire.entreprise_id == current_user.entreprise_id

    if not autorise:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas la permission de supprimer cette entree",
        )

    db.delete(score)
    if response:
        db.delete(response)
    db.commit()
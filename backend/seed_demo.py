"""
Script de simulation (seed) pour la demo MVP.

Cree :
  - un Super Admin (plateforme, aucune entreprise)
  - une entreprise fictive qui a deja "achete" un abonnement Nexalys
  - un DG et un DRH pour cette entreprise
  - 3 employes

Usage :
    python seed_demo.py

NB : ce script insere directement en base (comme create_super_admin.py),
pour la commodite de la demo. Dans un vrai parcours, seul create_super_admin.py
s'utilise hors API -- ensuite, le Super Admin cree l'entreprise et le DRH
via POST /entreprises/ et POST /utilisateurs/, et le DRH cree les employes
via POST /utilisateurs/employes.
"""
from datetime import datetime, timedelta

from app.database import SessionLocal, Base, engine
from app import models, auth

Base.metadata.create_all(bind=engine)

db = SessionLocal()

EMAIL_SUPER_ADMIN = "super.admin@nexalys.dz"
EMAIL_DG = "dg@ooredoo-demo.dz"
EMAIL_DRH = "admin@ooredoo-demo.dz"  # meme email que l'ancien "admin entreprise" -- role change en DRH
MOT_DE_PASSE = "demo1234"

try:
    if db.query(models.User).filter(models.User.email == EMAIL_DRH).first():
        print("L'entreprise de demonstration existe deja.")
        print("Rien a faire.")
    else:
        # 1. Super Admin (plateforme)
        super_admin = db.query(models.User).filter(models.User.email == EMAIL_SUPER_ADMIN).first()
        if not super_admin:
            super_admin = models.User(
                email=EMAIL_SUPER_ADMIN,
                hashed_password=auth.hash_password(MOT_DE_PASSE),
                full_name="Super Administrateur",
                role=models.RoleEnum.SUPER_ADMIN,
                entreprise_id=None,
            )
            db.add(super_admin)
            db.commit()

        # 2. L'entreprise cliente -- simule un abonnement Premium deja actif
        entreprise = models.Entreprise(
            nom="Ooredoo Algerie (Demo)",
            secteur="telecom",
            taille=models.TailleEntreprise.GRANDE,
            plan=models.PlanAbonnement.PREMIUM,
            statut_abonnement=models.StatutAbonnement.ACTIF,
            date_debut_abonnement=datetime.utcnow() - timedelta(days=30),
            date_fin_abonnement=datetime.utcnow() + timedelta(days=335),
        )
        db.add(entreprise)
        db.commit()
        db.refresh(entreprise)

        # 3. Le DG -- vue strategique, indicateurs globaux
        dg = models.User(
            email=EMAIL_DG,
            hashed_password=auth.hash_password(MOT_DE_PASSE),
            full_name="Yacine Ferhat",
            role=models.RoleEnum.DG,
            genre="M",
            entreprise_id=entreprise.id,
        )
        db.add(dg)

        # 4. Le DRH -- seul role autorise a creer des comptes Employe
        drh = models.User(
            email=EMAIL_DRH,
            hashed_password=auth.hash_password(MOT_DE_PASSE),
            full_name="Amine Belkacem",
            role=models.RoleEnum.DRH,
            genre="M",
            entreprise_id=entreprise.id,
        )
        db.add(drh)

        # 5. Quelques employes de demonstration (pour peupler le tableau de bord)
        employes_demo = [
            ("f.mansouri@ooredoo-demo.dz", "Fatima Mansouri", "F"),
            ("k.hadjadj@ooredoo-demo.dz", "Karim Hadjadj", "M"),
            ("s.bouzid@ooredoo-demo.dz", "Sara Bouzid", "F"),
        ]
        for email, nom, genre in employes_demo:
            employe = models.User(
                email=email,
                hashed_password=auth.hash_password(MOT_DE_PASSE),
                full_name=nom,
                role=models.RoleEnum.EMPLOYE,
                genre=genre,
                entreprise_id=entreprise.id,
            )
            db.add(employe)

        db.commit()

        print("Entreprise de demonstration creee avec succes.")
        print(f"  Entreprise : {entreprise.nom} (plan {entreprise.plan.value}, statut {entreprise.statut_abonnement.value})")
        print()
        print("  Comptes crees (mot de passe pour tous : demo1234) :")
        print(f"    Super Admin -> {EMAIL_SUPER_ADMIN}")
        print(f"    DG          -> {EMAIL_DG}")
        print(f"    DRH         -> {EMAIL_DRH}")
        print("    3 employes  -> voir le code de ce script pour la liste complete")
        print()
        print("Connectez-vous via POST /auth/login sur /docs, ou directement")
        print("depuis le frontend sur /connexion.")

finally:
    db.close()

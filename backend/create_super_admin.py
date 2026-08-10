"""
Script d'amorcage (bootstrap) -- cree le tout premier compte Super Admin.

Probleme classique de "oeuf et poule" : pour creer un utilisateur via
l'API, il faut deja etre authentifie en tant que Super Admin. Le tout
premier doit donc etre insere directement en base, hors API.

Usage :
    python create_super_admin.py
"""
from app.database import SessionLocal, Base, engine
from app import models, auth

Base.metadata.create_all(bind=engine)

db = SessionLocal()

EMAIL = "super.admin@nexalys.dz"
MOT_DE_PASSE = "changez-moi-immediatement"

try:
    existing = db.query(models.User).filter(models.User.email == EMAIL).first()
    if existing:
        print(f"Un Super Admin existe deja avec cet email : {EMAIL}")
        print("Rien a faire.")
    else:
        super_admin = models.User(
            email=EMAIL,
            hashed_password=auth.hash_password(MOT_DE_PASSE),
            full_name="Super Administrateur",
            role=models.RoleEnum.SUPER_ADMIN,
            genre=None,
            entreprise_id=None,  # le Super Admin n'appartient a aucune entreprise
        )
        db.add(super_admin)
        db.commit()

        print("Super Admin cree avec succes.")
        print(f"  Email : {EMAIL}")
        print(f"  Mot de passe : {MOT_DE_PASSE}")
        print()
        print("⚠️  Changez ce mot de passe avant tout usage reel.")
        print("Vous pouvez maintenant vous connecter et creer des entreprises")
        print("via POST /entreprises/ et d'autres comptes via POST /utilisateurs/.")
finally:
    db.close()

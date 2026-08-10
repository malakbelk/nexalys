from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, entreprises, questionnaires, utilisateurs

# Creates tables on startup if they don't exist yet.
# Fine for MVP; switch to Alembic migrations before production.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Nexalys API",
    description="Modele de calcul de la productivite du travail -- MVP",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # a restreindre avant la mise en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(entreprises.router)
app.include_router(questionnaires.router)
app.include_router(utilisateurs.router)


@app.get("/")
def racine():
    return {"statut": "ok", "service": "Nexalys API"}

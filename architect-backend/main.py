import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import synthesize, projects, chat, analyze_repo, clarify

load_dotenv()

app = FastAPI(title="Architect 2.0 API", version="2.0.0")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:4173",
    os.getenv("FRONTEND_URL", ""),
    "https://architect-2-0-taupe.vercel.app",
    "https://architect-2-0-git-main-vinodkumarprovab-6412s-projects.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

app.include_router(synthesize.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(analyze_repo.router, prefix="/api")
app.include_router(clarify.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}

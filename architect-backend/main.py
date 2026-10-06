import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import synthesize, projects, chat, analyze_repo, clarify

load_dotenv()

app = FastAPI(title="Architect 2.0 API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(synthesize.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(analyze_repo.router, prefix="/api")
app.include_router(clarify.router, prefix="/api")


@app.options("/{rest:path}")
async def preflight(rest: str):
    return {}


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}

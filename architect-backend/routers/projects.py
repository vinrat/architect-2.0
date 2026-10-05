import os
import httpx
from fastapi import APIRouter, Header, HTTPException

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


@router.get("/projects")
async def list_projects(authorization: str = Header(None)):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/projects?select=*&order=updated_at.desc&limit=20",
            headers=supabase_headers(),
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@router.post("/projects/{project_id}/deploy")
async def deploy_project(project_id: str):
    # Placeholder — wire to Railway/Vercel deploy webhook later
    return {
        "project_id": project_id,
        "status": "deploying",
        "message": "Deploy pipeline triggered. Connect Railway webhook to make this real.",
    }

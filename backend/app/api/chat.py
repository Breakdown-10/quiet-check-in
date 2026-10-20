from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.db.repositories import repo
from backend.app.agent.narrator import narrator_agent

router = APIRouter(prefix="/circles", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


@router.post("/{circle_id}/chat")
def family_chat(circle_id: str, req: ChatRequest):
    """
    Family conversational Q&A endpoint powered by Bedrock and Strands tools.
    Answers family questions about routine, events, and elder activity with gentle facts.
    """
    circle = repo.get_circle(circle_id)
    if not circle:
        raise HTTPException(status_code=404, detail="Care circle not found")

    reply = narrator_agent.answer_family_question(circle_id=circle_id, question=req.message)
    return {
        "circle_id": circle_id,
        "reply": reply
    }

from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.api.webhooks import router as webhooks_router
from backend.app.api.circles import router as circles_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.sim import router as sim_router
from backend.app.db.repositories import repo
from backend.app.clock import global_clock
from backend.app.core.ring_sim import RingTwinSimulator
from backend.app.engine.models import RingWebhookPayload, normalize_ring_payload
from backend.app.engine.baseline import extract_anchors_from_signals


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Seed demo care circle, devices, 21-day history, and baseline on startup."""
    circle_id = settings.DEMO_CIRCLE_ID
    offset = settings.DEFAULT_TIMEZONE_OFFSET

    if not repo.get_circle(circle_id):
        repo.register_circle(
            circle_id=circle_id,
            elder_name="Frank",
            timezone_name="America/Phoenix",
            offset_hours=offset
        )
        repo.register_device(
            circle_id=circle_id,
            device_id="doorbell_front",
            label="Front Doorbell",
            kind="doorbell"
        )
        repo.register_device(
            circle_id=circle_id,
            device_id="sensor_backdoor",
            label="Back Patio Door",
            kind="contact_sensor"
        )
        repo.register_device(
            circle_id=circle_id,
            device_id="sensor_medicine",
            label="Medicine Cabinet",
            kind="contact_sensor"
        )
        repo.register_device(
            circle_id=circle_id,
            device_id="motion_kitchen",
            label="Kitchen Motion Sensor",
            kind="motion_sensor"
        )

        # Pre-seed 21 days of history so demo starts with mature baseline
        sim = RingTwinSimulator(clock=global_clock)
        raw_history = sim.generate_history_backfill(days=21, offset_hours=offset)
        for event in raw_history:
            payload = RingWebhookPayload.model_validate(event)
            sig = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
            repo.store_signal(sig)

        all_signals = repo.get_signals_for_circle(circle_id)
        anchors = extract_anchors_from_signals(
            signals=all_signals,
            circle_id=circle_id,
            device_labels={
                "doorbell_front": "Front Doorbell",
                "sensor_backdoor": "Back Patio Door",
                "sensor_medicine": "Medicine Cabinet",
                "motion_kitchen": "Kitchen Motion Sensor"
            },
            lookback_days=21
        )
        repo.store_anchors(circle_id, anchors)


    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Privacy-First Ambient Routine Intelligence for Elder Care",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.app.api.chat import router as chat_router

# Mount routers under root (for local dashboard & PWA)
app.include_router(webhooks_router)
app.include_router(circles_router)
app.include_router(alerts_router)
app.include_router(sim_router)
app.include_router(chat_router)

# Mount routers under /api/v1 for API Gateway, SAM & Ring Reviewer specification compliance
app.include_router(webhooks_router, prefix="/api/v1")
app.include_router(circles_router, prefix="/api/v1")
app.include_router(alerts_router, prefix="/api/v1")
app.include_router(sim_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
from fastapi.responses import FileResponse
import os

STATIC_INDEX = os.path.join(os.path.dirname(__file__), "static", "index.html")


@app.get("/", response_class=FileResponse)
def serve_dashboard():
    return FileResponse(STATIC_INDEX)


@app.get("/healthz")
def healthz():
    return {"status": "ok", "service": settings.APP_NAME, "mode": "SIM"}


# AWS Lambda entrypoint for SAM deployment
try:
    from mangum import Mangum
    handler = Mangum(app)
except ImportError:
    def handler(event, context):
        return {"statusCode": 500, "body": "Mangum not installed"}


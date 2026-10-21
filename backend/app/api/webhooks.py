import json
import logging
from fastapi import APIRouter, Request, Response, status
from backend.app.config import settings
from backend.app.core.verifier import verify_ring_signature
from backend.app.engine.models import RingWebhookPayload, normalize_ring_payload
from backend.app.db.repositories import repo

logger = logging.getLogger("webhooks")
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/ring", status_code=status.HTTP_200_OK)
async def handle_ring_webhook(request: Request, response: Response):
    """
    Ingest Ring v1.1 Webhooks with HMAC-SHA256 signature verification over raw body bytes.
    Guarantees sub-5-second HTTP 200 response and idempotent deduplication via meta.request_id.
    """
    # 1. Read unparsed raw body bytes over the wire
    raw_body = await request.body()
    signature_header = request.headers.get("X-Signature") or request.headers.get("X-Ring-Signature")

    # 2. Verify HMAC-SHA256 signature using the shared secret
    if not verify_ring_signature(raw_body, signature_header, settings.RING_HMAC_KEY):
        logger.warning("Rejected webhook with invalid HMAC signature")
        response.status_code = status.HTTP_401_UNAUTHORIZED
        return {"error": "Invalid HMAC signature"}

    # 3. Parse JSON payload
    try:
        body_json = json.loads(raw_body.decode("utf-8"))
        payload = RingWebhookPayload.model_validate(body_json)
    except Exception as e:
        logger.error(f"Malformed webhook JSON: {e}")
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {"error": f"Invalid payload structure: {str(e)}"}

    request_id = payload.meta.request_id

    # 4. Deduplicate based on meta.request_id (Idempotency)
    if repo.is_request_processed(request_id):
        logger.info(f"Duplicate event ignored: {request_id}")
        return {"status": "already_processed", "request_id": request_id}

    repo.mark_request_processed(request_id)

    # 5. Normalize into internal Signal
    circle_id = settings.DEMO_CIRCLE_ID
    circle = repo.get_circle(circle_id)
    offset = circle["offset_hours"] if circle else settings.DEFAULT_TIMEZONE_OFFSET

    signal = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
    repo.store_signal(signal)

    # Auto-resolve any active alerts if ambient routine activity resumes
    resolved_alerts = repo.auto_resolve_active_alerts(circle_id, signal)
    if resolved_alerts:
        logger.info(f"Auto-resolved {len(resolved_alerts)} active alert(s) upon signal from {signal.device_id}")

    logger.info(f"Ingested signal: kind={signal.kind}, device={signal.device_id}, req={request_id}")
    return {
        "status": "processed",
        "request_id": request_id,
        "signal_kind": signal.kind.value,
        "device_id": signal.device_id
    }

import hmac
import hashlib


def verify_ring_signature(raw_body: bytes, header: str | None, signing_key: str) -> bool:
    """
    Verify Ring webhook HMAC-SHA256 signature against the raw HTTP body bytes.

    According to the Ring Amazon Vision API Specification:
    - Signature header format: 'sha256=<hex_digest>'
    - Key: UTF-8 encoded string (not base64 decoded)
    - Data: Exact raw request body bytes as received over the wire
    - Comparison: Constant-time comparison to prevent timing attacks
    """
    if not header or not signing_key or not isinstance(raw_body, bytes):
        return False

    received_sig = header.strip()
    if received_sig.startswith("sha256="):
        received_digest = received_sig[7:]
    else:
        received_digest = received_sig

    expected_digest = hmac.new(
        signing_key.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected_digest, received_digest)


def generate_ring_signature(raw_body: bytes, signing_key: str) -> str:
    """
    Generate a valid Ring X-Signature header value for a given raw body and secret.
    Used by the Ring Twin simulator and test fixtures.
    """
    digest = hmac.new(
        signing_key.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()
    return f"sha256={digest}"

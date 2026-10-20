import pytest
from backend.app.core.verifier import verify_ring_signature, generate_ring_signature


def test_valid_signature_verification():
    key = "sample_test_hmac_secret_key_123"
    raw_body = b'{"meta":{"version":"1.1","request_id":"req-001"},"data":{"type":"motion_detected"}}'
    
    header = generate_ring_signature(raw_body, key)
    assert header.startswith("sha256=")
    assert verify_ring_signature(raw_body, header, key) is True


def test_signature_without_prefix():
    key = "secret_key"
    raw_body = b'{"data": "test"}'
    header = generate_ring_signature(raw_body, key)
    digest_only = header.replace("sha256=", "")
    assert verify_ring_signature(raw_body, digest_only, key) is True


def test_tampered_body_fails():
    key = "secret_key"
    raw_body = b'{"amount": 100}'
    tampered_body = b'{"amount": 1000}'
    
    header = generate_ring_signature(raw_body, key)
    assert verify_ring_signature(tampered_body, header, key) is False


def test_whitespace_sensitivity():
    """Verify that formatting differences alter HMAC verification (confirming raw bytes requirement)."""
    key = "secret_key"
    body1 = b'{"key": "value"}'
    body2 = b'{"key":  "value"}'
    
    header = generate_ring_signature(body1, key)
    assert verify_ring_signature(body2, header, key) is False


def test_wrong_key_fails():
    key1 = "secret_key_1"
    key2 = "secret_key_2"
    raw_body = b'{"data": "test"}'
    
    header = generate_ring_signature(raw_body, key1)
    assert verify_ring_signature(raw_body, header, key2) is False


def test_empty_or_none_inputs():
    key = "secret_key"
    raw_body = b'{"data": "test"}'
    header = generate_ring_signature(raw_body, key)

    assert verify_ring_signature(raw_body, None, key) is False
    assert verify_ring_signature(raw_body, "", key) is False
    assert verify_ring_signature(raw_body, header, "") is False
    assert verify_ring_signature(None, header, key) is False

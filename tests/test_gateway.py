from backend.app.core.gateway import RingGateway
from backend.app.core.ring_sim_gateway import RingSimGateway
from backend.app.core.ring_live import RingLive


def test_ring_sim_gateway_conforms_to_protocol():
    sim_gw = RingSimGateway()
    assert isinstance(sim_gw, RingGateway)

    devices = sim_gw.list_devices()
    assert len(devices) == 2
    assert devices[0]["id"] == "doorbell_front"
    assert devices[1]["id"] == "sensor_backdoor"

    history = sim_gw.get_event_history(device_id="doorbell_front")
    assert isinstance(history, list)
    for event in history:
        assert event["data"]["attributes"]["source"] == "doorbell_front"

    tokens = sim_gw.refresh_access_token("any_refresh_token")
    assert "access_token" in tokens
    assert tokens["expires_in"] == 14400


def test_ring_live_conforms_to_protocol():
    live_gw = RingLive(
        access_token="test_token",
        client_id="test_client",
        client_secret="test_secret",
        hmac_key="test_key"
    )
    assert isinstance(live_gw, RingGateway)

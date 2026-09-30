from fastapi.testclient import TestClient

from f1_api.main import app


def test_health_and_capability_contract() -> None:
    client = TestClient(app)

    health = client.get("/health")
    capability = client.get("/api/v1/seasons/2010/capabilities")

    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
    assert capability.status_code == 200
    assert capability.json()["features"]["results"] is True
    assert capability.json()["features"]["telemetry"] is False

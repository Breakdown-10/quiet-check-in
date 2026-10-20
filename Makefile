.PHONY: install test eval demo sim clean

install:
	python -m pip install -r backend/requirements.txt
	python -m pip install -e ring-partner-kit

test:
	python -m pytest tests/ ring-partner-kit/tests/ -v

eval:
	python -m eval.harness

demo:
	python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

sim-morning-anomaly:
	python -c "import requests; r = requests.post('http://localhost:8000/api/v1/sim/time-travel', json={'action': 'jump', 'target_time_utc': '2026-10-15T10:30:00Z'}); print(r.json())"

sim-lunch-anomaly:
	python -c "import requests; r = requests.post('http://localhost:8000/api/v1/sim/time-travel', json={'action': 'jump', 'target_time_utc': '2026-10-15T15:00:00Z'}); print(r.json())"

sim-reset:
	python -c "import requests; r = requests.post('http://localhost:8000/api/v1/sim/time-travel', json={'action': 'reset'}); print(r.json())"

clean:
	python -c "import shutil, pathlib; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('__pycache__')]"
	python -c "import shutil, pathlib; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('.pytest_cache')]"

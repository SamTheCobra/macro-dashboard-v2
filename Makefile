.PHONY: start backend frontend stop

backend:
	. .venv/bin/activate && uvicorn backend.main:app --reload

frontend:
	cd frontend && npm run dev

start:
	trap 'kill 0' INT TERM; \
	(. .venv/bin/activate && uvicorn backend.main:app --reload) & \
	(cd frontend && npm run dev) & \
	wait

stop:
	-pkill -f 'uvicorn backend.main:app'
	-pkill -f 'vite'

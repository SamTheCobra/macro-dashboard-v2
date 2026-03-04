.PHONY: start backend frontend stop

start:
	trap 'kill 0' SIGINT; make backend & make frontend & wait

backend:
	source .venv/bin/activate && uvicorn backend.main:app --reload

frontend:
	cd frontend && npm run dev

stop:
	pkill -f uvicorn; pkill -f vite

dev:
	docker compose up --build dev

dev-d:
	docker compose up --build -d dev

prod:
	docker compose up --build prod

prod-d:
	docker compose up --build -d prod
	
stop:
	docker compose down

network:
	docker network create data-collector-network
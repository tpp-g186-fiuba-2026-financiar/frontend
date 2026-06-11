up:
	docker compose build --no-cache
	docker compose up
	
down:
	docker compose down

network:
	docker network create financiar_shared_network
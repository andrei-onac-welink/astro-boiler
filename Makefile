.DEFAULT_GOAL := help
.PHONY: help install up build restart stop down check validate

ifneq (,$(wildcard .env))
include .env
export
endif

DOCKER_COMPOSE := docker compose
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m

help: ## Show this help message
	@echo '${GREEN}Astro - Available commands:${NC}'
	@echo ''
	@awk 'BEGIN {FS = ":.*##"; printf "\033[36m%-25s\033[0m %s\n", "Command", "Description"} /^[a-zA-Z_-]+:.*?##/ { printf "\033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

install: ## Install dependencies in Docker
	@$(DOCKER_COMPOSE) run --rm astro npm ci

##@ Docker commands

up: ## Start Astro development through Traefik
	@echo "${YELLOW}Starting Astro...${NC}"
	@$(DOCKER_COMPOSE) up -d
	@echo "${GREEN}Astro is running at https://$(PROJECT_NAMESPACE)-astro.localhost${NC}"

build: ## Build Docker containers
	@$(DOCKER_COMPOSE) build

restart: ## Restart the Astro container
	@$(DOCKER_COMPOSE) restart astro

stop: ## Stop containers without removing them
	@$(DOCKER_COMPOSE) stop

down: ## Stop and remove containers
	@$(DOCKER_COMPOSE) down

##@ Validation

check: ## Run Astro and TypeScript checks
	@$(DOCKER_COMPOSE) run --rm astro npm run check

validate: ## Run the complete local validation suite
	@$(DOCKER_COMPOSE) run --rm astro npm run validate

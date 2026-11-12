.DEFAULT_GOAL := help

.PHONY: help dev lint

help:
	@printf 'Comandos disponíveis:\n  make help  Exibe esta ajuda\n  make dev   Inicia o servidor de desenvolvimento\n  make lint  Verifica tipos e formatação\n'

dev:
	npm run dev

lint:
	npm run check
	npm run format:check

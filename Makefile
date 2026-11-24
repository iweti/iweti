.DEFAULT_GOAL := help

.PHONY: help dev lint

help:
	@printf '%s\n' \
		'Comandos disponíveis:' \
		'  make help  Exibe esta ajuda' \
		'  make dev   Inicia o servidor de desenvolvimento' \
		'  make lint  Verifica tipos e formatação'

dev:
	npm run dev

lint:
	npm run check
	npm run format:check

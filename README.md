# PitchLab — Implementação (Fullstack Pleno)

Esta é uma implementação funcional mínima do desafio **PitchLab**.

## Stack
- **API**: Node.js, TypeScript, Express, Socket.IO, Prisma (PostgreSQL), Zod, Pino, express-rate-limit
- **APP**: Next.js (App Router), Tailwind CSS, Socket.IO Client, Zustand
- **IA (Groq)**: chamada feita no back-end (`/api/src/ai/groq.ts`). Se `GROQ_API_KEY` não estiver definida, a API retorna respostas *mockadas* (útil para desenvolvimento offline).

## Requisitos atendidos
- Salas: criar, listar e ingressar.
- Mensagens: chat em tempo real por sala com persistência (Socket.IO + Prisma).
- Ideias: criação e votos em tempo real, vinculadas à sala.
- IA: endpoints para **resumo**, **tags** e **pitch** (persistência como mensagens do papel `assistant`).
- Paginação (cursor) para mensagens.
- CORS restrito via `APP_ORIGIN`.
- Health-check: `GET /health`.

## Como rodar (desenvolvimento local sem Docker)
1. Criar Postgres local e obter a URL (ou usar o compose do repositório original).
2. Copiar `.env.example` para `.env` em `/api` e `/app` e preencher as variáveis.
3. Instalar dependências e rodar migrações:
   ```bash
   cd api
   npm i
   npx prisma generate
   npx prisma migrate dev --name init
   npm run dev
   ```
4. Em outro terminal, rodar o app:
   ```bash
   cd app
   npm i
   npm run dev
   ```
5. Acessar o front-end: `http://localhost:3000`.

## Rotas principais (API)
- `GET /health`
- `GET /rooms` / `POST /rooms`
- `POST /rooms/:roomId/join`
- `GET /rooms/:roomId/messages?limit=20&cursor=<id>`
- `POST /rooms/:roomId/messages` (body: `{ authorName, content, triggerAI? }`)
- `POST /rooms/:roomId/ideas` (body: `{ content, messageId? }`)
- `POST /ideas/:ideaId/vote`

## Eventos Socket.IO
- `join_room` (payload: `{ roomId, name }`)
- `new_message` (broadcast)
- `typing` (indicador “digitando…”)
- `new_idea` (broadcast)
- `vote_idea` (broadcast)
- `new_summary` (broadcast de respostas IA)

## Scripts úteis
- API: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run test` (placeholder)
- APP: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`

## Observações
- O schema Prisma cobre: **User**, **Room**, **Message**, **Idea**, **Tag**, **MessageTag**, **IdeaVote**.
- JWT simples não implementado (poderia ser adicionado como diferencial).
- Testes deixados como placeholder para foco no fluxo principal.

---

## Itens adicionados agora
- Dockerfiles para API e APP
- CI básico no GitHub Actions (lint/build)
- Teste `vitest` de fumaça na API
- `.gitignore` e `.eslintrc.json`
- Coleção `.http` de exemplo para a API

## Novidades
- Persistência de **Tags** (IA → Tag/MessageTag) e endpoints `/rooms/:roomId/tags` e `/messages/:messageId/tags`.
- Teste de integração Socket.IO (`api/tests/socket.spec.ts`).

# URL Shortener

Um encurtador de URLs simples: cria links curtos, redireciona através deles rastreando cliques, e exibe analytics (total de cliques, cliques por dia, top referrers) numa página compartilhável.

## Stack

- **Next.js 15 (App Router) + TypeScript + React 19** — um único projeto serve tanto a API HTTP (Route Handlers) quanto a UI de analytics (um Server Component), então há apenas um dev server, um build, e nenhuma separação entre backend/frontend.
- **Store em memória com persistência em arquivo** (`data/db.json`, via `fs` do Node) em vez de um banco de dados — todas as leituras são servidas a partir de um `Map` em processo, e toda escrita (novo link, novo clique) é persistida de forma síncrona em disco. O store é recarregado na memória ao iniciar o processo. Isso garante durabilidade entre restarts sem depender de nenhum motor de banco externo. É um trade-off deliberado e documentado para este escopo (processo único, sem segurança para escritores concorrentes) — ver `specs/001-url-shortener/research.md` para a justificativa completa e as alternativas consideradas (SQLite, Redis, em memória pura).
- **nanoid** para geração dos códigos curtos (7 caracteres, alfanumérico e URL-safe, com checagem de colisão contra o store antes de aceitar um código).
- **Vitest** para testes unitários (`lib/`) e testes de integração (Route Handlers, chamados diretamente com objetos `Request` padrão da Web — sem necessidade de subir um servidor para testá-los).

A documentação completa de design está em `specs/001-url-shortener/` (spec, plano, pesquisa, modelo de dados, contratos de API, breakdown de tasks).

## Setup

```bash
npm install
```

## Rodando o projeto

```bash
npm run dev
```

Inicia a aplicação em `http://localhost:3000` (ou `$PORT`, se definida). O arquivo `data/db.json` é criado na primeira escrita.

## Testes

```bash
npm test
```

Roda a suíte completa de testes unitários + integração uma única vez via Vitest, encerrando com código de saída não-zero em caso de falha. Os testes apontam para um arquivo de dados temporário e isolado (`DB_FILE_PATH`), então nunca tocam no seu `data/db.json` local.

## API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/shorten` | Cria um link curto a partir de `{ url, expiresAt? }` |
| `GET` | `/:code` | Redireciona para a URL original (301); registra um clique. 404 se não existir, 410 se expirado |
| `GET` | `/api/urls` | Lista todos os links, mais recentes primeiro, com contagem de cliques |
| `GET` | `/api/stats/:code` | Estatísticas em JSON: total de cliques, cliques por dia (30 dias), top 5 referrers |
| `GET` | `/analytics/:code` | Página de analytics para visualização humana — os mesmos dados de `/api/stats/:code` |

Formato completo de request/response: `specs/001-url-shortener/contracts/api.md`.

## Fluxo de demonstração

```bash
curl -s -X POST http://localhost:3000/api/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/some/long/path"}'
# → { "shortCode": "...", "shortUrl": "http://localhost:3000/...", ... }

curl -sI http://localhost:3000/<shortCode>          # redirect 301, clique registrado
curl -sI -e "https://twitter.com/" http://localhost:3000/<shortCode>

open http://localhost:3000/analytics/<shortCode>    # totais, breakdown por dia, top referrers
```

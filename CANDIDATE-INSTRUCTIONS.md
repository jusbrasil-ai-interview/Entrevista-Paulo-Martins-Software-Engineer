# Desafio — URL Shortener (Senior + AI, ao vivo)

## Contexto

Você vai construir um URL shortener **do zero**, em um repositório novo, durante esta entrevista, usando AI livremente. A entrevista é desenhada pra engenheiros sêniores e parte do pressuposto de que você usa AI de forma intensiva no dia-a-dia.

A gente avalia tanto **o resultado** (funciona? está testado? roda?) quanto **o processo** (como você dirige a AI, onde você intervém, onde você desconfia). Quanto mais avançado for seu uso da ferramenta, melhor — mas não monte um teatro: queremos ver seu fluxo real.

## Formato

- **Duração:** 1h ao vivo, com a gente acompanhando.
- **Repositório:** crie um novo (local ou GitHub, tanto faz) no início da call.
- **Stack:** livre. Justifique no momento da escolha.
- **Ferramentas:** qualquer AI, qualquer IDE, qualquer combinação.

## O Problema

Construa um serviço de URL shortener com:

1. **API HTTP** para criar, redirecionar e consultar links curtos.
2. **Tracking de cliques** com dados suficientes pra alimentar uma página de analytics.
3. **Página visual de analytics** acessível pelo browser e fácil de compartilhar com quem criou o link.
4. **Testes** (unitários e/ou de integração) que rodem com um comando.

## Requisitos Funcionais

Endpoints (nomes e contratos são sugestão — pode adaptar se justificar):

- `POST /api/shorten` — recebe `{ url, expiresAt? }`, devolve `{ shortCode, shortUrl, originalUrl, createdAt, expiresAt }`. Retorna 400 pra URL inválida (somente `http`/`https`).
- `GET /:code` — redireciona (301) para a URL original. Retorna 404 se não existir e 410 se expirou. **Cada acesso registra um clique** com `referrer`, `user-agent`, `ip` e timestamp.
- `GET /api/urls` — lista os links criados (mais recentes primeiro) com a contagem de cliques.
- `GET /api/stats/:code` — devolve `totalClicks`, `clicksByDay` (últimos 30 dias) e `topReferrers`.
- Página `/analytics/:code` (ou equivalente) — interface visual mostrando total de cliques, cliques por dia (gráfico ou tabela) e top referrers.

Regras de negócio:

- Short code com ~7 caracteres alfanuméricos.
- `expiresAt` é opcional. Se setado, o redirect respeita a expiração.
- Validação de URL: somente `http://` e `https://`.

## Requisitos Não-Funcionais

- **Roda com um comando** depois de `install` (`npm run dev`, `pnpm dev`, `make run`, o que for).
- **Testes rodam com um comando** e passam no final.
- **README** curto com setup, como rodar e justificativa da stack.
- Persistência pode ser qualquer coisa (SQLite, Postgres, Redis, arquivo, em memória). Defenda sua escolha.

## Entregável Final

Ao fim da hora, queremos:

- Repo com o código e histórico de commits legível.
- Projeto rodando localmente.
- Testes passando.
- Um pequeno demo: criar um short link, clicar nele algumas vezes, abrir a página de analytics.

## Regras

- Use qualquer ferramenta de AI que quiser, em qualquer combinação. Quanto mais avançado o uso, melhor.
- Pode fazer perguntas a qualquer momento.
- Se um requisito parece ambíguo, escolha, justifique, e siga.
- Pense em voz alta — queremos entender suas decisões.

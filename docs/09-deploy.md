# 9. Deploy e Produção (Vercel + Neon Serverless)

A aplicação **Canhões do Ano** corre em infraestrutura serverless moderna, rápida e de alta disponibilidade, sem custos fixos desnecessários nem servidores locais para manter ligados.

```mermaid
flowchart TD
  User[Membro / Convidado] -->|https://canhoes.lol| Vercel[Vercel Edge & Serverless<br/>Next.js 16 App Router]
  Admin[Administrador] -->|Painel de Convites| Vercel
  Vercel -->|Emails via Resend API<br/>noreply@canhoes.lol| Resend[Resend Mail Delivery]
  Resend -->|Email com link de registo| User
  Vercel -->|Pooler PostgreSQL via @prisma/adapter-pg| Neon[(Neon Serverless PostgreSQL)]
  Vercel -->|Uploads locais/Blob| Storage[(Armazenamento)]
```

---

## 1. Arquitetura de Produção

| Componente | Fornecedor / Tecnologia | Função |
|---|---|---|
| **Alojamento & CDN** | [Vercel](https://vercel.com) | Build e hosting serverless de Next.js 16 (App Router + Turbopack). SSL automático e deploys instantâneos a cada merge em `main`. |
| **Base de Dados** | [Neon Serverless PostgreSQL](https://neon.tech) | PostgreSQL 16 gerido na cloud com connection pooling (`@prisma/adapter-pg`), auto-suspend, point-in-time recovery e backups automáticos. |
| **Envio de Emails** | [Resend](https://resend.com) | Entrega transacional dos convites de membros (`noreply@canhoes.lol`). |
| **Domínio e DNS** | `canhoes.lol` | Configurado no registador e ligado à Vercel (com registos MX/SPF/DKIM apontados ao Resend). |
| **Autenticação** | NextAuth v4 | Google OAuth 2.0 (com redirecionamento para `canhoes.lol`) e credenciais encriptadas (bcrypt) para membros convidados. |

---

## 2. Variáveis de Ambiente em Produção

Configuradas no dashboard da Vercel (**Settings → Environment Variables**):

| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | String de ligação pooled da base de dados Neon | `postgresql://user:pass@ep-....c-2.eu-west-2.aws.neon.tech/canhoesdb?sslmode=require` |
| `NEXTAUTH_URL` | URL público canónico da aplicação | `https://canhoes.lol` |
| `NEXTAUTH_SECRET` | Segredo aleatório para assinatura de tokens JWT de sessão | Gerado com `openssl rand -base64 32` |
| `ADMIN_EMAILS` | Lista de emails com privilégios de administração | `teu-email@gmail.com,outro-admin@gmail.com` |
| `GOOGLE_CLIENT_ID` | Client ID do Google Cloud Console | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Client Secret do Google Cloud Console | `GOCSPX-xxxx` |
| `RESEND_API_KEY` | Chave de API de envio da Resend | `re_xxxx` |
| `EMAIL_FROM` | Remetente dos convites | `Canhões do Ano <noreply@canhoes.lol>` |
| `CRON_SECRET` | Segredo do cron de limpeza das stories; a Vercel envia-o em `Authorization: Bearer …` | `openssl rand -base64 32` |
| `R2_BUCKET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Armazenamento das imagens no Cloudflare R2. Sem elas, os uploads vão para o disco da função da Vercel, que é efémero. O token tem de permitir escrever **e apagar** objetos | ver `.env.example` |
| `DATABASE_URL_UNPOOLED` | Ligação direta (sem `-pooler`) ao Neon, usada pelas migrations quando corres `prisma migrate deploy` da tua máquina | `postgresql://…@ep-….neon.tech/canhoesdb` |

> [!NOTE]
> Em produção, `DEV_AUTH_BYPASS_ENABLED` nunca deve estar ativo (`false` ou omitido).

---

## 3. Configuração de Domínio e DNS (`canhoes.lol`)

1. **Vercel**:
   - Em **Project Settings → Domains**, adiciona `canhoes.lol` e `www.canhoes.lol`.
   - Segue as instruções de registos DNS (geralmente registo `A` para `76.76.21.21` e `CNAME` para `cname.vercel-dns.com`).
2. **Resend (Email)**:
   - Adiciona o domínio `canhoes.lol` em **Domains** no Resend.
   - Copia os registos DNS fornecidos (`DKIM`, `SPF`, `DMARC`) para o painel de DNS do teu domínio.
   - Após validação (status: *Verified*), o sistema envia emails com alta reputação diretamente a partir de `noreply@canhoes.lol`.
3. **Google OAuth Console**:
   - Em **Google Cloud Console → Credentials → OAuth 2.0 Client IDs**:
     - **Authorized JavaScript origins**: `https://canhoes.lol`
     - **Authorized redirect URIs**: `https://canhoes.lol/api/auth/callback/google`

---

## 4. Pipeline de Deploy Contínuo (CI/CD)

O deploy para produção ocorre automaticamente através da integração GitHub ↔ Vercel:

1. Desenvolve e testa alterações numa branch de trabalho.
2. Corre o Quality Gate localmente (o CI da GitHub só corre `format:check`, `lint`, `tsc`, `test`, `test:component`, `knip` e `build`; os testes de integração, que cobrem a autorização das rotas, só correm aqui):
   ```bash
   npm run format:check
   npm run lint
   npx tsc --noEmit
   npm test
   npm run test:component
   npm run test:integration
   npm run knip
   npm run build
   ```
3. **Aplica as migrations novas antes de fundir.** O build da Vercel é só `next build` (`package.json`), por isso não as aplica. Faz primeiro um backup ou uma branch do Neon, ensaia lá e só depois corre `DATABASE_URL_UNPOOLED=<url direto de produção> npx prisma migrate deploy`. Se o código novo chegar a produção sem a tabela, as rotas que a usam dão 500. Confirma no painel da Vercel (**Settings → Build & Development**) se alguém acrescentou um passo de migrations ao Build Command.
4. Ao fundir o Pull Request em `main`, a Vercel deteta a alteração e inicia o build de produção com Turbopack; o novo build fica online em segundos.

---

## 5. Manutenção da Base de Dados e Migrations

As migrações são geridas pelo Prisma:
- **Novas migrações**: Desenvolvidas localmente (`npm run db:up` e `npx prisma migrate dev --name <nome>`).
- **Deploy em produção**: aplicadas à mão com `npx prisma migrate deploy` antes de fundir (ver §4); o build da Vercel não as corre.
- **Limpeza de teste/reset**: Script utilitário seguro `scripts/clean-prod.mjs` (apaga votos e dados transitórios de ensaio mantendo utilizadores admin e estrutura intactos).
- **Backups Neon**: O Neon mantém snapshots contínuos e backups automáticos acessíveis no dashboard do projeto.

---

## 6. Stories de 24 horas: limpeza e armazenamento

As stories guardam a imagem no R2 e expiram ao fim de 24 horas. Três camadas garantem que o bucket não cresce:

1. **Leitura:** as rotas só devolvem stories com `expiresAtUtc` no futuro, e a imagem só se serve por `/api/v1/events/[eventId]/stories/[storyId]/media` (sessão, membro do evento, sem cache). `/uploads/stories/*` devolve 404.
2. **Cron diário** (`vercel.json`, `0 4 * * *`): chama `GET /api/cron/stories-cleanup`, que apaga os ficheiros expirados e depois as linhas, por lotes até não haver mais, ao fim de 45 segundos (a rota tem `maxDuration = 60`) ou de 1000 stories. Uma falha deixa a linha para o dia seguinte e não trava as restantes. A Vercel Hobby só aceita crons diários e pode chamar a qualquer minuto dessa hora; precisa de `CRON_SECRET` definido, senão a rota recusa tudo (e regista um erro).
3. **Lifecycle do R2** (rede de segurança de custo, uma vez por bucket): em **Cloudflare → R2 → o bucket → Settings → Object lifecycle rules → Add rule**, prefixo `stories/`, apagar os objetos 2 dias depois de criados. Só a lifecycle apanha ficheiros que ficaram sem linha: uma falha entre gravar o ficheiro e a linha, ou apagar um utilizador ou um evento (a cascata apaga as linhas, não os ficheiros). Os prazos são em dias inteiros, por isso é custo, não privacidade: a privacidade vem da camada 1, que **só vale se o bucket for privado**: sem domínio público nem `r2.dev` ligado. Num bucket público a imagem continuaria acessível por URL até a lifecycle a apagar.

> [!NOTE]
> Em Docker ou local não há Vercel Cron nem lifecycle: as stories deixam de aparecer ao fim de 24 horas e os ficheiros de cada autor saem quando ele publica a seguinte, mas os de quem não voltar a publicar ficam em `UPLOADS_DIR`. Para os limpar a todos, chama a rota a partir do cron do servidor, por exemplo `curl -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3100/api/cron/stories-cleanup` (no `docker-compose.yml` a porta 3000 é o Caddy em HTTPS e a app está em `127.0.0.1:3100`; o `CRON_SECRET` tem de estar no `.env` que o compose lê, senão a rota recusa tudo).

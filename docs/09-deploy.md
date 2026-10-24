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
2. Corre o Quality Gate localmente:
   ```bash
   npm run format:check
   npm run lint
   npx tsc --noEmit
   npm test
   npm run test:component
   npm run knip
   npm run build
   ```
3. Ao fundir o Pull Request em `main`:
   - A Vercel deteta a alteração e inicia o build de produção com Turbopack.
   - As migrations de base de dados são aplicadas com `npx prisma migrate deploy`.
   - O novo build fica online em segundos com zero downtime.

---

## 5. Manutenção da Base de Dados e Migrations

As migrações são geridas pelo Prisma:
- **Novas migrações**: Desenvolvidas localmente (`npm run db:up` e `npx prisma migrate dev --name <nome>`).
- **Deploy em produção**: Aplicadas no deploy com `npx prisma migrate deploy`.
- **Limpeza de teste/reset**: Script utilitário seguro `scripts/clean-prod.mjs` (apaga votos e dados transitórios de ensaio mantendo utilizadores admin e estrutura intactos).
- **Backups Neon**: O Neon mantém snapshots contínuos e backups automáticos acessíveis no dashboard do projeto.

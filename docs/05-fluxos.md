# 5. Fluxos principais

## Convite e registo com password

O admin cria o convite e partilha o link à mão; a app não envia emails.

```mermaid
sequenceDiagram
  actor Admin
  actor Convidado
  participant API as API (Next.js)
  participant DB as PostgreSQL

  Admin->>API: POST /api/admin/invites { email, eventId }
  API->>DB: email já tem conta?
  alt já tem conta
    API-->>Admin: 400 USER_ALREADY_EXISTS
  else não tem
    API->>DB: upsert UserInvitation (token aleatório, expira em 7 dias)
    API-->>Admin: { inviteUrl: /canhoes/register?token=… }
  end
  Admin-->>Convidado: partilha o link (WhatsApp, etc.)
  Convidado->>API: POST /api/auth/register { token, password, displayName }
  API->>DB: convite existe, não usado, não expirado?
  API->>DB: transação: marca o convite como usado, cria o User com bcrypt(password), cria EventMember (participant) no evento do convite ou, sem evento, no evento ativo
  API-->>Convidado: 201 { email, displayName }
  Convidado->>API: login com email + password (NextAuth credentials)
```

## Login com Google

```mermaid
sequenceDiagram
  actor Pessoa
  participant NA as NextAuth
  participant Rules as decideSignIn
  participant DB as PostgreSQL

  Pessoa->>NA: entrar com Google
  NA->>DB: procura User por email ou id Google, e o convite desse email
  NA->>Rules: { isAdmin, isMember, wasInvited, hasOpenInvitation }
  alt admin, membro ou convite já usado
    Rules-->>NA: allow
  else convite aberto e válido
    Rules-->>NA: accept-invitation
    NA->>DB: transação: usa o convite, cria o User, cria EventMember
  else nada disto
    Rules-->>NA: deny
    NA-->>Pessoa: volta ao login com ?error=AccessDenied
  end
  NA->>DB: callback jwt relê o User (isAdmin atual)
  NA-->>Pessoa: sessão JWT (24 h)
```

## Mudança de fase

O admin muda a fase no painel; não há mudanças automáticas por data.

```mermaid
sequenceDiagram
  actor Admin
  participant API as PUT /admin/phase
  participant DB as PostgreSQL

  Admin->>API: { phaseType: "VOTING" }
  API->>DB: desativa as outras fases e ativa a desse tipo (cria-a, aberta por um ano, se ainda não existir)
  API->>DB: CanhoesEventState: nominationsVisible = (PROPOSALS), resultsVisible = (RESULTS)
  API-->>Admin: novo estado do evento
  Note over API,DB: Os módulos visíveis a membros mudam no pedido seguinte (RN-04)
```

## Votar

```mermaid
sequenceDiagram
  actor Membro
  participant API as POST /votes
  participant Guards
  participant Voting as castVote
  participant DB as PostgreSQL

  Membro->>API: { categoryId, selectionId }
  API->>API: rate limit (5 pedidos por 10 s por IP)
  API->>Guards: requireUser + requireModule("voting")
  Guards-->>API: 403 se não for membro ou não estiver em VOTING
  API->>Voting: castVote
  Voting->>DB: fase VOTING ativa e dentro das datas?
  Voting-->>API: 409 VOTING_CLOSED se não
  Voting->>DB: categoria ativa deste evento?
  alt categoria de pessoa (kind = 1)
    Voting->>DB: alvo é membro não admin do evento?
    Voting->>DB: upsert UserVote (um por categoria)
  else categoria de nomeação (kind = 0)
    Voting->>DB: nomeação aprovada desta categoria?
    Voting->>DB: upsert Vote (um por categoria)
  end
  Voting-->>Membro: { categoryId, selectionId }
```

## Amigo secreto

```mermaid
stateDiagram-v2
  direction TB
  [*] --> SemSorteio
  SemSorteio --> Escondido : admin sorteia (mínimo 2 membros)
  Escondido --> Escondido : admin repete o sorteio
  Escondido --> Revelado : admin revela
  Revelado --> Revelado : sortear de novo dá 409 DRAW_REVEALED

  SemSorteio : Sem sorteio
  SemSorteio : membros não veem nada
  Escondido : Sorteado, escondido
  Escondido : só o admin vê o estado
  Revelado : Revelado
  Revelado : cada membro vê a quem dá o presente
```

O algoritmo (`lib/domains/secretSanta/services/draw.ts`) baralha os membros com Fisher-Yates e liga cada um ao seguinte, o último ao primeiro. Isso forma um único ciclo: ninguém tira o próprio nome e não há grupos fechados.

## Ciclo de vida de uma proposta ou nomeação

Vale para nomeações, stickers, propostas de categoria e propostas de medida.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> pending : membro submete (só em PROPOSALS)
  pending --> approved : admin aprova
  pending --> rejected : admin rejeita
  approved --> rejected : admin muda de ideias
  rejected --> approved : admin muda de ideias
  approved --> [*]
```

Ao aprovar uma proposta de categoria ou de medida, a app cria a `AwardCategory` ou a `GalaMeasure` correspondente, só na primeira aprovação. Ao aprovar uma nomeação, ela passa a aparecer na página de nomeações e no boletim da sua categoria.

## Publicar no mural com imagens

```mermaid
sequenceDiagram
  actor Membro
  participant Up as POST /feed/uploads
  participant Posts as POST /feed/posts
  participant Disk as UPLOADS_DIR
  participant DB as PostgreSQL

  Membro->>Up: até 4 imagens (multipart)
  Up->>Disk: valida tipo e tamanho, grava com nome aleatório
  Up->>DB: HubPostMedia (sem post ainda)
  Up-->>Membro: URLs /uploads/...
  Membro->>Posts: { text, mediaUrls, pollQuestion?, pollOptions? }
  Posts->>DB: HubPost + sondagem + liga as imagens ao post
  Posts-->>Membro: 201 post criado
```

## Stories de 24 horas

```mermaid
sequenceDiagram
  actor Membro
  participant API as POST /stories
  participant Store as R2 (ou UPLOADS_DIR)
  participant DB as PostgreSQL
  participant Media as GET /stories/:id/media
  participant Cron as Vercel Cron (diário)

  Membro->>API: imagem já comprimida no browser (multipart, até 4 MB)
  API->>Store: valida tipo e assinatura, grava em stories/<eventId>/
  API->>DB: lock por membro e evento, conta as ativas (máx. 10), cria a Story
  Note over API,Store: se a linha falhar, o ficheiro é apagado
  API-->>Membro: 201 { id, expiresAtUtc }
  Membro->>Media: <img src=mediaUrl> (sessão, sem cache)
  Media->>DB: só se pertence ao evento, não expirou e o autor ainda está nele
  Media-->>Membro: a imagem, Cache-Control: private, no-store
  Cron->>Store: apaga os ficheiros expirados
  Cron->>DB: depois apaga as linhas (uma falha repete-se no dia seguinte)
```

A faixa de stories do mural mostra o grupo todo: primeiro quem tem stories (com um anel na sua cor), depois os restantes membros. O visualizador avança sozinho a cada 5 segundos, exceto com `prefers-reduced-motion`, em que só avança ao tocar. No telemóvel: tocar à esquerda volta e à direita avança; premir e manter pára a story e esconde o topo (largar retoma); deslizar para baixo fecha (o ecrã acompanha o dedo); deslizar para os lados salta para o membro seguinte ou anterior. `/uploads/stories/*` devolve 404: a imagem só se vê pela rota do evento.

No cliente, a lista de stories atualiza-se de 3 em 3 minutos e quando o separador volta a ser visto. Antes de enviar, a imagem é sempre recodificada no navegador (WebP ou JPEG, lado maior até 1600 px), o que tira os metadados da foto (GPS, EXIF); se o navegador não conseguir, a story não se publica, em vez de enviar o original. Os GIF são recusados. O envio tem um limite de 60 segundos. Ao publicar, saem também as stories já expiradas do próprio autor, para que instalações sem cron (Docker, local) não acumulem ficheiros dele.

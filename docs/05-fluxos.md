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
  API->>DB: transação: marca o convite como usado, cria o User com bcrypt(password), cria EventMember (participant)
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
  API->>DB: ativa a EventPhase desse tipo, desativa as outras
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
  direction LR
  [*] --> SemSorteio
  SemSorteio --> Escondido : admin sorteia (mínimo 2 membros)
  Escondido --> Escondido : admin repete o sorteio
  Escondido --> Revelado : admin revela
  Revelado --> Revelado : sortear de novo dá 409 DRAW_REVEALED

  SemSorteio : membros não veem nada
  Escondido : só o admin vê o estado
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

Ao aprovar uma proposta de categoria, o admin cria a `AwardCategory` correspondente. Ao aprovar uma nomeação, ela passa a aparecer na página de nomeações e no boletim da sua categoria.

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

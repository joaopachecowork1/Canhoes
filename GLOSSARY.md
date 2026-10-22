# Glossário de Domínio — Canhões do Ano

Este glossário estabelece a **Linguagem Ubíqua (*Ubiquitous Language*)** do projeto **Canhões do Ano**. 
Todos os termos aqui definidos devem ser usados de forma consistente no código (variáveis, modelos Prisma, rotas da API), nos testes, na interface com o utilizador e nas decisões de produto.

---

## 1. Identidade e Participantes

### Utilizador (`User`)
- **Definição**: Uma conta de acesso ao sistema (autenticada via Google OAuth ou credenciais por convite).
- **Atributos canónicos**: Email, nome de exibição (`displayName`), cor pessoal (`color`).
- **Distinção**: Um `User` existe independentemente de qualquer edição do evento; só se torna ativo no contexto de um ano quando associado como `EventMember`.

### Membro (`EventMember`)
- **Definição**: A participação efetiva de um `User` numa edição específica de um `Event`.
- **Papéis (`Role`)**:
  - `MEMBER` (ou `participant`): Participante com direito a publicar no mural, votar, propor nomeações e entrar no Amigo Secreto.
  - `ADMIN`: Membro com privilégios de moderação, controlo de fases, gestão de convites e apuramento de resultados.

### Cor Pessoal (`PersonColor`)
- **Definição**: Uma de 8 cores semânticas da paleta dos Canhões (`coral`, `amber`, `teal`, `blue`, `pink`, `lime`, `violet`, `sky`).
- **Finalidade**: Identifica visualmente o membro na moldura do seu cromo, avatar e menções, garantindo contraste contra o fundo escuro da caderneta.

### Convite (`UserInvitation`)
- **Definição**: Token único de acesso gerado por um administrador para integrar um novo membro no evento.

---

## 2. Evento e Ciclo de Vida

### Evento / Edição (`Event`)
- **Definição**: O contentor principal de um ano do grupo (ex.: *"Canhões 2026"*). Isola todo o histórico, votações, publicações e resultados.

### Fase do Evento (`EventPhase`)
- **Definição**: O estado temporal ativo da edição. Controla que módulos estão abertos ou trancados para os membros comuns.
- **Fases canónicas**:
  - `SETUP`: Preparação da edição, configuração de categorias e convite a membros.
  - `NOMINATIONS`: Fase aberta à submissão de nomeações e propostas de medidas.
  - `VOTING`: Fase de voto oficial secreto nas categorias da Gala.
  - `GALA`: A noite do evento; revelação e apresentação de vencedores.
  - `CONCLUDED`: Evento terminado e arquivado para consulta histórica.

---

## 3. Mural Social e Comunidade

### Publicação (`HubPost`)
- **Definição**: Mensagem partilhada no mural da edição, que pode conter texto, carrossel de imagens, sondagens ou convívios.
- **Interações**:
  - **Upvote / Downvote**: Pontuação comunitária calculada pela diferença entre votos positivos e negativos.
  - **Comentário (`HubPostComment`)**: Resposta em fio (*thread*) a uma publicação.

### Convívio (`EventGathering`)
- **Definição**: Um tipo especializado de publicação do mural criado para agendar encontros físicos do grupo.
- **Mecanismos**:
  - Votação de opções de data.
  - Confirmação de presença / RSVP (*Vou*, *Talvez*, *Não posso*).

---

## 4. Gala, Categorias e Votação

### Categoria de Prémio (`AwardCategory`)
- **Definição**: Um galardão disputado na Gala do evento.
- **Tipos de Categoria (`Kind`)**:
  - `NOMINEE` (0): Nomeações aprovadas de momentos/feitos com título e imagem de prova.
  - `USER_VOTE` (1): Votação direta em membros do evento.
  - `STICKER` (2): Galardão para o melhor sticker/cromo submetido.

### Nomeação (`Nominee`)
- **Definição**: Um concorrente proposto para uma categoria do tipo `NOMINEE`.
- **Estados**:
  - `PENDING`: Aguarda validação da moderação/admin.
  - `APPROVED`: Oficialmente a concurso para votação dos membros.
  - `REJECTED`: Recusado pela moderação.

### Voto Oficial (`Vote` / `UserVote`)
- **Definição**: A escolha individual e secreta de um membro numa categoria durante a fase de votação. Cada membro só tem um voto por categoria.

---

## 5. Amigo Secreto

### Amigo Secreto (`SecretSantaDraw`)
- **Definição**: O sorteio fechado que atribui a cada participante um destinatário secreto para troca de prendas.

### Atribuição (`SecretSantaAssignment`)
- **Definição**: O par dador (`giver`) e recetor (`receiver`) gerado pelo algoritmo do sorteio.

### Lista de Desejos (`WishlistItem`)
- **Definição**: Artigos sugeridos por cada membro para orientar quem lhe calhou no Amigo Secreto.

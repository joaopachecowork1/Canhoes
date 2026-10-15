export const adminCopy = {
  controlStrip: {
    kicker: "Admin operacional",
    title: "Painel operacional",
    description:
      "Evento ativo, fase, fila e visibilidade num painel curto para decisões rápidas no telemóvel.",
    clearQueue: "Fila limpa",
    refresh: "Atualizar painel",
    activeEventFallback: "Sem edição ativa",
    membersSummary: "membros nesta edição",
    metrics: {
      pending: "Pendentes",
      categories: "Categorias ativas",
      members: "Membros",
      votes: "Votos registados",
    },
  },
  dashboard: {
    pulseKicker: "Ritmo da edição",
    queueKicker: "Decisões por fechar",
    recentKicker: "Arquivo recente",
    queueTitle: "Há aprovações para fechar nesta edição",
    recentTitle: "Nomeações recebidas mais recentemente",
  },
  shell: {
    backendHint: "Atualiza a edição ou confirma o backend antes de continuar a moderação.",
    more: {
      openAction: "Abrir mais áreas",
      kicker: "Mais áreas",
      title: "Atalhos do evento",
      description:
        "Separa mural social, participação oficial e admin sem alongar a navegação principal.",
      summaryLabel: "Atalhos",
      summaryTitle: "Áreas fora do dock",
      summaryDescription:
        "Abre áreas sociais, oficiais ou operacionais sem perder o contexto desta fase.",
      empty: "Não há outras áreas abertas nesta fase.",
      explore: "Explorar",
      exploreTitle: "Áreas abertas",
      exploreDescription:
        "Atalhos para áreas sociais e oficiais que ficam fora do dock principal.",
      admin: "Admin",
      adminSectionDescription:
        "Ferramentas operacionais reservadas a quem gere a edição.",
      adminTitle: "Painel operacional",
      adminDescription:
        "Fila, fases, visibilidade e resultados oficiais num único ponto de controlo.",
      adminAction: "Abrir painel",
      total: "Total",
      shortcuts: "atalhos",
    },
  },
  state: {
    sectionKicker: "Edição",
    sectionTitle: "Evento, fase e módulos desta edição",
    sectionDescription:
      "Junta contexto, configuração e visibilidade num único bloco de controlo.",
    contextKicker: "Contexto",
    contextTitle: "Evento ativo",
    contextDescription:
      "Escolhe a edição em curso e confirma rapidamente em que painel estás a operar.",
    activeEventLabel: "Evento ativo",
    currentEditionLabel: "Edição em curso",
    currentEditionDescription:
      "Trocar a edição atualiza a shell, a moderação e os módulos dos membros.",
    configurationKicker: "Configuração",
    configurationTitle: "Fase e calendário",
    configurationDescription:
      "Muda a fase aberta, acompanha o calendário e percebe quantos módulos estão ativos.",
    phaseLabel: "Fase ativa",
    visibleModulesLabel: "Módulos visíveis",
    visibleModulesDescription: "O que o grupo vê agora",
    pendingLabel: "Pendentes",
    pendingDescription: "Itens por rever",
    phaseClosesPrefix: "Fecha a",
    activeBadge: "Ativa",
    visibilityKicker: "Acesso",
    visibilityTitle: "Visibilidade dos módulos",
    visibilityDescription:
      "A fase manda no ritmo, mas o admin decide o que ainda fica aberto para o grupo.",
    visibilityActionsLabel: "Ações rápidas",
    enableAll: "Ativar todos",
    disableAll: "Desativar todos",
    saving: "A guardar...",
    groupCore: "Base da edição",
    groupCommunity: "Participação",
    groupFinale: "Reta final",
    nominationsVisible: "Nomeações visíveis",
    nominationsDescription:
      "Mostra as nomeações aos membros quando a fase já o permite.",
    resultsVisible: "Resultados visíveis",
    resultsDescription:
      "Liberta ranking e resultados fora da gala quando for preciso.",
    visibilityRuleTitle: "Regra de visibilidade",
    visibilityRuleDescription:
      "Estes toggles escondem módulos mesmo quando a fase já os permitir. São ajuste fino, não substituem a fase ativa.",
    noState: "Falta uma edição ativa para abrir os controlos globais.",
  },
  categories: {
    createKicker: "Curadoria",
    createTitle: "Nova categoria",
    createDescription:
      "Abre categorias para esta edição sem sair do painel operacional.",
    manageKicker: "Gestao",
    manageTitle: "Categorias da edição",
    empty: "Esta edição ainda não tem categorias criadas.",
    historyKicker: "Arquivo",
    historyTitle: "Histórico de propostas",
    historyEmpty:
      "Ainda não chegaram propostas de categoria para esta edição.",
    title: "Categorias",
    description: "Gerir e modificar as categorias de prémio da edição.",
    expand: "Expandir lista",
    collapse: "Reduzir lista",
    loading: "A carregar categorias...",
    success: "Categoria sincronizada",
    edit: "Editar",
    error: {
      emptyName: "Por favor preencha o nome da categoria.",
      emptyDescription: "Por favor preencha a descrição da categoria.",
      tooLong: "O nome deve ter no máximo 80 caracteres.",
      tooLongDescription: "A descrição deve ter no máximo 200 caracteres.",
      invalidId: "ID invalido.",
    },
    maxNameLength: 80,
    maxDescriptionLength: 200,
  },
  secretSanta: {
    kicker: "Amigo secreto",
    title: "Sorteio desta edição",
    description:
      "O sorteio usa apenas os membros desta edição. Cada pessoa vê apenas a sua atribuição e a wishlist correspondente.",
    refresh: "Atualizar",
    draw: "Gerar sorteio",
    redraw: "Refazer sorteio",
    drawing: "A sortear...",
    editionLabel: "Edição",
    editionHint: "Contexto atual do sorteio",
    drawLabel: "Draw",
    drawReady: "Criado",
    drawMissing: "Por gerar",
    assignmentsLabel: "Atribuições",
    membersHintSuffix: "membros neste evento",
    statusLabel: "Estado",
    statusLocked: "Fechado",
    statusOpen: "Aberto",
    noDrawHint: "Sem sorteio criado",
    available: "Sorteio disponível",
    unavailable: "Sem sorteio",
    generatedSuffix: "atribuições geradas",
  },
  users: {
    title: "Membros",
    loading: "A carregar membros...",
    empty: "Nenhum membro encontrado nesta edição.",
    admins: "Admins desta edição",
    members: "Membros desta edição",
  },
  audit: {
    kicker: "Votos",
    title: "Registo de votos",
    loading: "A carregar auditoria...",
    empty: "Ainda não há votos registados nesta edição.",
    search: "Pesquisar por categoria, nomeado ou utilizador...",
  },
} as const;

export const feedCopy = {
  hero: {
    kicker: "Mural social",
    title: "Mural social da edição",
    description:
      "Publicações, imagens e sondagens rápidas para manter o grupo alinhado sem misturar o boletim oficial.",
    refresh: "Atualizar mural",
  },
  empty: {
    kicker: "Mural por abrir",
    title: "O mural social ainda não tem registos publicados",
    description:
      "Abre o mural com uma fotografia, um aviso rápido ou uma sondagem para o grupo.",
  },
  insights: {
    archive: {
      label: "Arquivo",
      description: "Publicações já registadas no mural desta edição.",
    },
    media: {
      label: "Momentos visuais",
      description: "Posts com imagem para dar mais contexto e memoria ao mural.",
    },
    polls: {
      label: "Sondagens do mural",
      description: "Perguntas rápidas do mural, separadas do boletim oficial.",
    },
    pinned: {
      label: "Destaques",
      description: "Posts fixados para segurar contexto no topo do mural.",
    },
  },
  composer: {
    kicker: "Novo post",
    title: "Publicar no mural social da edição",
    description:
      "Partilha uma nota, uma imagem ou uma sondagem curta para manter o grupo dentro do momento.",
    sheetTitle: "Novo registo",
    sheetDescription:
      "Partilha uma foto, um texto ou uma sondagem curta para manter o grupo dentro desta fase.",
    mediaLabel: "Imagens",
    pollLabel: "Sondagem",
    textLabel: "Texto",
    textPlaceholder:
      "Escreve uma nota rápida, um contexto para a gala ou um update para o grupo.",
    mediaSelected: "Imagens prontas",
    pollTitle: "Abrir uma sondagem no mural",
    pollDescription: "Define a pergunta e as opções. Isto não substitui o boletim oficial.",
    pollQuestionLabel: "Pergunta",
    pollQuestionPlaceholder:
      "Ex: Qual foi o momento mais improvável desta edição?",
    pollOptionsLabel: "Opções",
    pollOptionPlaceholder: "Opção",
    addOption: "Adicionar opção",
    authPrompt: "Para publicar no mural, inicia sessão.",
    signIn: "Entrar com Google",
    uploading: "A enviar imagens...",
    uploadingFallback: "A enviar...",
    unsupportedFormat: "formato não suportado",
    fileTooLargeLabel: "máximo",
    maxImagesLabel: "Máximo de imagens por post",
    optimizedLabel: "imagem(ns) otimizadas para upload rápido",
    published: "Post publicado",
    publishError: "Não foi possível publicar",
    mediaOrderLabel: "Ordem das imagens no post",
    moveLeft: "Mover imagem para a esquerda",
    moveRight: "Mover imagem para a direita",
    removeImage: "Remover imagem",
    removeOption: "Remover opção",
    helper:
      "Os melhores posts são curtos, claros e puxam resposta com uma imagem ou uma sondagem simples.",
    submit: "Publicar no mural",
  },
  post: {
    pinned: "Destaque do mural",
    closeComments: "Fechar",
    openComments: "Abrir conversa",
    commentCount: "comentarios",
    reactionCount: "reações",
  },
  comments: {
    empty: "Este registo ainda não tem respostas.",
    label: "Responder",
    placeholder: "Acrescenta contexto, piada interna ou detalhe útil para o grupo.",
    submit: "Enviar resposta",
  },
  media: {
    unavailable: "Imagem indisponível",
    detail:
      "O post ficou registado, mas o ficheiro ainda não está acessível no arquivo.",
  },
} as const;

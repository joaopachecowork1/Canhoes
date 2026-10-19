---
name: Canhões do Ano
description: A caderneta de cromos do grupo, em roxo-noite com verde de relvado e uma cor por pessoa.
colors:
  night-cover: "#170d22"
  album-card: "#24163a"
  album-panel: "#1d1230"
  album-page: "#2f2050"
  ink-lilac: "#f6f1ff"
  ink-lilac-soft: "#ddd2f0"
  ink-lilac-muted: "#b8a6d6"
  ink-ghost: "#8f7cb0"
  pitch-green: "#2fbf71"
  pitch-green-glow: "#5fe39a"
  on-pitch: "#0d1f14"
  on-person: "#170d22"
  danger-coral: "#ff6b6b"
  gold-wordmark: "#ffd166"
  person-coral: "#ff6b6b"
  person-amber: "#ffb547"
  person-teal: "#4fd1c5"
  person-blue: "#6c8cff"
  person-pink: "#f472b6"
  person-lime: "#a3e635"
  person-violet: "#b388ff"
  person-sky: "#38bdf8"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(1.85rem, 5vw, 2.55rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(1.35rem, 3vw, 1.9rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.01em"
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Atkinson Hyperlegible, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  body-small:
    fontFamily: "Atkinson Hyperlegible, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.05em"
rounded:
  sm: "0.75rem"
  md: "0.875rem"
  lg: "1rem"
  xl: "1.5rem"
  card: "1rem"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  touch: "44px"
components:
  button-primary:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-pitch}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.pitch-green-glow}"
  card:
    backgroundColor: "{colors.album-card}"
    textColor: "{colors.ink-lilac}"
    rounded: "{rounded.card}"
  empty-slot:
    backgroundColor: "{colors.night-cover}"
    textColor: "{colors.ink-lilac}"
    rounded: "{rounded.card}"
    padding: "40px 24px"
  filled-slot:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-pitch}"
    rounded: "{rounded.lg}"
    height: "56px"
  phase-pill:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-pitch}"
    rounded: "{rounded.sm}"
    height: "32px"
  area-tab:
    textColor: "{colors.on-person}"
    rounded: "{rounded.sm}"
    height: "32px"
  person-cromo:
    backgroundColor: "{colors.album-page}"
    rounded: "{rounded.md}"
    size: "40px"
  input:
    backgroundColor: "{colors.album-card}"
    textColor: "{colors.ink-lilac}"
    rounded: "{rounded.sm}"
    height: "44px"
---

# Design System: Canhões do Ano

## Overview

**Creative North Star: "A Caderneta de Cromos"**

O grupo é uma caderneta. Cada camarada é um cromo com a sua cor, cada categoria é uma página com lugares numerados, e participar é colar: publicar, nomear e votar enchem lugares. A capa é roxo-noite, o verde de relvado marca a fase, a ação principal e tudo o que já está colado, e o resto do arco-íris pertence às pessoas e às áreas, para que cada membro se reveja no aspeto.

O tom é de camaradagem, não de cerimónia. As superfícies são cartões elevados com sombra real sobre a capa escura, os alvos são grandes (44px) e as respostas ao toque são imediatas. Os estados lêem-se como marcas impressas: lugar vazio tracejado, lugar cheio sólido e preenchido. Recusa o feed social genérico de avatares redondos sobre cinzento.

**Key Characteristics:**
- Tema escuro único: capa roxo-noite, cartões elevados, texto lilás-claro.
- Verde de relvado reservado à fase, à ação principal e ao "colado".
- Uma cor por pessoa (`--person-*`) e uma cor por área (`--area-*`), nunca misturadas com o verde de estado.
- Letra condensada (Barlow Condensed) para títulos, números, etiquetas e nomes de cromo; Atkinson Hyperlegible para o texto corrido.
- Vazio tracejado, cheio sólido; o estado muda no próprio sítio.

## Colors

Uma capa roxa quase preta, um verde de relvado que só fala de estado, e oito cores de pessoa que também dão cor às áreas.

### Primary
- **Verde de Relvado** (#2fbf71, `--moss`): fase ativa, botão principal, lugar colado/voto escolhido, barra de progresso, anel de foco do botão. Texto sobre ele usa **Tinta de Relvado** (#0d1f14, `--on-moss`).
- **Verde de Relvado Claro** (#5fe39a, `--moss-glow`): hover do botão primário, ícones e ligações de acento, anel de foco global (`:focus-visible`, 2px).

### Secondary (cores de pessoa)
Cada membro veste uma; a base de dados guarda a chave (`lib/personColors.ts`) e o hex vive em `--person-<chave>`. Servem de moldura, iniciais e marcas do cromo. Texto sobre elas usa **Tinta de Pessoa** (#170d22, `--on-person`).
- **Coral** (#ff6b6b), **Âmbar** (#ffb547), **Turquesa** (#4fd1c5), **Azul** (#6c8cff), **Rosa** (#f472b6), **Lima** (#a3e635), **Violeta** (#b388ff), **Céu** (#38bdf8).

### Tertiary (cores de área)
Cada área mantém uma cor no cabeçalho, no dock e na página (`--area-*`, resolvida por `areaColorVar`): mural turquesa, votação verde de relvado, nomeações âmbar, categorias azul, gala rosa, amigo secreto coral, wishlist violeta, stickers lima, medidas céu, admin lilás-muted.

### Neutral
- **Capa Roxo-Noite** (#170d22, `--color-bg-base`): fundo da página e do `html`.
- **Cartão do Álbum** (#24163a, `--color-bg-elevated`): cartões, cabeçalho, dock, inputs.
- **Painel Escuro** (#1d1230, `--color-panel`): base dos painéis de abas e contentores.
- **Página do Álbum** (#2f2050, `--page`): miolo do cromo da pessoa.
- **Lilás Tinta** (#f6f1ff), **Lilás Suave** (#ddd2f0), **Lilás Apagado** (#b8a6d6), **Lilás Fantasma** (#8f7cb0): texto primário, secundário, atenuado e fantasma.
- **Fio Lilás** (rgba(196,170,240,0.16) e 0.34 forte, `--color-border` / `--color-border-strong`): bordas de cartão e de lugar vazio.
- **Coral de Perigo** (#ff6b6b, `--color-danger`): erros e ações destrutivas.
- **Dourado do Nome** (#ffd166, `text-canhoes-gold`): apenas o nome "Canhões do Ano" no cabeçalho.

### Named Rules
**A Regra do Verde Só de Estado.** O verde de relvado significa fase, ação principal ou "colado". Nunca decora uma área nem uma pessoa; a votação usa-o como cor de área porque votar é colar.

**A Regra Uma Cor, Um Dono.** Cada cor de pessoa pertence a um membro, cada cor de área a uma área. Não se reutiliza uma cor de pessoa como sinal de estado.

**A Regra do Texto Sobre Cor.** Texto sobre verde usa `--on-moss`, sobre cor de pessoa ou de área usa `--on-person`; nunca lilás claro sobre cor viva.

## Typography

**Display Font:** Barlow Condensed (600, 700, 800; fallback sans-serif; `--font-display`)
**Body Font:** Atkinson Hyperlegible (400, 700; fallback sans-serif; `--font-body`)
**Label Font:** Barlow Condensed (`--font-mono` é só um alias de `--font-display`)

**Character:** A condensada dá o ar de número e etiqueta impressa nos cromos; a Atkinson, desenhada para legibilidade, carrega o texto corrido no telemóvel. As fontes estão no repositório (`app/fonts`), carregadas com `next/font/local`.

### Hierarchy
- **Display** (800, clamp(1.85rem, 5vw, 2.55rem), 1.05): `h1`.
- **Headline** (700, clamp(1.35rem, 3vw, 1.9rem), 1.1): `h2` / `.heading-2`.
- **Title** (700, 1.05rem, 1.2): `h3`, títulos de cartão (`.heading-3`).
- **Body** (400, 1rem, 1.65): texto de conteúdo, nunca abaixo de 16px.
- **Body small** (400, 0.92rem, 1.6): descrições e metadados.
- **Label** (600, 0.75rem, 0.05em, maiúsculas): etiquetas pequenas (`.label`, `Badge`).
- **Etiqueta de cromo** (800, 1.125rem, maiúsculas, 0.03em): separador de área no cabeçalho; botões do dock em 700, 0.8125rem, maiúsculas.

### Named Rules
**A Regra da Condensada Nomeia, a Atkinson Explica.** Nomes, números, fases e áreas em Barlow Condensed; frases em Atkinson.

## Layout

Mobile-first, base de 375px, breakpoints só para expandir. Conteúdo em coluna única centrada até `--page-max-width` (72rem), com margens de 16px (24px em `sm`, 32px em `lg`) e colunas de cartões com intervalos de 12 a 16px. O cabeçalho é fixo no topo; o dock é fixo em baixo com a área de segurança (`env(safe-area-inset-bottom)`) e um botão "Post" verde ao centro. Todo o alvo tocável tem pelo menos 44px (`min-h-11`; botões e inputs com 44px, opções de voto com 56px). Abas de pílula fazem scroll horizontal com snap e a ativa centra-se sozinha.

## Elevation & Depth

Híbrido com predomínio de elevação: os cartões ficam acima da capa com sombra real, de tom roxo quase preto, e a borda lilás de 16% define o contorno. Não há contornos de brilho nem sombras duras deslocadas.

### Shadow Vocabulary
- **Cartão** (`box-shadow: 0 10px 24px rgba(5, 0, 12, 0.5)`, `--shadow-card`, igual a `--shadow-elevation-md`): cartões e hover de botão.
- **Elevação pequena** (`0 6px 14px rgba(5, 0, 12, 0.45)`, `--shadow-elevation-sm`): botões, cromos, abas ativas, alertas.
- **Painel** (`0 20px 48px rgba(5, 0, 12, 0.6)`, `--shadow-panel`): cabeçalho e dock.
- **Modal** (`0 28px 80px rgba(5, 0, 12, 0.7)`, `--shadow-modal`): folhas e diálogos.
- **Verde de estado** (`0 6px 16px rgba(47, 191, 113, 0.28)`, `--glow-green-sm`): pastilha da fase e botão Post.

### Named Rules
**A Regra da Sombra Roxa.** Sombras são sempre roxo quase preto (rgba(5,0,12,·)); só a pastilha da fase e o botão Post têm sombra verde.

**A Regra do Estado no Lugar.** Hover, pressionado e selecionado mudam cor e sombra no próprio elemento; só `transform` e `opacity`, até 200ms, com `prefers-reduced-motion` respeitado (`active:scale-[0.97]` a `[0.98]`).

## Shapes

Cantos generosos e firmes. Cartões e painéis a 1rem (`rounded-2xl` nos contentores de aba, vazio e alerta); controlos a 0.75-0.875rem; pastilhas e badges totalmente redondos; o cromo da pessoa é um quadrado arredondado (0.5-0.75rem), nunca um círculo, com borda de 2/3/4px na cor da pessoa conforme o tamanho (32/40/64px). Bordas de 1px lilás em cartões; lugar vazio com 2px tracejados; lugar cheio com 2px sólidos.

## Components

### Buttons
- **Shape:** cantos de 0.875rem (`--radius-md-token`); `primary` é uma pílula; `sm` 44px de altura, `default` 44px, `lg` 48px.
- **Primary (`default`/`primary`):** fundo verde de relvado, texto `--on-moss`, sombra pequena; hover `--moss-glow` e sombra média.
- **Secondary / outline / ghost:** véu branco a 5-8% sobre a capa, sem sombra; `ghost` realça o texto em `--moss-glow` no hover; `destructive` em gradiente coral.
- **Foco:** anel de 2px em `--moss` com offset 2; `active:scale-[0.98]`.

### Chips e etiquetas
`Badge`: pílula de 28px de altura, Barlow Condensed em maiúsculas; `default` verde translúcido com texto `--moss-glow`, `amber` âmbar, `secondary` e `outline` em véu branco, `destructive` coral.

### Cards / Containers
- **Corner Style:** 1rem. **Background:** `--color-bg-elevated`. **Shadow:** `--shadow-card`. **Border:** 1px `--color-border`. **Padding:** 16px, 24px em `sm`.
- `CardTitle` usa `.heading-3` (Barlow Condensed).

### Inputs / Fields
Fundo `--bg-paper` (branco a 5%), borda 1px, cantos 0.75rem, 44px mínimo, texto 16px Atkinson. Foco: borda e anel verdes translúcidos de 3px. Inválido: borda `--destructive`.

### Navigation
- **Cabeçalho:** barra fixa `--bg-surface` com sombra de painel: marca (nome em dourado, edição em condensada), pastilha da fase em verde, o cromo do próprio membro, botão de menu. Fora do mural mostra o separador da área (fundo na cor da área, texto `--on-person`, 32px).
- **Dock:** grelha igual em baixo; botões com ícone e etiqueta condensada em maiúsculas; ativo = cor da área com fundo a 16%; Post ao centro em verde sólido.
- **Abas de pílula (`PillTabs`):** contentor `--color-panel` de 1rem; a aba ativa preenche-se com `--area` (ou o verde) e texto `--on-person`; 44px.

### Lugar vazio e lugar cheio (assinatura)
- **Vazio** (`EmptyState`): 2px tracejado `--color-border-strong`, 1rem, ícone dentro de círculo tracejado; título 16px semibold, descrição atenuada; ação opcional até 20rem.
- **Cheio** (opção de voto escolhida): 2px sólido e fundo verde de relvado, texto `--on-moss`, sombra pequena e visto; as não escolhidas mantêm o tracejado.

### Cromo da pessoa (`PersonCromo`)
Quadrado arredondado de 32/40/64px, miolo `--page`, iniciais (primeira e última palavra) em Barlow Condensed 800 ou foto, borda e iniciais na cor da pessoa, sombra pequena.

### Alerta de erro
Cartão elevado de 1rem com borda de 2px: `danger` coral, `official` verde, `social` violeta; ação em contorno.

## Do's and Don'ts

### Do:
- **Do** usar as cores dos tokens (`--color-*`, `--moss*`, `--person-*`, `--area-*`); não escrever hex nos componentes.
- **Do** dar a cada pessoa a sua cor via `personColorVar` e a cada área a sua via `areaColorVar`.
- **Do** mostrar vazio como tracejado e cheio como sólido preenchido.
- **Do** usar cartões elevados (`--shadow-card`) em vez de camadas só tonais.
- **Do** manter alvos de 44px, texto de conteúdo de 16px e movimento de 200ms ou menos com redução de movimento respeitada.

### Don't:
- **Don't** usar o verde de relvado como decoração de área ou de pessoa; é estado.
- **Don't** pôr texto lilás claro sobre uma cor viva; usar `--on-moss` ou `--on-person`.
- **Don't** usar avatares circulares sobre cinzento; o cromo é um quadrado arredondado com a cor da pessoa.
- **Don't** usar sombras duras deslocadas nem contornos de brilho.
- **Don't** voltar às fontes antigas (Orbitron, DM Sans, JetBrains Mono) nem ao verde-oliva.

Não canonizado (defeitos que a build carrega): variante `neon` do `Button` (`bg-neon-glow`, `text-neon-green`), tokens órfãos herdados (`--bark`, `--beige`, `--sand`, `--neon-*`, `--color-fire`) e o alias enganador `--font-mono` (é Barlow Condensed); `EmptyState` tem um mapa de tons vazio.

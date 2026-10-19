---
name: Canhões do Ano
description: Portal privado do ritual anual de um grupo de amigos, em tema escuro.
colors:
  night-olive: "#10130d"
  raised-olive: "#1a2115"
  parchment: "#f5f4ed"
  parchment-soft: "#d5d9c9"
  sage-muted: "#aeb8a0"
  moss: "#4f6336"
  moss-glow: "#a4bd7a"
  signal-amber: "#ffb800"
  ember-danger: "#e05a3a"
  focus-amber: "#eab308"
  selection-sage: "#85a565"
  veil: "#ffffff"
  panel: "#12180d"
typography:
  display:
    fontFamily: "Orbitron, sans-serif"
    fontWeight: 700
    letterSpacing: "0.04em"
  wordmark:
    fontFamily: "Orbitron, sans-serif"
    fontSize: "1.06rem"
    fontWeight: 700
  headline:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "clamp(1.85rem, 5vw, 2.55rem)"
    fontWeight: 800
    lineHeight: 1.05
  title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "clamp(1.35rem, 3vw, 1.9rem)"
    fontWeight: 700
    lineHeight: 1.1
  subtitle:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.65
  body-small:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.92rem"
    lineHeight: 1.6
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.05em"
rounded:
  sm: "0.75rem"
  md: "0.875rem"
  lg: "1rem"
  xl: "26px"
components:
  button-primary:
    backgroundColor: "{colors.moss}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.md}"
    height: "44px"
  input:
    backgroundColor: "{colors.raised-olive}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.md}"
    height: "48px"
---

# Design System: Canhões do Ano

## Overview

**Creative North Star: "A Roda de Camaradas"**

Um grupo de amigos à volta da mesa no fim do ano: descontraído, com humor, cada um com a sua cor. A app é para usar no telemóvel, em visitas curtas, por isso a densidade é moderada, os alvos são grandes e cada ecrã tem uma ação principal.

O código atual exprime isto num tema escuro único, verde-oliva quase preto, com texto pergaminho e acentos musgo e âmbar. A direção aprovada (ver `PRODUCT.md`) leva a paleta para uma base roxa e verde com acentos multicolores, e a profundidade para cartões elevados. Até esse redesign ser aplicado, este ficheiro descreve o que está no código.

**Key Characteristics:**
- Tema escuro único, sem modo claro.
- Alvos de toque de 44px no mínimo (regra global em `app/globals.css`).
- Cores sempre a partir de tokens; camadas translúcidas com `--color-veil` e `--color-panel` mais opacidade (`bg-[var(--color-veil)]/8`).
- Animações de 200 ms em interações, só em `transform`, cor e opacidade.

## Colors

Uma paleta de floresta à noite: fundos verde-oliva muito escuros, texto pergaminho e um único acento verde.

### Primary
- **Musgo** (#4f6336): fundo dos botões principais e barras de progresso. Nunca como cor de texto (2,8:1 sobre o fundo).
- **Musgo luminoso** (#a4bd7a): texto e ícones de destaque, foco do teclado, cursor de texto (9:1 sobre o fundo).

### Secondary
- **Âmbar de sinal** (#ffb800): estados pendentes e chamadas de atenção.

### Neutral
- **Noite oliva** (#10130d): fundo da página (`--bg-void`).
- **Oliva elevado** (#1a2115): superfícies, inputs, sheets (`--bg-surface`).
- **Pergaminho** (#f5f4ed): texto principal.
- **Pergaminho suave** (#d5d9c9): texto secundário.
- **Salva** (#aeb8a0): texto discreto e metadados (8 a 9:1).
- **Véu** (#ffffff com opacidade): bordas finas e hover (`--color-veil`).
- **Âmbar de foco** (#eab308 a 12 a 18%): anel de foco dos inputs.
- **Salva de seleção** (#85a565 a 20%): fundo do texto selecionado.
- **Painel** (#12180d com opacidade): base escura de cartões translúcidos (`--color-panel`).

### Named Rules
**A regra do musgo legível.** O musgo escuro pinta fundos; o texto verde usa sempre `--moss-glow`.

## Typography

**Display Font:** Orbitron
**Body Font:** DM Sans
**Label/Mono Font:** JetBrains Mono

**Character:** o Orbitron dá o tom de "patente" ao nome da app; o DM Sans faz todo o trabalho de leitura.

### Hierarchy
- **Display / wordmark** (700, 1.06rem, maiúsculas): só a marca "Canhões do Ano".
- **Headline** (700, 1.5rem): o `<h1>` de cada página (`CanhoesModuleHeader`).
- **Title** (700, 1.35 a 1.9rem): `<h2>` de secções.
- **Subtitle** (700, 1.05rem): `<h3>` e títulos de cartões.
- **Body** (400, 1rem, 1.65): todo o conteúdo que se lê (posts, comentários, opções de voto, nomeações).
- **Body small** (400, 0.92rem): descrições de apoio por baixo de um título.
- **Label** (600, 0.75rem, maiúsculas): fases, contagens, datas. Nunca para conteúdo.

### Named Rules
**A regra dos 16px.** Conteúdo que alguém tem de ler está a 16px; abaixo disso só metadados.

## Layout

Mobile-first a partir de 375px, coluna única com 16px de margem lateral; os breakpoints só alargam (`max-w-[60rem]` nas páginas, `72rem` no mural). Navegação numa barra inferior fixa (dock) com o botão de publicar ao centro; o resto das áreas num bottom sheet. Formulários e detalhes abrem em bottom sheets, não em modais centrados.

## Elevation & Depth

Hoje a profundidade é tonal: superfícies ligeiramente mais claras do que o fundo, bordas de véu a 8 a 14%, e sombras pretas suaves (`--shadow-paper`, `--shadow-card`) que quase não se veem no escuro. Os overlays (sheets, lightbox) usam `--shadow-modal`. A direção aprovada pede cartões elevados, com sombra visível em repouso.

### Shadow Vocabulary
- **Papel** (`--shadow-paper`): cartões de conteúdo.
- **Painel** (`--shadow-panel`): blocos de formulário.
- **Modal** (`--shadow-modal`): sheets e diálogos.

## Shapes

Cantos arredondados generosos: 12 a 16px em cartões e inputs (`--radius-sm-token` a `--radius-lg-token`), 26px em contentores grandes, pílulas (`rounded-full`) em tabs, badges e no dock.

## Components

- **Botões:** 44px de altura, cantos `md`, primário em musgo com texto pergaminho, foco com anel de 2px em musgo luminoso.
- **Inputs:** 48px, fundo oliva elevado, borda de véu, foco em âmbar suave.
- **Tabs (pill tabs):** pílulas com contador opcional; o ativo ganha fundo de véu.
- **Cartões:** fundo translúcido sobre o painel, borda de véu e sombra de papel.
- **Pontos de carrossel:** ponto de 6px dentro de um alvo de 44px, com `aria-current` no ativo.

## Do's and Don'ts

- **Do:** usa os tokens (`var(--…)`), com opacidade por Tailwind (`/8`) para as camadas.
- **Do:** 44px em tudo o que se carrega, 16px em tudo o que se lê.
- **Don't:** cores fixas (`rgba(…)`, `text-white`) nos componentes.
- **Don't:** `transition-all` ou animações de largura; usa `transform`.
- **Don't:** botões sem ação ou conteúdo inventado (autores falsos, contagens de exemplo).

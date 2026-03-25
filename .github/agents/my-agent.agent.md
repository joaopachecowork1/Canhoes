name: Style Redesign Agent — Canhões do Ano
description: >
  Agente especializado em redesenhar o estilo visual do repositório com
  inspiração no Mobbin.com, tema "Canhões do Ano", dark mode com fundo
  verde escuro, e paleta verde escuro + bege.

---

# Style Redesign Agent — Canhões do Ano

## Objetivo

Este agente tem como missão **substituir completamente o estilo visual** do projeto,
aplicando um sistema de design coerente inspirado no Mobbin.com — interface
dark, minimalista, com cards sofisticados — mas com uma identidade própria:
o tema "Canhões do Ano", misturando verde escuro militar com bege envelhecido.

---

## Paleta de Cores (Design Tokens)

Aplica estas variáveis CSS em `:root` e `[data-theme="dark"]`:

```css
:root {
  /* Fundos */
  --bg-base:        #0f1a11;  /* fundo principal — verde quase preto */
  --bg-surface:     #1a2a1e;  /* cards, modais, sidebars */
  --bg-elevated:    #2d4a30;  /* hover states, inputs ativos */
  --bg-accent:      #4a3a20;  /* accent quente — canhão/bege escuro */

  /* Texto */
  --text-primary:   #d4c5a9;  /* bege claro — texto principal */
  --text-secondary: #8fbb8f;  /* verde claro — texto secundário */
  --text-muted:     #5a7a5a;  /* texto desativado / placeholder */
  --text-accent:    #c9a96e;  /* dourado bege — CTAs, destaques */

  /* Bordas */
  --border-subtle:  rgba(45, 74, 48, 0.5);   /* default */
  --border-default: rgba(45, 74, 48, 0.8);   /* hover */
  --border-accent:  rgba(201, 169, 110, 0.4); /* accent */

  /* Interativos */
  --btn-primary-bg:     #3d6640;
  --btn-primary-text:   #d4c5a9;
  --btn-primary-hover:  #4a7a4a;
  --btn-secondary-bg:   #2d4a30;
  --btn-secondary-text: #8fbb8f;

  /* Radii — estilo Mobbin: cantos grandes */
  --radius-sm:  8px;
  --radius-md:  12px;
  --radius-lg:  16px;
  --radius-xl:  24px;

  /* Sombras — subtis, sem neon */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-modal: 0 8px 40px rgba(0, 0, 0, 0.6);
}
```

---

## Princípios de Design (inspiração Mobbin)

### Tipografia
- Fonte principal: `Inter`, `DM Sans`, ou `Plus Jakarta Sans` (sem serifa, clean)
- Hierarquia clara: headings em `--text-primary` (bege), body em `--text-secondary` (verde claro)
- Lettering em `sentence case` — nunca ALL CAPS nas interfaces
- Peso: 400 para body, 500 para labels e headings — nunca 700+

### Cards
```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.card:hover {
  border-color: var(--border-default);
  box-shadow: var(--shadow-card);
}
```

### Botões
```css
.btn-primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border: none;
  border-radius: var(--radius-md);
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover { background: var(--btn-primary-hover); }
```

### Inputs
```css
input, textarea, select {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: 10px 14px;
}
input:focus {
  border-color: var(--border-accent);
  outline: none;
}
::placeholder { color: var(--text-muted); }
```

### Navegação / Sidebar
```css
.sidebar {
  background: var(--bg-base);
  border-right: 1px solid var(--border-subtle);
}
.nav-item {
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
}
.nav-item.active, .nav-item:hover {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}
```

### Pills / Badges
```css
.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border-radius: 99px;
  font-size: 12px;
  padding: 4px 12px;
  font-weight: 500;
}
.pill.accent {
  background: var(--bg-accent);
  color: var(--text-accent);
}
```

---

## Instruções de Commit

Ao fazer alterações de estilo, o agente deve:

1. **Identificar** todos os ficheiros com estilos inline, CSS modules, Tailwind classes, ou ficheiros `.css`/`.scss`
2. **Criar ou atualizar** um ficheiro de tokens globais (`tokens.css`, `variables.css`, ou equivalente no sistema de design do projeto)
3. **Substituir** valores hardcoded por variáveis da paleta acima
4. **Respeitar** breakpoints existentes — não quebrar responsividade
5. **Fazer commits atómicos** por componente ou ficheiro, com mensagens no formato:

```
style(component): apply canhões dark theme to <nome-do-componente>

- Replace hardcoded colors with design tokens
- Update border-radius to match Mobbin-inspired system
- Apply dark green + beige palette
```

---

## O que NÃO fazer

- Não usar gradientes, sombras com neon, ou efeitos `blur` decorativos
- Não usar branco puro (`#ffffff`) — o bege (`--text-primary`) é o "branco" deste sistema
- Não usar preto puro (`#000000`) nos fundos — usar sempre `--bg-base`
- Não usar peso de fonte acima de 500 nas interfaces
- Não alterar lógica de negócio, apenas estilo
- Não remover classes ou IDs usados em JavaScript

---

## Ficheiros Prioritários

O agente deve atacar pela seguinte ordem:
1. Ficheiro de variáveis / tokens globais
2. Layout raiz (`App.css`, `layout.css`, `_base.scss`)
3. Componentes de navegação (navbar, sidebar)
4. Cards e listas
5. Formulários e inputs
6. Botões e CTAs
7. Tipografia e headings
8. Páginas específicas

---

## Tema Visual — "Canhões do Ano"

A identidade visual evoca **artilharia histórica portuguesa** — robusta, sólida,
envelhecida mas imponente. Concretamente:

- **Verde escuro militar** como fundo dominante
- **Bege / dourado envelhecido** para texto e destaques — como metal polido
- **Bordas subtis** que lembram gravuras em metal
- **Cards sólidos e definidos** — sem leveza excessiva, com presença
- **Espaçamento generoso** — herança Mobbin
- Nenhum elemento decorativo desnecessário — cada peça tem uma função

---

*Gerado por Claude — Style Redesign Agent v1.0*

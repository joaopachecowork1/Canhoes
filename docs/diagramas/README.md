# Diagramas

Os documentos em `docs/` mostram os diagramas como imagens PNG com fundo branco. Assim leem-se igual no GitHub, no VS Code (tema claro ou escuro, com qualquer extensão de Markdown) e em qualquer visualizador. Cada imagem tem ao lado a fonte de onde sai; quem muda um diagrama muda a fonte e volta a gerar a imagem no mesmo PR.

| Ficheiros | Tipo | Fonte | Ferramenta |
|---|---|---|---|
| `classes/*.json` e `classes/*.png` | Diagramas de classes, um por área | JSON do BESSER | [BESSER Web Modeling Editor](https://editor.besser-pearl.org) |
| `*.mmd` e `*.png` | Sequência, estados e fluxo | Mermaid | `npm run docs:diagrams` |

## Diagramas de classes (BESSER)

1. Abre o [editor](https://editor.besser-pearl.org) e escolhe **Import** com o `.json` do diagrama (por exemplo `classes/02-categorias-e-votos.json`).
2. Altera o diagrama. Mantém-no pequeno: uma área por diagrama, até 8 classes, e uma referência a uma pessoa como atributo `: User` em vez de mais uma linha.
3. **Export → JSON** e substitui o `.json`.
4. **Export → PNG (white background)** e substitui o `.png` com o mesmo nome.

O JSON é o formato nativo do editor e guarda as posições, por isso o diagrama abre igual ao que está na imagem. O editor também exporta o modelo em B-UML (Python), se quiseres gerar código com o BESSER.

## Diagramas Mermaid

Edita o `.mmd` e corre:

```bash
npm run docs:diagrams                       # todos
npm run docs:diagrams -- fluxo-votar.mmd    # só um
```

O script usa o [mermaid-cli](https://github.com/mermaid-js/mermaid-cli) através do `npx`, por isso não acrescenta dependências ao projeto. Na primeira vez o `npx` descarrega o mermaid-cli e um Chrome para desenhar. Para usar um Chrome ou Chromium já instalado, define `PUPPETEER_EXECUTABLE_PATH` com o caminho do executável. O tema e os tamanhos de letra estão em `mermaid.config.json`.

Para ver um `.mmd` enquanto o editas, cola-o no [Mermaid Live Editor](https://mermaid.live).

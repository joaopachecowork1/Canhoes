# Diagramas

Os diagramas de sequência, estados e fluxo estão escritos em Mermaid dentro dos próprios documentos (blocos ` ```mermaid `), que o GitHub e o VS Code desenham. Mudar um diagrama é mudar esse bloco no mesmo PR que muda o comportamento. Para o ver enquanto o editas, cola-o no [Mermaid Live Editor](https://mermaid.live).

Os diagramas de classes, um por área, estão nesta pasta, porque não têm forma em texto:

| Ficheiros | Fonte | Ferramenta |
|---|---|---|
| `classes/*.json` e `classes/*.png` | JSON do BESSER | [BESSER Web Modeling Editor](https://editor.besser-pearl.org) |

## Diagramas de classes (BESSER)

1. Abre o [editor](https://editor.besser-pearl.org) e escolhe **Import** com o `.json` do diagrama (por exemplo `classes/02-categorias-e-votos.json`).
2. Altera o diagrama. Mantém-no pequeno: uma área por diagrama, até 8 classes, e uma referência a uma pessoa como atributo `: User` em vez de mais uma linha.
3. **Export → JSON** e substitui o `.json`.
4. **Export → PNG (white background)** e substitui o `.png` com o mesmo nome.

O JSON é o formato nativo do editor e guarda as posições, por isso o diagrama abre igual ao que está na imagem. O editor também exporta o modelo em B-UML (Python), se quiseres gerar código com o BESSER.

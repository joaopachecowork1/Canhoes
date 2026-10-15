# Documentação dos Canhões do Ano

Esta pasta descreve o negócio, os requisitos e a arquitetura da aplicação, num formato que se lê de cima a baixo por uma pessoa ou por um LLM. Os diagramas estão em [Mermaid](https://mermaid.js.org/), que o GitHub desenha diretamente.

Cada regra cita o ficheiro onde vive no código e o teste que a garante, para que a documentação possa ser verificada e mantida ao lado do código.

## Ordem de leitura

| Ficheiro | O que responde |
|---|---|
| [01-negocio.md](01-negocio.md) | O que é a app, quem a usa, o ciclo anual do evento e o glossário |
| [02-requisitos.md](02-requisitos.md) | Requisitos funcionais, não funcionais e regras de negócio numeradas |
| [03-arquitetura.md](03-arquitetura.md) | Camadas, pastas, padrão dos route handlers, autenticação e autorização |
| [04-modelo-de-dados.md](04-modelo-de-dados.md) | Diagrama de classes, tabelas e valores possíveis de cada estado |
| [05-fluxos.md](05-fluxos.md) | Diagramas de sequência e de estados dos fluxos principais |
| [06-api.md](06-api.md) | Todos os endpoints, o método, quem pode chamar e o serviço que executam |
| [07-operacao.md](07-operacao.md) | Configuração, testes, CI, Docker e deploy |
| [08-lacunas.md](08-lacunas.md) | O que ainda não está como devia, por prioridade |
| [09-deploy.md](09-deploy.md) | Pôr o site online: domínio, túnel Cloudflare, atualizações automáticas e backups |

## Para um LLM

Para dar contexto completo a um LLM, junta os ficheiros por ordem numa só mensagem:

```bash
cat docs/README.md docs/0*.md > canhoes-contexto.md
```

Junta também `prisma/schema.prisma` e `lib/domains/event/services/eventRules.ts` quando a pergunta for sobre dados ou permissões; são as duas fontes de verdade mais densas.

## Manter a documentação

- Uma alteração de comportamento atualiza o requisito ou a regra correspondente no mesmo PR.
- Uma rota nova entra em [06-api.md](06-api.md) e na matriz de autorização (`tests/integration/authorization.int.test.ts`).
- Uma alteração ao `prisma/schema.prisma` atualiza [04-modelo-de-dados.md](04-modelo-de-dados.md).

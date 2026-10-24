# 8. Lacunas conhecidas

O que a aplicação ainda não faz como devia, por prioridade. Cada linha diz onde está o problema e o que o resolve. Quando uma lacuna for resolvida, sai daqui e o requisito correspondente em [02-requisitos.md](02-requisitos.md) passa a descrever o novo comportamento.

## Segurança

| Lacuna | Onde | Como resolver |
|---|---|---|
| Não há Content-Security-Policy (o HSTS já está). O ZAP regista-a como alerta triado (10038). Uma CSP em modo só-relatório sem destino para os relatórios não serve de nada. | `next.config.mjs` | Definir a CSP com nonces no `proxy.ts`, com o domínio final do deploy, e um destino `report-to` para a pôr primeiro em relatório. |
| Os módulos fechados só são bloqueados no servidor para a votação e a gala; o mural, a wishlist, as categorias e as nomeações respondem a qualquer membro mesmo com o módulo desligado. | `app/api/v1/events/[eventId]/**/route.ts` | Trocar `requireEventAccess` por `requireModule` nessas rotas e acrescentar os casos à matriz de autorização. |
| As páginas de servidor chamam a própria API com `fetch(..., { cache: "no-store" })` e os cookies do utilizador (sem cache de dados partilhada entre utilizadores, mas com um pedido HTTP a mais por página). | `lib/api/canhoesServerClient.ts` | Chamar os serviços diretamente nas páginas de servidor (sem HTTP nem cache partilhada), o que também remove `CANHOES_INTERNAL_URL`. |
| Os ficheiros enviados são públicos para quem tiver o URL (os nomes são aleatórios e impossíveis de adivinhar). | `app/api/uploads/[...path]/route.ts` | Aceitável para o grupo; exigir sessão se as fotos passarem a ser sensíveis. |

## Dados e regras

| Lacuna | Onde | Como resolver |
|---|---|---|
| As datas das fases não têm ecrã: uma fase criada pelo admin fica aberta um ano, e a janela de votação só se muda na base de dados. | `state.ts` (`updateAdminPhase`) | Decidir se a votação fecha por data ou só quando o admin muda de fase, e simplificar o modelo em conformidade. |

## Organização do código

| Lacuna | Onde | Como resolver |
|---|---|---|
| O mesmo domínio vive em `components/`, `lib/domains/*/components` e `hooks/`, e há componentes com mais de 500 linhas (admin e mural). | `lib/domains/admin/components`, `lib/domains/feed` | Fase 2 do plano: `features/<nome>/` com UI, hooks e serviços juntos, e componentes partidos por responsabilidade. |

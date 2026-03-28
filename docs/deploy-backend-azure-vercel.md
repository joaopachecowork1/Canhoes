# Backend na cloud + frontend no Vercel

Este repo ja fica preparado para pores o backend a correr sem precisares de ter o PC ligado.

## Caminho recomendado

Para **esta codebase**, o caminho mais limpo e mais barato fica assim:

- **Azure SQL Database** para a base de dados
- **Azure Container Apps** para o backend
- **GitHub Container Registry (GHCR)** para guardar a imagem Docker do backend
- **Vercel** para o frontend

Porque este e o melhor caminho aqui:

- o backend ja esta preso a **SQL Server / Azure SQL**
- ja existe **Dockerfile** para o backend
- ja existe **health check**
- ja existe **CORS por env vars**
- o frontend no Vercel ja esta preparado para falar com um backend externo

## O que ja ficou pronto no repo

Backend:

- [`Program.cs`](/C:/PessoalRepo/Canhoes/CanhoesBE/Canhoes.API/Program.cs)
- [`CorsExtensions.cs`](/C:/PessoalRepo/Canhoes/CanhoesBE/Canhoes.API/CorsExtensions.cs)
- [`Dockerfile`](/C:/PessoalRepo/Canhoes/CanhoesBE/Canhoes.API/Dockerfile)
- [`.env.azure.example`](/C:/PessoalRepo/Canhoes/CanhoesBE/Canhoes.API/.env.azure.example)

Base de dados:

- [`Canhoes.Database.Sql.sqlproj`](/C:/PessoalRepo/Canhoes/CanhoesBE/Canhoes.Database.Sql/Canhoes.Database.Sql.sqlproj)

Frontend:

- [`vercel.production.env.example`](/C:/PessoalRepo/Canhoes/CanhoesFE/vercel.production.env.example)
- [`route.ts`](/C:/PessoalRepo/Canhoes/CanhoesFE/app/api/proxy/[...path]/route.ts)

Imagem Docker automatica:

- [`backend-container-publish.yml`](/C:/PessoalRepo/Canhoes/.github/workflows/backend-container-publish.yml)

## Resultado final

No fim vais ter isto:

1. A BD na Azure
2. O schema publicado para essa BD
3. A imagem do backend em `ghcr.io`
4. O backend a correr em Azure Container Apps
5. O frontend do Vercel a falar com o backend

## Antes de comecar

Precisas de:

1. Conta Azure
2. Repo no GitHub
3. Projecto do frontend no Vercel
4. Google OAuth app

## Passo 1. Push do repo para o GitHub

O workflow novo publica automaticamente a imagem Docker do backend para o GitHub Container Registry.

Faz push do repo para o GitHub e depois vai a:

- `GitHub > Actions > Publish Backend Container`

Quando o workflow correr com sucesso, a imagem fica em algo como:

```text
ghcr.io/<teu-user-ou-org>/canhoes-api:latest
```

### Se o repo for publico

Este e o caminho mais simples.

Abre:

- `GitHub > Packages > canhoes-api > Package settings`

e mete o package como **Public**.

Assim o Azure Container Apps consegue puxar a imagem sem precisares de Azure Container Registry.

### Se o repo for privado

Tens 2 opcoes:

1. Tornar apenas o package `canhoes-api` publico
2. Continuar com o package privado e depois configurar credenciais de registry no Azure

Se queres o caminho mais simples, usa a opcao `1`.

## Passo 2. Criar a Azure SQL Database

No portal Azure:

1. `Create a resource`
2. `SQL Database`
3. Preenche:
   - `Database name`: `Canhoes`
   - `Server`: cria um novo server
   - `SQL authentication`: cria username e password
4. Na parte de compute, escolhe uma opcao pequena e barata
5. Se a tua conta Azure tiver a oferta free ativa, o consumo e abatido dentro dos limites dessa oferta

### Networking da BD

Depois de criar a BD:

1. Abre o `SQL server`
2. Vai a `Networking`
3. Liga `Allow Azure services and resources to access this server`
4. Adiciona tambem o teu IP actual para conseguires publicar a BD a partir do Visual Studio

### Copiar connection string

No portal Azure:

1. Abre a SQL Database
2. Vai a `Connection strings`
3. Copia a string **ADO.NET**
4. Guarda-a porque vais usa-la no backend

## Passo 3. Publicar o schema para a BD

Como tu ja gostas do fluxo do Visual Studio, usa o projecto SQL.

Projeto:

- [`Canhoes.Database.Sql.sqlproj`](/C:/PessoalRepo/Canhoes/CanhoesBE/Canhoes.Database.Sql/Canhoes.Database.Sql.sqlproj)

No Visual Studio:

1. `Right click` em [`Canhoes.Database.Sql.sqlproj`](/C:/PessoalRepo/Canhoes/CanhoesBE/Canhoes.Database.Sql/Canhoes.Database.Sql.sqlproj)
2. `Publish`
3. Em `Target database connection`, escolhe o Azure SQL Server
4. Em `Database name`, usa `Canhoes`
5. `Publish`

Isto aplica o schema e o seed que ja deixei preparado no projecto SQL.

## Passo 4. Criar o Azure Container App do backend

No portal Azure:

1. `Create a resource`
2. `Container Apps`
3. Preenche:
   - `Container app name`: `canhoes-api`
   - `Region`: a mesma ou perto da BD
   - `Container Apps environment`: cria um novo

Quando chegares a `Container`:

1. Em `Image source`, escolhe `Other container registries`
2. Em `Image type`, escolhe `Public`
3. Em `Image and tag`, mete:

```text
ghcr.io/<teu-user-ou-org>/canhoes-api:latest
```

4. Em `Target port`, mete:

```text
8080
```

5. Em `Ingress`, escolhe `External`

## Passo 5. Configurar env vars no Azure Container App

No Container App:

1. Vai a `Settings > Environment variables`
2. Adiciona os valores do ficheiro:
   - [`.env.azure.example`](/C:/PessoalRepo/Canhoes/CanhoesBE/Canhoes.API/.env.azure.example)

Minimo obrigatorio:

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=<a-tua-connection-string-do-azure-sql>
Auth__Google__ClientId=<o-mesmo-google-client-id-do-frontend>
Auth__AdminEmails__0=<o-teu-email>
Cors__OriginsCsv=https://teu-frontend.vercel.app,http://localhost:3000
```

Opcional:

```text
Cors__AllowedOriginSuffixesCsv=vercel.app
```

Usa isto apenas se quiseres aceitar previews do Vercel.

## Passo 6. Confirmar que o backend esta online

Quando o deploy acabar, o Azure Container App vai dar-te um URL publico.

Testa:

```text
https://<teu-backend>.<region>.azurecontainerapps.io/health
```

Se estiver tudo bem, recebes algo deste genero:

```json
{"status":"ok","timestampUtc":"..."}
```

## Passo 7. Configurar o frontend no Vercel

No Vercel:

1. Abre o projecto do frontend
2. Vai a `Settings > Environment Variables`
3. Copia os valores deste ficheiro:
   - [`vercel.production.env.example`](/C:/PessoalRepo/Canhoes/CanhoesFE/vercel.production.env.example)

Valores minimos:

```text
NEXTAUTH_URL=https://teu-frontend.vercel.app
NEXTAUTH_SECRET=<segredo-random-forte>
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
CANHOES_API_URL=https://<teu-backend>.<region>.azurecontainerapps.io
NEXT_PUBLIC_CANHOES_API_URL=https://<teu-backend>.<region>.azurecontainerapps.io
NEXT_PUBLIC_MOCK_AUTH=false
```

Depois faz redeploy do frontend no Vercel.

## Passo 8. Google OAuth

No Google Cloud Console:

1. Abre o OAuth Client
2. Em `Authorized JavaScript origins`, mete:

```text
https://teu-frontend.vercel.app
```

3. Em `Authorized redirect URIs`, mete:

```text
https://teu-frontend.vercel.app/api/auth/callback/google
```

O backend nao precisa de callback proprio.
Ele recebe o `id_token` do frontend e valida-o.

## Checklist final

Backend:

1. `GET /health` responde `200`
2. O backend arranca sem exception de SQL
3. O backend tem `ConnectionStrings__DefaultConnection`
4. O backend tem `Auth__Google__ClientId`
5. O backend tem `Cors__OriginsCsv`

Base de dados:

1. O projecto SQL foi publicado
2. As tabelas existem
3. O bootstrap do evento default ja correu

Frontend:

1. `CANHOES_API_URL` aponta para o backend cloud
2. `NEXT_PUBLIC_CANHOES_API_URL` aponta para o backend cloud
3. `NEXTAUTH_URL` aponta para o Vercel
4. Google login funciona

## Alternativas e porque nao as deixei como caminho principal

### Azure App Service Free

Nao e a melhor opcao para este caso porque a pagina oficial de pricing mostra uma oferta Free muito limitada, com apenas `60 CPU minutes / day`.

### Koyeb Free

Pode servir para demos, mas o Koyeb indica oficialmente que a instancia free faz `scale to zero` ao fim de `1 hour` sem trafego.
Para esta API, isso traz cold starts e ainda te obriga a resolver a parte da BD SQL Server com mais cuidado.

## Fontes oficiais

Informacao verificada em **28 de marco de 2026**:

- [Azure free services](https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account?icid=azurefreeaccount)
- [Azure Container Apps billing](https://learn.microsoft.com/en-au/azure/container-apps/billing)
- [Azure SQL Database pricing](https://azure.microsoft.com/en-us/pricing/details/azure-sql-database/single/)
- [Azure App Service pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/windows/)
- [GitHub Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub Packages billing](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-packages/about-billing-for-github-packages?apiVersion=2022-11-28)
- [Koyeb scale-to-zero](https://www.koyeb.com/docs/run-and-scale/scale-to-zero)

## Resumo curto

Se queres o caminho mais directo:

1. Push para GitHub
2. Esperar pelo workflow da imagem
3. Criar Azure SQL
4. Publicar [`Canhoes.Database.Sql.sqlproj`](/C:/PessoalRepo/Canhoes/CanhoesBE/Canhoes.Database.Sql/Canhoes.Database.Sql.sqlproj)
5. Criar Azure Container App com a imagem `ghcr.io/.../canhoes-api:latest`
6. Meter env vars do backend
7. Meter env vars do Vercel
8. Testar `/health`

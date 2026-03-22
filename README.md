# 🏆 Canhões do Ano — Standalone App

> **Tagline:** _Votações, Nomeações e Medidas._

Canhões do Ano é uma aplicação standalone para gestão de votações de fim de ano, incluindo nomeações, categorias, medidas da gala e administração.

Este projeto é uma versão simplificada e focada do XPlayer, contendo apenas as funcionalidades relacionadas com os "Canhões do Ano".

---

## 🎯 Funcionalidades

### Autenticação
- Login via Google OAuth
- Sistema de utilizadores e administradores

### Votações
- Sistema de votação por categorias
- Diferentes tipos de categorias (Sticker, UserVote)
- Resultados e ranking

### Nomeações
- Submissão de nomeações
- Aprovação/rejeição de nomeações (admin)
- Atribuição de nomeações a categorias

### Categorias
- Gestão de categorias de prémios
- Propostas de novas categorias
- Configuração de descrições e regras de voto

### Medidas da Gala
- Submissão de propostas de medidas
- Aprovação de medidas para a gala
- Sistema de administração

### Amigo Secreto & Wishlist
- Sistema de Amigo Secreto
- Lista de desejos pessoal
- Gestão de sorteios

---

## 🛠️ Stack Tecnológica

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- NextAuth.js (Google OAuth)
- PWA ready

### Backend
- .NET 10.0
- Entity Framework Core
- SQL Server / SQLite
- ASP.NET Core Web API
- Google OAuth integration

---

## 🚀 Como executar

### Frontend
```bash
cd xplayerfe
npm install
npm run dev
```

### Backend
```bash
cd XPlayerBE
dotnet build XPlayer.API/XPlayer.API.csproj
dotnet run --project XPlayer.API/XPlayer.API.csproj
```

---

## 📱 Navegação

A aplicação possui 4 secções principais:

1. **Nomeações** - Visualizar e submeter nomeações
2. **Categorias** - Explorar categorias de prémios
3. **Votação** - Sistema de votação ativo
4. **Admin** - Painel de administração (restrito)

### Funcionalidades Adicionais (via menu "Mais")
- Stickers
- Wishlist
- Amigo Secreto
- Gala
- Medidas
- Nomeações (alternativo)

---

## 🔑 Configuração

### Frontend
Criar `.env.local`:
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Backend
Configurar Google OAuth no `appsettings.json`:
```json
{
  "Auth": {
    "Google": {
      "ClientId": "your-google-client-id"
    }
  }
}
```

---

## 📦 Deployment

A aplicação está preparada para deployment como:
- Frontend: Vercel/Netlify
- Backend: Azure App Service/Railway
- Base de dados: SQL Server/PostgreSQL

---

## 🎨 Design

Interface dark com tema verde "Canhões", otimizada para mobile-first com suporte completo para desktop.
    
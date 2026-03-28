# Canhoes do Ano Event Architecture

## Domain model

### Event
- `id`
- `name`
- `isActive`
- `users`
- `phases`

### User
- `id`
- `name`
- `role`

### Phase
- `id`
- `eventId`
- `type`
- `startDate`
- `endDate`
- `isActive`

### Post
- `id`
- `eventId`
- `userId`
- `content`
- `imageUrl`
- `createdAt`

### Category
- `id`
- `eventId`
- `title`
- `kind`
- `description`

### Option
- `id`
- `categoryId`
- `label`

### Vote
- `id`
- `userId`
- `categoryId`
- `optionId`
- `phaseId`

### Proposal
- `id`
- `eventId`
- `userId`
- `content`
- `status`

### WishlistItem
- `id`
- `eventId`
- `userId`
- `title`
- `link`

## Architecture structure

### Backend
```
Canhoes.API/
  Controllers/
    CanhoesController.cs        // legacy API kept working
    HubController.cs            // legacy feed kept working
    EventsController.cs         // event-scoped v1 API
  Data/
    CanhoesDbContext.cs
  Models/
    CanhoesEntities.cs
    EventContextEntities.cs
    EventContextDtos.cs
    HubFeedEntities.cs
  Startup/
    DbSchema.cs
    DbSeeder.cs
    EventContextBootstrap.cs
```

### Frontend
```
CanhoesFE/
  lib/
    api/
      types.ts
    repositories/
      canhoesRepo.ts
      hubRepo.ts
      canhoesEventsRepo.ts
    mock/
      mockData.ts
      mockFetch.ts
```

## API examples

### Load event context
`GET /api/v1/events/canhoes-do-ano`

Returns:
```json
{
  "event": { "id": "canhoes-do-ano", "name": "Canhoes do Ano", "isActive": true },
  "users": [{ "id": "user-id", "name": "Joao", "role": "admin" }],
  "phases": [{ "id": "phase-id", "type": "PROPOSALS", "startDate": "...", "endDate": "...", "isActive": true }],
  "activePhase": { "id": "phase-id", "type": "PROPOSALS", "startDate": "...", "endDate": "...", "isActive": true }
}
```

### Feed
- `GET /api/v1/events/{eventId}/feed/posts`
- `POST /api/v1/events/{eventId}/feed/posts`

Request:
```json
{
  "content": "Novo post no feed",
  "imageUrl": "/uploads/hub/example.png"
}
```

### Voting
- `GET /api/v1/events/{eventId}/voting`
- `POST /api/v1/events/{eventId}/votes`

Request:
```json
{
  "categoryId": "cat-001",
  "optionId": "nom-001"
}
```

### Proposals
- `GET /api/v1/events/{eventId}/proposals`
- `POST /api/v1/events/{eventId}/proposals`
- `PATCH /api/v1/events/{eventId}/proposals/{proposalId}`

Approve request:
```json
{
  "status": "approved"
}
```

### Wishlist
- `GET /api/v1/events/{eventId}/wishlist`
- `POST /api/v1/events/{eventId}/wishlist`

Request:
```json
{
  "title": "Vinil",
  "link": "https://example.com/item"
}
```

## Frontend structure

### Reusable components
- `Card`
- `Button`
- `Input`
- `Tabs`
- `Badge`
- `PostCard`
- `VoteCard`

### Feature modules
- `feed/`
- `voting/`
- `wishlist/`
- `admin/`

### Mobile-first layout
- Single column by default
- Bottom navigation for main areas
- Admin tabs on mobile, expanded navigation on desktop
- Large touch targets and stacked forms

## Example flows

### Social feed
1. Load event context.
2. Load `/feed/posts`.
3. Submit a new post scoped by `eventId`.

### Voting
1. Load `/voting`.
2. Check `canVote` and active `phaseId`.
3. Submit one vote per category.

### Admin approvals
1. Load `/proposals`.
2. Approve or reject.
3. On approval, create a category if it does not already exist.

### Wishlist
1. Load `/wishlist`.
2. Add personal items scoped by the same `eventId`.

## Key decisions explained

- The new `api/v1/events` API is additive. It does not break the existing frontend flow.
- Existing legacy controllers now write data into the default event so both APIs stay coherent.
- `Event`, `EventMember` and `EventPhase` are persisted, but the refactor stays small and avoids a full domain rewrite.
- Voting rules stay simple: active voting phase only, one vote per user per category, admin-only category creation and proposal moderation.
- The frontend work in this pass is contract-first: types, repository and mock data are ready without touching pages that already have local changes.

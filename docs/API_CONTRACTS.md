# AuraOS API Contracts
> **Source of truth** for the interface between backend-node (Mayank) ↔ frontend (Mayank).
> Last updated: AuraOS Release 2.0

---

## Base URLs

| Service | Local URL | Owner |
|---|---|---|
| backend-node (Express) | `http://localhost:5001` | Mayank |
| frontend (Vite) | `http://localhost:5173` | Mayank |

---

## 1. Session Management (`/api/state`)

### `POST /api/state/init`
Initialize or resume a user session. Call this on app load.

**Request**
```json
{
  "userId": "uuid-string-or-omit-for-new-user"
}
```

**Response**
```json
{
  "success": true,
  "userId": "generated-or-provided-uuid",
  "sessionsCount": 3,
  "isReturning": true,
  "lastActive": "2026-06-22T10:30:00.000Z"
}
```

### `GET /api/state/:userId`
Get the full user state summary (for the dashboard / home screen).

**Response**
```json
{
  "success": true,
  "exists": true,
  "userId": "abc-123",
  "lastActive": "2026-06-22T10:30:00.000Z",
  "stats": {
    "worriesDestroyed": 12,
    "tasksCompleted": 4,
    "totalSessions": 7
  },
  "activeTask": {
    "id": "task-uuid",
    "originalTask": "Build the MERN backend",
    "progress": 37,
    "currentQuest": {
      "id": 3,
      "action": "Open VS Code and create a new file called server.js",
      "tip": "Just open it. That's all. One thing.",
      "duration_minutes": 2,
      "completed": false
    }
  }
}
```

### `DELETE /api/state/:userId`
Wipe all user data (demo reset button).

---

## 2. Cognitive Forge (`/api/forge`)

### `POST /api/forge/extract`
Sends messy worry text to Gemini, returns structured worry blocks for Matter.js.

**Request**
```json
{
  "text": "I'm so behind on my project and also my mom is sick and I forgot to pay rent again and I don't even know if I'm good enough for this job",
  "userId": "abc-123"
}
```

**Response**
```json
{
  "success": true,
  "count": 4,
  "worries": [
    {
      "id": 1,
      "uuid": "physics-body-uuid",
      "worry": "project deadline slipping",
      "weight": 8,
      "status": "active"
    },
    {
      "id": 2,
      "uuid": "physics-body-uuid-2",
      "worry": "mom's health",
      "weight": 9,
      "status": "active"
    },
    {
      "id": 3,
      "uuid": "physics-body-uuid-3",
      "worry": "missed rent payment",
      "weight": 6,
      "status": "active"
    },
    {
      "id": 4,
      "uuid": "physics-body-uuid-4",
      "worry": "job competence doubts",
      "weight": 7,
      "status": "active"
    }
  ]
}
```

> **Frontend contract**: `uuid` maps 1:1 to the Matter.js body label.
> `weight` (1-10) → body width (e.g. `width = 80 + weight * 12`).

### `POST /api/forge/destroy`
Called when user drags a worry block into the Fireplace sensor zone.

**Request**
```json
{
  "userId": "abc-123",
  "worryId": "physics-body-uuid"
}
```

**Response**
```json
{
  "success": true,
  "message": "Worry destroyed. Let it go.",
  "worryId": "physics-body-uuid"
}
```

### `POST /api/forge/vault`
Save a worry for later reflection instead of destroying it.

**Request**
```json
{
  "userId": "abc-123",
  "worryId": "physics-body-uuid",
  "worry": "project deadline slipping",
  "weight": 8
}
```

### `GET /api/forge/vault/:userId`
Retrieve all vaulted (saved) worries.

**Response**
```json
{
  "success": true,
  "count": 2,
  "vault": [
    {
      "id": "uuid",
      "worry": "project deadline slipping",
      "weight": 8,
      "status": "vaulted",
      "createdAt": "2026-06-22T10:30:00.000Z"
    }
  ]
}
```

### `DELETE /api/forge/vault/:userId/:worryId`
Remove a specific worry from the vault.

---

## 3. Task Shatterer (`/api/shatter`)

### `POST /api/shatter/breakdown`
Sends a scary monolithic task to LangChain/Gemini, returns ordered micro-quests.

**Request**
```json
{
  "task": "Study for my physics exam tomorrow",
  "userId": "abc-123"
}
```

**Response**
```json
{
  "success": true,
  "taskId": "task-uuid",
  "originalTask": "Study for my physics exam tomorrow",
  "totalQuests": 2,
  "firstQuest": {
    "id": 1,
    "action": "Open the textbook to Chapter 4: Thermodynamics",
    "tip": "Just open the page. You don't have to read it yet.",
    "duration_minutes": 2,
    "completed": false
  },
  "microquests": [
    {
      "id": 1,
      "action": "Open the textbook to Chapter 4: Thermodynamics",
      "tip": "Just open the page. You don't have to read it yet.",
      "duration_minutes": 2,
      "completed": false
    },
    {
      "id": 2,
      "action": "Read the summary points on page 112",
      "tip": "It's just one page. You can do this.",
      "duration_minutes": 5,
      "completed": false
    }
  ]
}
```

> **Frontend contract**: On load, only display `firstQuest`.
> After clicking "Done ✓", call `/complete` to get `nextQuest`.

### `POST /api/shatter/complete`
Mark a micro-quest as done. Returns the next quest and progress.

**Request**
```json
{
  "userId": "abc-123",
  "taskId": "task-uuid",
  "questId": 1
}
```

**Response**
```json
{
  "success": true,
  "questId": 1,
  "taskComplete": false,
  "questsCompleted": 1,
  "totalQuests": 2,
  "progress": 50,
  "nextQuest": {
    "id": 2,
    "action": "Read the summary points on page 112",
    "tip": "It's just one page. You can do this.",
    "duration_minutes": 5,
    "completed": false
  },
  "message": "Quest 1 done. 1 left."
}
```

> When `taskComplete: true` → frontend shows full confetti + dopamine animation.

### `POST /api/shatter/abandon`
Gracefully set aside the active task.

**Request**
```json
{
  "userId": "abc-123",
  "taskId": "task-uuid"
}
```

### `GET /api/shatter/active/:userId`
Check for an active task on page load (session resume).

**Response**
```json
{
  "success": true,
  "activeTask": { "...full task object..." },
  "currentQuest": { "...next incomplete quest..." }
}
```

### `GET /api/shatter/history/:userId`
Completed and abandoned task history.

---

## Error Response Format

All endpoints return this shape on error:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

| Status Code | Meaning |
|---|---|
| 400 | Bad request (missing/invalid input) |
| 404 | Resource not found |
| 409 | Conflict (e.g. quest already completed) |
| 500 | Server/AI error |

# Firestore Schema

## organizations

| Field     | Type      | Description         |
| --------- | --------- | ------------------- |
| name      | string    | Display name        |
| slug      | string    | URL-safe identifier |
| createdAt | timestamp | Creation time       |
| updatedAt | timestamp | Last update         |

## memberships

| Field     | Type      | Description              |
| --------- | --------- | ------------------------ |
| userId    | string    | Firebase Auth UID        |
| orgId     | string    | Organization document ID |
| role      | string    | `owner` \| `employee`    |
| createdAt | timestamp | Creation time            |
| updatedAt | timestamp | Last update              |

**Indexes:** `userId` + `orgId`

## users

| Field         | Type      | Description               |
| ------------- | --------- | ------------------------- |
| email         | string    | User email                |
| displayName   | string    | Display name              |
| photoUrl      | string?   | Profile photo URL         |
| emailVerified | boolean   | Email verification status |
| orgId         | string?   | Current organization      |
| role          | string?   | Current role              |
| createdAt     | timestamp | Creation time             |
| updatedAt     | timestamp | Last update               |

## auditLogs

| Field        | Type      | Description               |
| ------------ | --------- | ------------------------- |
| orgId        | string    | Organization scope        |
| actorId      | string    | User who performed action |
| action       | string    | Action identifier         |
| resourceType | string    | Resource type             |
| resourceId   | string    | Resource ID               |
| metadata     | map       | Additional context        |
| createdAt    | timestamp | Immutable creation time   |

**Indexes:** `orgId` + `createdAt` DESC

## Custom Claims (Auth Token)

```json
{
  "orgId": "string",
  "role": "owner | employee"
}
```

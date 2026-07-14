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

## customers

| Field     | Type      | Description    |
| --------- | --------- | -------------- |
| orgId     | string    | Tenant scope   |
| name      | string    | Customer name  |
| phone     | string    | Phone number   |
| email     | string?   | Email          |
| notes     | string?   | Notes          |
| createdAt | timestamp | Creation time  |
| updatedAt | timestamp | Last update    |

## vehicles

| Field       | Type      | Description      |
| ----------- | --------- | ---------------- |
| orgId       | string    | Tenant scope     |
| customerId  | string    | Owner customer   |
| make        | string    | Vehicle make     |
| model       | string    | Vehicle model    |
| year        | number    | Model year       |
| plateNumber | string    | License plate    |
| color       | string?   | Color            |
| vin         | string?   | VIN              |
| createdAt   | timestamp | Creation time    |
| updatedAt   | timestamp | Last update      |

## vehicleTasks

| Field               | Type      | Description                          |
| ------------------- | --------- | ------------------------------------ |
| orgId               | string    | Tenant scope                         |
| vehicleId           | string    | Linked vehicle                       |
| customerId          | string    | Linked customer                      |
| title               | string    | Task title                           |
| description         | string?   | Details                              |
| status              | string    | State machine status                 |
| assignedMechanicId  | string?   | Assigned mechanic                  |
| estimatedCompletion | timestamp?| ETA                                  |
| createdAt           | timestamp | Creation time                        |
| updatedAt           | timestamp | Last update                          |

**Status values:** `received` → `inspection` → `in_progress` → `quality_check` → `ready` → `completed`

## inventoryItems, employees, mechanics, posOrders, payrollEntries, notifications

All org-scoped with `orgId`, `createdAt`, `updatedAt`. See domain entities in `packages/domain/src/entities.ts`.

## Custom Claims (Auth Token)

```json
{
  "orgId": "string",
  "role": "owner | employee"
}
```

**Note:** Firestore rules also fall back to `users/{uid}.orgId` when custom claims are unavailable (Spark plan).

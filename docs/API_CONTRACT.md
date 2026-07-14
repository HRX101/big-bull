# API Contract

## Cloud Functions

### syncUserClaims

**Type:** Callable HTTPS Function  
**Region:** `asia-south1`

**Request:**

```json
{
  "userId": "string",
  "orgId": "string",
  "role": "owner | employee"
}
```

**Response:**

```json
{
  "success": true
}
```

**Errors:** `unauthenticated`, `invalid-argument`, `permission-denied`

## Application Use Cases (Client-Side)

| Use Case                   | Input                                               | Output                |
| -------------------------- | --------------------------------------------------- | --------------------- |
| SignInUseCase              | `{ email, password }`                               | `Result<AuthSession>` |
| SignUpUseCase              | `{ displayName, email, password, confirmPassword }` | `Result<AuthSession>` |
| BootstrapDefaultOrgUseCase | `{ orgName }`                                       | `Result<AuthSession>` |

## Repository Ports

Defined in `packages/application/src/ports.ts`:

- AuthRepository
- OrganizationRepository
- MembershipRepository
- UserRepository
- ClaimsService
- AuditRepository

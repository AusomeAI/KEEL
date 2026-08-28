# KEEL Control Gate Microservice

The Control Gate is the single transaction boundary between the Agent Plane and the Deterministic Core. It implements the 9-step pipeline that all transaction intents (human and agent) must pass through.

## Architecture

```
Human or Agent
      │
      ▼
  TransactionIntent { type, subject, payload, actor, ... }
      │
      ▼
┌─────────────────── CONTROL GATE (9 Steps) ──────────────┐
│ 1. Authenticate actor (per-agent identity, short tokens) │
│ 2. Authorise tenancy scope (tenant/group/entity/branch)  │
│ 3. Check autonomy ceiling (compile-time constants, L0-L3)│
│ 4. Check budget & rate limits (agents only)              │
│ 5. Validate policy (deterministic, same for all)         │
│ 6. Simulate effect (attach projected result)             │
│ 7. Route for approval (based on autonomy level)          │
│ 8. Execute ledger transaction (append-only event)        │
│ 9. Emit signed Decision Record (Law 7 compliance)        │
└──────────────────────────────────────────────────────────┘
      │
      ▼
  Bitemporal Ledger (PostgreSQL, append-only, RLS-protected)
      │
      ▼
  Audit Trail + Compliance Artifacts
```

## Laws Enforced

- **Law 1:** No LLM/model imports in core dependencies
- **Law 2:** Manual UI routes registered before agent capability
- **Law 3:** Ledger is append-only (no UPDATE/DELETE on events)
- **Law 5:** Tenant isolation via PostgreSQL RLS
- **Law 7:** Every decision creates a signed Decision Record
- **Law 9:** Autonomy ceilings are compile-time constants
- **Law 10:** Per-agent identity with scoped OAuth 2.1 tokens

## API Endpoints

### POST /api/gate/submit

Submit a TransactionIntent through the Control Gate pipeline.

**Request:**
```json
{
  "type": "HIRE_EMPLOYEE",
  "subject_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "job_title": "Software Engineer",
    "salary": 120000,
    "start_date": "2026-09-01"
  },
  "actor_id": "550e8400-e29b-41d4-a716-446655440001",
  "actor_kind": "HUMAN",
  "as_of": "2026-08-28T15:30:00Z",
  "effective_from": "2026-09-01T00:00:00Z",
  "approved_by_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Response (Requires Approval):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "status": "PENDING",
  "approval_level": "MANAGER_APPROVAL",
  "requires_approval": true,
  "simulation_result": {
    "projected_salary": 120000,
    "effective_date": "2026-09-01T00:00:00Z"
  },
  "message": "Intent submitted for approval"
}
```

**Response (Auto-Execute):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "status": "EXECUTED",
  "requires_approval": false,
  "message": "Intent executed automatically"
}
```

### GET /api/gate/pending

List pending transaction intents requiring approval.

**Query Parameters:**
- `limit` (optional, default=50, max=100): Number of results
- `offset` (optional, default=0): Pagination offset

**Response:**
```json
{
  "intents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "HIRE_EMPLOYEE",
      "subject_id": "550e8400-e29b-41d4-a716-446655440001",
      "actor_id": "550e8400-e29b-41d4-a716-446655440002",
      "actor_kind": "HUMAN",
      "approval_level": "MANAGER_APPROVAL",
      "submitted_at": "2026-08-28T15:30:00Z",
      "expires_at": "2026-09-04T15:30:00Z",
      "simulation_result": { "projected_salary": 120000 }
    }
  ],
  "total": 1,
  "message": "Pending intents retrieved"
}
```

### POST /api/gate/approve/:intentId

Approve and execute a pending transaction intent.

**Request:**
```json
{
  "approved_by_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "EXECUTED",
  "executed_at": "2026-08-28T15:31:00Z",
  "ledger_event_id": "550e8400-e29b-41d4-a716-446655440002",
  "decision_record_id": "550e8400-e29b-41d4-a716-446655440003",
  "message": "Intent approved and executed"
}
```

### POST /api/gate/reject/:intentId

Reject a pending transaction intent.

**Request:**
```json
{
  "rejected_by_id": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "Hire approved in FY2027 budget cycle, not FY2026"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "REJECTED",
  "rejected_at": "2026-08-28T15:32:00Z",
  "reason": "Hire approved in FY2027 budget cycle, not FY2026",
  "message": "Intent rejected"
}
```

## Authentication

All endpoints (except `/health` and `/ready`) require Bearer token authentication:

```
Authorization: Bearer <JWT>
```

The token must contain:
- `tenant_id` (UUID) — tenant scope (Law 5)
- `actor_id` (UUID) — actor identity (Law 10)
- `actor_kind` ("HUMAN" | "AGENT") — identity type

## Setup & Development

### Prerequisites

- Node.js 22+
- PostgreSQL 16+
- pnpm

### Environment Variables

```bash
# Database
DB_HOST=localhost              # PostgreSQL host
DB_PORT=5432                   # PostgreSQL port
DB_NAME=keel_ledger            # Database name
DB_USER=postgres               # Database user
DB_PASSWORD=postgres           # Database password
DB_SSL=false                   # Enable SSL

# Server
PORT=3000                      # Server port
HOST=0.0.0.0                   # Server host
LOG_LEVEL=info                 # Log level (debug, info, warn, error)
```

### Installation

```bash
# Install dependencies
pnpm install

# Initialize database (creates schema)
pnpm run migrate

# Start development server
pnpm run dev
```

### Building

```bash
# Build TypeScript
pnpm run build

# Start production server
pnpm run start
```

### Testing

```bash
# Run tests
pnpm run test

# Run with coverage
pnpm run test:coverage
```

## Database Schema

The Control Gate persists to three core tables:

1. **ledger_events** — Append-only event store
   - Valid time (business time when fact was true)
   - Transaction time (when we recorded the fact)
   - Per-entity KMS encryption key reference
   - Law 3 + Law 5 enforcement

2. **transaction_intents** — Pending approval queue
   - Status: PENDING → APPROVED/REJECTED/EXECUTED
   - Approval level routing
   - Simulation result storage
   - Law 2 compliance (manual UI routes tracked)

3. **decision_records** — Signed compliance artifacts
   - Hash-chained history
   - Regulatory evidence citations
   - Ledger event linkage
   - Law 7 enforcement (signed, immutable)

All tables enforce row-level security (RLS) using the `keel.tenant_id` session context, ensuring tenant isolation at the database kernel level (Law 5).

## Integration Guide

### From the Web App

```typescript
import { getApiClient } from "@keel/api";

const apiClient = getApiClient();

// Submit intent
const result = await apiClient.submitIntent({
  type: "HIRE_EMPLOYEE",
  subject_id: newEmployeeId,
  payload: { first_name, last_name, email, job_title, salary, start_date },
  actor_id: user.id,
  actor_kind: "HUMAN",
});

if (result.requires_approval) {
  // Show pending approval page
  navigate({ to: "/approvals" });
} else {
  // Intent auto-executed
  showSuccess("Employee hired");
}
```

### From the Agent Plane

```typescript
const result = await controlGate.execute({
  type: "HIRE_EMPLOYEE",
  subject_id: newEmployeeId,
  payload: { ... },
  actor: {
    kind: "AGENT",
    id: agentId,
    agentToken: scopedToken,
  },
});
```

## Deployment

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm run build
ENV NODE_ENV=production
CMD ["pnpm", "run", "start"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: control-gate
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: gate
        image: keel/control-gate:latest
        ports:
        - containerPort: 3000
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
```

## Monitoring & Observability

- **Health Check:** `GET /health` — service status
- **Readiness Check:** `GET /ready` — database connectivity
- **Logs:** Structured JSON via Pino, colorized in development
- **Metrics:** OpenTelemetry spans on pipeline execution (Wave 2+)
- **Traces:** Distributed traces to Jaeger (Wave 2+)

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

Ensure PostgreSQL is running:
```bash
psql -h localhost -U postgres -d keel_ledger -c "SELECT version();"
```

### Migration Fails

```
Error: relation "ledger_events" already exists
```

This is expected on subsequent runs. The schema is idempotent.

### Unauthorized Errors

Ensure Bearer token has required claims:
```bash
# Decode JWT payload
echo "token-here" | cut -d. -f2 | base64 -d | jq .
```

## Further Reading

- **Architecture:** See `/docs/02-Vision-Architecture-and-Strategy.md`
- **Policy Execution:** See `packages/policy/src/execution/engine.ts`
- **Database Schema:** See `services/ledger/migrations/001-create-bitemporal-ledger.sql`
- **Type Definitions:** See `packages/core/src/types/transaction-intent.ts`

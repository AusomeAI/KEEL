# KEEL Kiosk UI

Progressive Web App (PWA) for frontline time capture.

**Target:** Shared device, queue behind user, poor light, gloves, 2G network.

**Principle:** Single-tap interactions, large touch targets (48dp minimum), offline buffer, automatic sync.

**Status:** Wave 1 Foundations

---

## Philosophy

- **Single-tap interactions** — No complex workflows. Punch in, punch out, done.
- **Minimal text** — Glove-friendly, poor light-friendly. Icons + clear feedback.
- **Offline by default** — Captures happen locally, syncs when network returns.
- **Zero confusion** — Each screen has exactly one action. No modal hell.
- **Accessibility** — High contrast, large buttons, no time-based interactions.

---

## Project Structure

```
apps/kiosk/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component (router, theme, offline)
│   ├── router.ts                   # TanStack Router (minimal pages)
│   ├── contexts/
│   │   ├── OfflineContext.tsx      # Network status, sync queue
│   │   ├── AuthContext.tsx         # Cached auth (no session expiry)
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useOffline.ts           # Network status + manual sync
│   │   ├── usePunch.ts             # Create punch record
│   │   ├── useSyncQueue.ts         # Local queue, sync logic
│   │   └── index.ts
│   ├── layouts/
│   │   ├── KioskLayout.tsx         # Minimal chrome (status bar only)
│   │   └── index.ts
│   ├── pages/
│   │   ├── HomePage.tsx            # Login or punch menu
│   │   ├── PunchMenuPage.tsx       # [Clock In] [Clock Out] [Break] [Meal]
│   │   ├── PunchConfirmPage.tsx    # Confirmation screen
│   │   ├── OfflineBufferPage.tsx   # Show pending punches
│   │   ├── ErrorPage.tsx           # Network error, sync failed
│   │   └── index.ts
│   ├── components/
│   │   ├── OfflineIndicator.tsx    # "Offline - Sync pending"
│   │   ├── SyncStatus.tsx          # "Last synced: 5 min ago"
│   │   ├── LargeButton.tsx         # 48dp × 48dp tap target
│   │   ├── LoginPanel.tsx          # Badge / PIN entry
│   │   ├── PunchCard.tsx           # Punch record display
│   │   └── index.ts
│   ├── api/
│   │   ├── offline-db.ts           # SQLite (native) or IndexedDB (web)
│   │   ├── sync-engine.ts          # Offline-first sync logic
│   │   ├── punches.ts              # Punch API endpoints
│   │   └── types.ts
│   ├── utils/
│   │   ├── format.ts               # Format timestamps for display
│   │   ├── geolocation.ts          # Get device location (if enabled)
│   │   └── index.ts
│   ├── styles/
│   │   ├── index.css               # Global, Keel DS imports
│   │   └── kiosk.css               # Kiosk-specific overrides
│   └── vite-env.d.ts
├── public/
│   ├── manifest.json               # PWA manifest
│   ├── favicon-kiosk.png           # 192×192 and 512×512
│   └── robots.txt
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Page Flows

### 1. Home Page

```
┌─────────────────────────────────────────┐
│ Kiosk Punch Terminal                    │
├─────────────────────────────────────────┤
│                                         │
│     [Login with badge/PIN]              │
│                                         │
│  OR                                     │
│                                         │
│     [Already logged in?]                │
│     [Tap to Start →]                    │
│                                         │
└─────────────────────────────────────────┘
```

**Interaction:**
- Employee scans badge or enters PIN (soft keyboard)
- Validates locally first (offline), syncs validation when online
- Routes to PunchMenuPage

**Offline:** Cache badge/PIN hashes locally. Allow punch even if validation server unreachable.

---

### 2. Punch Menu Page

```
┌─────────────────────────────────────────┐
│ ✓ Logged in: John Smith                 │
├─────────────────────────────────────────┤
│                                         │
│        [Clock In] [Clock Out]           │
│                                         │
│        [Break]    [Meal Break]          │
│                                         │
│  [Sync Status: ✓ Synced 2 min ago]     │
│                                         │
└─────────────────────────────────────────┘
```

**Button sizing:** 
- Each button: 48dp × 48dp minimum
- Gap: 16dp
- Responsive: 2×2 grid on tablets, 1×2 on phones (stacked)

**Color coding:**
- **Clock In:** Green (success)
- **Clock Out:** Blue (info)
- **Break:** Amber (warning)
- **Meal Break:** Amber (warning)

**State logic:**
- If "last punch was Clock In" → show [Clock Out] prominently, gray out [Clock In]
- If "last punch was Clock Out" → show [Clock In] prominently, gray out [Clock Out]
- [Break] and [Meal] only available if clocked in

**Keyboard:** Each button has a shortcut key (1, 2, 3, 4) for rapid entry without tapping.

---

### 3. Punch Confirmation Page

```
┌─────────────────────────────────────────┐
│ ✓ Success                               │
├─────────────────────────────────────────┤
│                                         │
│      Clocked In                         │
│      08:30                              │
│                                         │
│      Building A, Level 3                │
│      Geofenced location                 │
│                                         │
│                                         │
│        [Return to Menu]                 │
│                                         │
│  [Sync: Synced ✓]                       │
│                                         │
└─────────────────────────────────────────┘
```

**Content:**
- Action (Clock In, Clock Out, Break, Meal)
- Timestamp (HH:MM, 24-hour)
- Location (if enabled, show building/level or "Geofenced")
- Sync status (Synced, Pending, Failed)

**Interaction:**
- Tap [Return to Menu] to go back
- Auto-return after 3 seconds (optional, accessibility-friendly)

**Offline:** If sync pending, show "Pending" badge. User can close after punch is stored locally.

---

### 4. Offline Buffer Page

```
┌─────────────────────────────────────────┐
│ ⚠ Offline Mode                          │
├─────────────────────────────────────────┤
│                                         │
│  Your punches are saved locally.        │
│  They will sync when connected.         │
│                                         │
│  Pending Punches:                       │
│  • Clock In - 08:30 (pending)           │
│  • Break - 10:15 (pending)              │
│                                         │
│                                         │
│  [Retry Sync]  [Continue]               │
│                                         │
│  No network. Last synced: 15 min ago.   │
│                                         │
└─────────────────────────────────────────┘
```

**Trigger:** Shown automatically when:
- Device goes offline
- Sync fails repeatedly
- User manually triggers offline mode

**Content:**
- Clear explanation (not error state)
- List of pending punches (with timestamps)
- Sync status
- Action buttons: Retry or Continue

---

### 5. Error Page (Network / Sync Failure)

```
┌─────────────────────────────────────────┐
│ ⚠ Sync Failed                           │
├─────────────────────────────────────────┤
│                                         │
│  Could not sync punch to server.        │
│  (Check network connection)             │
│                                         │
│  Your punch is saved locally and        │
│  will sync automatically when online.   │
│                                         │
│                                         │
│  [Retry Sync]  [Back to Menu]           │
│                                         │
└─────────────────────────────────────────┘
```

**Scenario:** Punch was created locally, but sync to server failed.

**UX:** Reassure user that their punch is safe and will sync later. Don't blame them.

---

## Offline-First Architecture

### Data Storage

**Local database:** SQLite (if native mobile) or IndexedDB (if PWA)

```sql
-- punches table
CREATE TABLE IF NOT EXISTS punches (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  punch_type TEXT NOT NULL,  -- 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK' | 'MEAL'
  timestamp DATETIME NOT NULL,
  location_latitude REAL,
  location_longitude REAL,
  location_name TEXT,
  sync_status TEXT NOT NULL,  -- 'PENDING' | 'SYNCED' | 'FAILED'
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  server_id TEXT  -- UUID from server after sync
);
```

### Sync Engine

```typescript
// api/sync-engine.ts
export class SyncEngine {
  // Queue punch locally
  async queuePunch(punch: PunchRecord): Promise<void> {
    await db.insertPunch({
      ...punch,
      syncStatus: 'PENDING',
      id: crypto.randomUUID(),
    });
  }

  // Attempt sync
  async sync(): Promise<{ synced: number; failed: number }> {
    const pending = await db.getPendingPunches();

    const results = await Promise.allSettled(
      pending.map((punch) =>
        api.punches.create(punch)
          .then((response) => {
            // Mark as synced, store server ID
            db.updatePunch(punch.id, {
              syncStatus: 'SYNCED',
              serverId: response.id,
            });
            return punch;
          })
          .catch(() => {
            // Mark as failed, keep for retry
            db.updatePunch(punch.id, {
              syncStatus: 'FAILED',
            });
            throw punch;
          })
      )
    );

    const synced = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { synced, failed };
  }

  // Auto-sync on network reconnect
  subscribeToNetworkStatus(): void {
    window.addEventListener('online', () => this.sync());
  }
}
```

### Conflict Resolution

If a punch exists locally and server rejects it (e.g., already clocked in):

```typescript
// Scenario: User taps [Clock In] twice (network lag)
// Local: punch recorded immediately
// Server: second punch rejected ("already clocked in")

// Resolution:
if (error.code === 'ALREADY_CLOCKED_IN') {
  await db.removePunch(localPunch.id);  // Remove duplicate
  showNotification('You are already clocked in', 'info');
}
```

---

## UI Components (Kiosk-Specific)

### LargeButton

Touch target 48dp × 48dp minimum (kiosk), 44dp (mobile).

```tsx
<LargeButton
  variant="primary"   // primary, secondary, ghost, danger
  size="lg"           // defaults to kiosk 48dp
  onClick={handleClockIn}
  disabled={!canClockIn}
>
  Clock In
</LargeButton>
```

### OfflineIndicator

Always visible in status bar:

```tsx
<OfflineIndicator 
  status="offline"     // offline | pending | synced
  lastSyncTime={Date}
/>

// Renders:
// Offline: "⚠ Offline"
// Pending: "⏳ Sync pending..."
// Synced: "✓ Synced 5 min ago"
```

### PunchCard

Display punch record with sync status:

```tsx
<PunchCard
  punch={punch}           // { type, timestamp, location, syncStatus }
  showLocation={true}
/>

// Renders:
// Clock In
// 08:30
// Building A, Level 3
// ✓ Synced
```

---

## Theming

Kiosk uses the same Keel DS tokens, but with overrides for:

- **Larger text** — 18px base (instead of 16px on web)
- **Higher contrast** — error 700, success 600 (darker for poor light)
- **Reduced animation** — fade-in only, no spring animations (glove-friendly)
- **Touch-friendly spacing** — 16dp minimum gap

```css
/* kiosk.css */
@media (max-width: 768px) {
  :root {
    --font-size-base: 18px;
    --font-size-lg: 20px;
    --font-size-h4: 24px;

    --space-lg: 20px; /* Larger touch gaps */
  }
}
```

---

## Keyboard Shortcuts

For rapid punch entry (especially in high-volume facilities):

| Key | Action |
|-----|--------|
| **1** | Clock In |
| **2** | Clock Out |
| **3** | Break |
| **4** | Meal |
| **0** | Logout |
| **?** | Help (show shortcuts) |
| **R** | Retry sync |

---

## Accessibility

- **High contrast:** 7:1 (normal text), 4.5:1 (large)
- **Large buttons:** 48dp × 48dp minimum
- **No time-based:** No auto-dismiss without interaction
- **Keyboard navigation:** Tab between buttons, Enter to activate
- **Focus visible:** 3px outline on focused button
- **No animation trap:** `prefers-reduced-motion` respected
- **Clear labels:** Button text is descriptive, not abbreviated
- **No flashing:** No animations > 3 flashes per second

---

## PWA Configuration

### Manifest (public/manifest.json)

```json
{
  "name": "KEEL Kiosk",
  "short_name": "Kiosk",
  "description": "Time punch terminal",
  "start_url": "/",
  "display": "fullscreen",
  "orientation": "portrait-primary",
  "background_color": "#FAFAFA",
  "theme_color": "#6366F1",
  "icons": [
    {
      "src": "/favicon-kiosk-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/favicon-kiosk-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker

Configured by Vite PWA plugin. Caches:
- Keel DS CSS and fonts
- Kiosk app bundle (JS, React runtime)
- API responses (30-min TTL)

Offlines gracefully: shows cached UI with "Offline" banner.

---

## Testing

### Unit Tests

```typescript
// __tests__/sync-engine.test.ts
test('queues punch when offline', async () => {
  // Simulate offline
  navigator.onLine = false;

  // Queue punch
  await syncEngine.queuePunch({ type: 'CLOCK_IN', timestamp: new Date() });

  // Check local database
  const pending = await db.getPendingPunches();
  expect(pending).toHaveLength(1);
  expect(pending[0].syncStatus).toBe('PENDING');
});

test('syncs punch when online', async () => {
  // Queue punch
  await syncEngine.queuePunch({ type: 'CLOCK_IN', timestamp: new Date() });

  // Go online and sync
  navigator.onLine = true;
  await syncEngine.sync();

  // Check sync status
  const punches = await db.getAllPunches();
  expect(punches[0].syncStatus).toBe('SYNCED');
});
```

### E2E Tests

```typescript
// e2e/kiosk-punch.spec.ts
test('clock in/out works offline with local buffer', async ({ page, context }) => {
  // Go offline
  await context.setOffline(true);

  // Visit kiosk
  await page.goto('/');

  // Login and punch
  await page.fill('input[name="badge"]', '12345');
  await page.click('button:has-text("Clock In")');

  // See confirmation (from local database)
  await expect(page).toContainText('Clocked in at 08:30');
  await expect(page).toContainText('Sync pending');

  // Go back online
  await context.setOffline(false);

  // Sync happens automatically
  await page.waitForTimeout(1000);

  // See "Synced"
  await expect(page).toContainText('✓ Synced');
});
```

---

## Performance Targets

- **First paint:** < 1s (cached)
- **Time to interactive:** < 2s
- **Punch confirmation:** < 500ms (local, instant if cached)
- **Sync:** Background, non-blocking
- **Bundle size:** < 500KB (gzip)

---

## Build & Deploy

```bash
# Development
npm run dev

# Build PWA
npm run build

# Test PWA locally
npm run preview

# Deploy to hosting
# PWA served from CDN, cached aggressively
```

---

## Environment Variables

```env
VITE_API_URL=https://api.keel.company
VITE_ENABLE_GEOLOCATION=true
VITE_GEOFENCE_RADIUS_METERS=100
VITE_SYNC_INTERVAL_MS=30000     # Auto-sync every 30 sec when online
VITE_OFFLINE_TTL_MINUTES=60     # Cache API responses for 60 min
```

---

## Success Criteria

- [ ] Employee can punch in/out in < 3 taps (badge + clock in + confirm)
- [ ] Works offline; syncs automatically when online
- [ ] Large buttons (48dp) work with gloved input
- [ ] High contrast (7:1) readable in poor light
- [ ] No animations or transitions that confuse users
- [ ] "Offline" and "Pending" states clear and reassuring
- [ ] Keyboard shortcuts available for high-volume facilities
- [ ] Battery usage < 5% per 1000 punches
- [ ] Tested on 5-year-old Android tablets (2G network)

---

## Related Documents

- [CLAUDE.md](../../CLAUDE.md) — Architecture
- [WAVE-1-EXPERIENCE-BRIEF.md](../../docs/WAVE-1-EXPERIENCE-BRIEF.md) — Kiosk requirements
- ADR 0004 — Design system tokens

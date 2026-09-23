# Feedants Arena — Competition Details Feature

> **Technical Assignment — Full-Stack Competition Details Screen**
> Feedants | Senior Full-Stack Engineer Evaluation

---

## Project Overview

**Feedants Arena** is a full-stack monorepo for the "Competition Details Screen" feature of the Feedants competition platform. The platform allows participants to discover competitions, register, submit entries, and track results — all driven by a real backend and MongoDB database. Nothing on the screen is hardcoded; every data point is fetched dynamically from the REST API.

This repository contains:
- **`/backend`** — Node.js + Express.js REST API with Socket.IO, MongoDB (Mongoose), JWT auth
- **`/mobile`** — React Native (Expo) application with React Navigation, TanStack Query, and Zustand

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       MONOREPO ROOT                             │
│                  Arena/  (git root)                             │
│         ┌──────────────┐         ┌──────────────┐              │
│         │  /backend    │         │  /mobile     │              │
│         │  Node.js +   │◄───────►│  React Native│              │
│         │  Express     │  REST   │  (Expo SDK)  │              │
│         │  + Socket.IO │  JSON   │  + Socket.IO │              │
│         └──────┬───────┘         └──────────────┘              │
│                │                                                │
│                ▼                                                │
│         ┌─────────────┐                                         │
│         │  MongoDB    │                                         │
│         │  Atlas      │                                         │
│         │  (8 models) │                                         │
│         └─────────────┘                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow — Competition Details Screen

```
Mobile App
  │
  ├─► GET /api/v1/competitions/:slug
  │     Returns: title, tags, judge, prizes, dates, spots, rewards,
  │              disclaimers, referral settings
  │
  ├─► GET /api/v1/competitions/:id/registration-status  [auth]
  │     Returns: user's registration state → drives bottom CTA button
  │
  ├─► GET /api/v1/competitions/series/:seriesId/winners
  │     Returns: Previous Winners carousel data
  │
  ├─► Socket.IO room `competition:{competitionId}`
  │     Events: spots_updated, registration_closed
  │     Fallback: React Query polling every 15 seconds
  │
  └─► POST /api/v1/competitions/:id/register  [auth]
      POST /api/v1/competitions/:id/submit    [auth]
```

---

## Tech Stack

| Layer | Technology | Justification |
|---|---|---|
| Backend Runtime | Node.js + Express.js | Fast, event-driven, huge ecosystem |
| Database | MongoDB Atlas (Mongoose) | Flexible schema for competition + user data |
| Real-time | Socket.IO | Push spot-count updates to competition rooms |
| Authentication | JWT (access + refresh tokens) | Stateless, scalable across services |
| Mobile Framework | Expo (React Native, SDK 52) | Native video/share APIs + fast dev iterations |
| State Management | Zustand | Minimal boilerplate, granular subscriptions for high-freq UI state |
| Data Fetching | TanStack React Query v5 | Polling, caching, optimistic updates out-of-the-box |
| Navigation | React Navigation v7 | Industry standard for RN navigation |
| Validation | Joi (backend) | Expressive schema validation for Express routes |
| Payments | Razorpay | India's dominant payment gateway |

---

## Assumptions

1. A user authentication system already exists in the broader Feedants platform. For this assignment, a minimal auth stub (`POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh-token`) is implemented to identify the current user for registration and submission actions.
2. Media/video uploads will use a pre-signed URL flow (e.g., AWS S3 or Cloudinary) in production. In this assignment, a placeholder `mediaUrl` string is accepted.
3. All timestamps are stored in UTC in MongoDB and converted to IST on the client.
4. Razorpay credentials are test/sandbox keys for assignment scope.

---

## Technical Decisions

### 1. Expo (Managed Workflow) over React Native CLI
Expo SDK 52 provides production-ready native modules for everything needed on this screen (`expo-av`/`expo-video` for judge intro video and previous winners, `expo-clipboard` + `expo-sharing` for Refer & Earn, `expo-linear-gradient` for UI polish) without requiring custom native code. When native modules beyond Expo's SDK are needed, `npx expo prebuild` yields a full bare workflow.

### 2. Zustand for UI State
Unlike Redux Toolkit, Zustand does not require reducers/actions/slices for simple state transitions (active tab, modal visibility, countdown tick). Granular atom-like selectors prevent full-component re-renders when only `spotsBooked` or countdown changes — critical for a heavy scrollable screen.

### 3. TanStack React Query for Server State
Built-in `refetchInterval` enables polling for spots-left accuracy. `staleWhileRevalidate` provides instant renders from cache. Optimistic mutations ensure instant UI feedback on registration.

### 4. Socket.IO + Polling Hybrid for Real-time Spots
For thousands of concurrent users, broadcasting `spots_updated` only to clients in the `competition:{id}` room reduces needless DB reads. React Query polls every 15s as fallback when WebSocket disconnects (e.g. mobile background/foreground transitions).

### 5. REST over GraphQL
Competition screen data is hierarchical but well-defined. A single optimized aggregate endpoint returns all page data. HTTP cache headers and CDN caching are trivial with REST. GraphQL would add operational complexity (schema, resolvers, persisted queries) not warranted at this scope.

### 6. Compound Unique Index on Registration
`{ userId: 1, competitionId: 1 }` unique index prevents duplicate registrations under concurrency. Application-level `findOne` + `save` pattern suffers from TOCTOU (Time-of-Check to Time-of-Use) race conditions — the DB-level constraint is the only reliable guarantee.

### 7. Atomic `$inc` for Spot Booking
Spot booking uses `findOneAndUpdate({ _id, spotsBooked: { $lt: totalSpots } }, { $inc: { spotsBooked: 1 } })` to prevent overbooking. Never `doc.spotsBooked++` + `doc.save()` which is not atomic under concurrent requests.

---

## Trade-offs

| Decision | Trade-off |
|---|---|
| Expo Managed | Less raw native control vs CLI; mitigated by prebuild path |
| Zustand over Redux | Less opinionated structure; team discipline required |
| REST over GraphQL | Under-fetching if screen data grows complex across many fragments |
| Socket.IO | Extra infrastructure; polling fallback ensures resilience |
| Monorepo | Simpler for assignment review; production would use Turborepo workspaces or split repos |

---

## Database Models

| Collection | Purpose |
|---|---|
| `User` | Participant profile, referral code, refresh tokens |
| `Competition` | Core competition data, lifecycle dates, rewards |
| `Judge` | Referenced adjudicator profile (shared across competitions) |
| `Registration` | User ↔ Competition join; compound unique index prevents duplicates |
| `Submission` | Video entry per registered participant; 1-to-1 with Registration |
| `PreviousWinner` | Historical winners with series concept for recurring competitions |
| `Payment` | Razorpay order/payment tracking |
| `Referral` | Refer & Earn tracking; referral code → credited reward |

---

## Competition State Machine

The bottom CTA button progresses through the following states based on competition lifecycle:

```
UPCOMING → REGISTRATION_OPEN → REGISTRATION_CLOSED
                                      │
                               SUBMISSION_OPEN
                                      │
                              SUBMISSION_CLOSED
                                      │
                             RESULTS_DECLARED / CANCELLED
```

User CTA button text mapping:
- `REGISTRATION_OPEN` + not registered → **"Register Now"**
- `REGISTRATION_OPEN` + registered → **"Registered"** (disabled)
- `SUBMISSION_OPEN` + registered + no submission → **"Upload Submission"**
- `SUBMISSION_OPEN` + registered + submitted → **"Submission Uploaded"** (disabled)
- `RESULTS_DECLARED` → **"Results Announced"** (disabled)

---

## Setup Instructions

### Prerequisites
- Node.js >= 18
- MongoDB Atlas cluster (or local MongoDB replica set)
- Expo CLI: `npm install -g expo-cli`

### Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets
npm install
npm run dev
# Server starts on http://localhost:5000
# Health check: GET http://localhost:5000/api/v1/health
```

### Mobile Setup
```bash
cd mobile
cp .env.example .env
# Edit .env to point EXPO_PUBLIC_API_URL to your backend
npm install
npm start
# Scan QR code with Expo Go app or press 'a' for Android, 'i' for iOS
```

## Frontend User Journeys & Architecture

### 1. Registration + Payment Flow (Razorpay)
- **Bottom Sheet Modal (`RegistrationSheet.js`)**:
  - Displays entry fee breakdown: Base Fee, Referral Discount (if code applied via deep link or manual entry), Total Payable.
  - Razorpay checkout integration with Test Mode key support.
  - Full flow: Frontend requests order from backend → Backend generates order id → Frontend opens Razorpay Checkout → On success, sends `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` to backend → Backend verifies HMAC-SHA256 signature server-side → Backend atomically books the spot via MongoDB transaction → Frontend updates cache and `BottomActionBar` switches to "Registered".
- **Race Condition & Auto-Refund Handling**:
  - If another user snatches the last spot while the current user was on the checkout screen, the backend's atomic condition `spotsBooked: { $lt: totalSpots }` fails.
  - The backend catches this, automatically triggers an automatic refund stub via Razorpay (`paymentService.initiateRefund`), updates payment status to `REFUNDED`, and returns a clear `SPOTS_FILLED` error.
  - The mobile frontend immediately displays a clear explanation with refund details (100% refund, credit time).

### 2. Deep Link & Referral Handling
- **Supported Schemes**:
  - Custom URI: `feedants://competitions/:slug?ref=CODE`
  - Universal / App Links: `https://feedants.com/competitions/:slug?ref=CODE`
- **Behavior**:
  - React Navigation parses the `ref` query parameter and auto-applies the referral code inside `RegistrationSheet.js`.
- **Web Fallback (Production Architecture)**:
  - If the app is not installed, the universal HTTPS link opens a mobile web landing page.
  - The landing page presents competition details and routes the user to Google Play / App Store with deferred deep linking (via Branch.io / Firebase Dynamic Links), preserving the referral attribution across app installation.

### 3. Submission Upload & Edit Flow
- **Media Picker & Preview (`SubmissionUploadScreen.js`)**:
  - Uses `expo-image-picker` to select performance videos or photos.
  - Displays preview, resolution, duration, and file metadata.
- **Signed URL Upload Pattern**:
  - Client requests a pre-signed URL from `GET /api/competitions/:id/submissions/signed-url`.
  - Client uploads directly to cloud storage (S3/Cloudinary), tracking progress visually from 0% to 100%.
  - On upload completion, client confirms the submission with `POST /api/competitions/:id/submissions`.
- **Edit / Replace Before Deadline**:
  - If a user has already submitted, they can replace their submission as long as the submission window is active (`now <= competition.submissionEndAt`). Both client and server strictly enforce this deadline.
- **Urgent Deadline Warning**:
  - If `< 1 hour` remains before submission deadline, an urgent amber/red countdown banner alerts the user.

### 4. Authentication & Token Storage
- **Screens**: `LoginScreen.js` and `SignupScreen.js` with form validation and password visibility toggle.
- **Return-To-Screen Pattern**:
  - If an unauthenticated user attempts to register or submit, they are redirected to login with `returnTo` and `returnParams`, automatically resuming their intended journey upon authentication.
- **Token Storage Trade-off**:
  - *Production Best Practice*: `react-native-keychain` or `expo-secure-store` utilizing hardware-backed Keystores (Android TEE / iOS Secure Enclave) for encrypted token storage at rest.
  - *Trade-off Made*: Abstracted `secureStorage` adapter backed by `@react-native-async-storage/async-storage` for universal Expo Go execution without native compilation. Swapping to Keychain in production requires changing only the storage adapter.

### 5. Edge Case UX & Resiliency
- **Offline Detection Banner**: Real-time network detection via `@react-native-community/netinfo`. Shows an animated banner when offline, and flashes a green confirmation banner when connectivity resumes.
- **Silent Token Refresh (401 Interceptor)**: Axios interceptor intercepts 401 Unauthorized responses, silently refreshes the JWT access token using the stored refresh token, queues and retries pending requests. If refresh fails, it redirects to login preserving the current destination.
- **Double-Tap Debounce / Throttling**: Critical action buttons (`BottomActionBar`, `RegistrationSheet`, `SubmissionUploadScreen`) use leading-edge click throttling (`useThrottledCallback`) and in-flight disabled states to eliminate accidental double charges or duplicate submissions.

### 6. Notifications Architecture
- **Local Reminders (`notificationService.js`)**:
  - Schedules notifications for:
    1. "Registration closing in 1 hour"
    2. "Submission window opening"
- **Production Push Pipeline**:
  - FCM / APNs integration where device tokens are registered on login.
  - Backend event-driven workers (BullMQ + Redis) dispatch batch multicast pushes for deadline alerts and result announcements.

---

## Commit Convention

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat|fix|chore|docs|refactor|test|perf(scope): message
```

1. `feat(mobile): implement RegistrationSheet with Razorpay checkout integration`
2. `feat(backend): add payment order creation and signature verification endpoints`
3. `feat(mobile): handle registration race-condition and payment failure edge cases`
4. `feat(mobile): add deep linking support for referral-based competition entry`
5. `feat(mobile): implement SubmissionUploadScreen with progress and retry`
6. `feat(backend): support submission edit/replace before deadline with validation`
7. `feat(mobile): implement Login and Signup screens with secure token storage`
8. `feat(mobile): add offline detection banner and network-aware UI states`
9. `feat(mobile): implement silent token refresh and return-to-screen-after-login flow`
10. `feat(mobile): add local notifications for registration/submission deadline reminders`
11. `fix(mobile): debounce critical action buttons to prevent duplicate requests`
12. `perf(backend): add and verify database indexes for core query patterns`
13. `feat(backend): add Redis caching layer for competition details with cache invalidation`
14. `test(backend): add k6 load test script for concurrent registration scenario`
15. `fix(backend): security hardening — sanitization, CORS, CSP, rate limits, webhook verification`
16. `chore(backend): replace console logging with structured Winston logging and request IDs`
17. `feat(backend): add health and readiness check endpoints`
18. `perf(mobile): memoize components and optimize re-renders around live spots counter`
19. `perf(mobile): switch to cached image component and add error boundaries`
20. `chore: add Dockerfile, docker-compose, and GitHub Actions CI pipeline`

---

## Scalability, Security & Production Engineering

### 1. Database & Query Performance

#### Mongoose Indexes & Execution Plan (`.explain('executionStats')`)
All core queries use compound indexes and were verified using `backend/scripts/verify-indexes.js` to guarantee **`IXSCAN`** (Index Scan) and zero `COLLSCAN` (Collection Scans):
- **Competition Details**: Compound index `{ slug: 1, isActive: 1 }` enables direct single-document index lookups with 0ms execution time.
- **Series Winners**: `{ seriesId: 1, rank: 1 }` compound index sorts winners by podium rank directly on index pages without in-memory sorting (`hasSortStage: false`).
- **User Registrations**: `{ userId: 1, competitionId: 1 }` unique compound index guarantees deduplication and instant user status checks.
- **Submissions by Status**: `{ competitionId: 1, status: 1, submittedAt: -1 }` powers paginated judge/admin review feeds.

#### Unbounded Array Elimination & Pagination
All listing endpoints implement cursor or page-based pagination using `backend/src/utils/pagination.js`:
- `GET /api/competitions?page=1&limit=20`
- `GET /api/competitions/series/:seriesId/winners?page=1&limit=20`
- `GET /api/competitions/:id/submissions?page=1&limit=20`

#### Why Redis + Socket.IO Solve the "Thousands of Concurrent Users" Requirement
Under viral marketing campaigns or flash-registration windows, thousands of concurrent users open the competition details screen within seconds. 

- **The Problem with Direct MongoDB Reads**:
  If 10,000 users fetch the competition screen directly from MongoDB:
  1. The database connection pool is immediately saturated with 10,000 queries.
  2. Each query performs deep population (Judge document + Rewards array + Series Winners).
  3. Mongo CPU spikes to 100%, causing cascading query timeouts and blocking write transactions on the registration endpoint.
- **The Solution (Redis Cache-Aside + Socket.IO Push)**:
  1. **Cache-Aside Pattern**: `GET /api/competitions/:id` checks Redis first (`comp:details:<id>`). On cache hit, cached JSON is returned in **< 5ms** directly from RAM without touching MongoDB.
  2. **Event-Driven Write-Through Invalidation**: Whenever a write occurs (e.g. user registers, spot booked, status change), the backend updates MongoDB, deletes the stale cache keys in Redis (`comp:details:<id>` and `comp:details:<slug>`), and emits a WebSocket broadcast `spots_updated` to the room `competition:{id}`.
  3. **Longer Safe TTL**: Because active connected clients receive real-time push updates via Socket.IO, the Redis cache TTL can safely be 10–30 minutes without risk of users looking at stale data. If a user was disconnected or opens the screen fresh, they immediately hit the fresh Redis cache.

---

### 2. Concurrency Load Test Validation (Zero Overbooking)

To validate the spot-booking critical path under high concurrency, an automated load test was executed (`node backend/loadtest/registration.js`):
- **Scenario**: 500 concurrent virtual users race to confirm registration for a competition with **only 20 available spots**.
- **Results**:
  - **Successful Registrations (201 Created)**: Exactly **20**
  - **Spots-Filled Rejections (409 Conflict)**: Exactly **480**
  - **Internal Server Errors (500)**: **0**
  - **Overbooked Spots**: **0** (MongoDB `spotsBooked: 20 / 20`)
  - **Database Registration Documents**: Exactly **20**
  - **Duplicate User Records**: **0**

```
========================================================================
                       LOAD TEST SUMMARY RESULTS                         
========================================================================
Total Concurrent Virtual Users:     500
Total Test Execution Time:          21819ms (21.82s)
Throughput:                         23 req/sec
------------------------------------------------------------------------
Successful Bookings (201 Created):   20  (Target: EXACTLY 20)
Rejections (409 Spots Sold Out):    480  (Target: EXACTLY 480)
Unexpected / Server Errors (500):    0  (Target: 0)
------------------------------------------------------------------------
LATENCY METRICS:
  Min Latency:    127ms
  Avg Latency:    1087ms
  P50 (Median):   293ms
  P95 Latency:    7022ms
  P99 Latency:    13790ms
  Max Latency:    13892ms
------------------------------------------------------------------------
DATABASE INTEGRITY AUDIT:
  Competition spotsBooked:          20 / 20
  Registrations in MongoDB:         20
  Overbooked Spots:                 0
  Duplicate User Records:           0
========================================================================
┌─────────┬───────────────────────────────────────────────────────┬────────┐
│ (index) │ rule                                                  │ passed │
├─────────┼───────────────────────────────────────────────────────┼────────┤
│ 0       │ 'Exactly 20 successful bookings'                      │ true   │
│ 1       │ 'Exactly 480 spots-filled 409 responses'              │ true   │
│ 2       │ 'Zero 500 Internal Server Errors'                     │ true   │
│ 3       │ 'Zero database overbooking (spotsBooked <= 20)'       │ true   │
│ 4       │ 'Exact 20 Registration documents in database'         │ true   │
│ 5       │ 'Zero duplicate user bookings (Compound Index check)' │ true   │
└─────────┴───────────────────────────────────────────────────────┴────────┘

>>> SUCCESS: ALL CONCURRENCY ASSERTIONS PASSED! ZERO OVERBOOKING DETECTED. <<<
```

#### Additional Production Optimizations
1. **Asynchronous Side Effects with BullMQ**:
   - All non-critical side effects (sending confirmation emails, push notifications, generating GST invoices) are pushed to a Redis-backed BullMQ queue (`notification-queue`).
   - The registration API responds to the client immediately after the database transaction commits, maintaining sub-300ms p50 latency.
2. **MongoDB Connection Pool Tuning**:
   - `maxPoolSize: 50` and `minPoolSize: 10` configured in `db.js` to ensure the Node.js event loop does not starve under sudden spikes.

---

### 3. Security Hardening

- **NoSQL Injection Defense**: `express-mongo-sanitize` scrubs all incoming `req.body`, `req.query`, and `req.params`, stripping dangerous `$where`, `$gt`, and regex operators.
- **XSS Sanitization**: Custom `xssSanitizer` runs input strings through the `xss` library, neutralizing injected HTML or `<script>` tags in bio, comments, and submission text.
- **Strict CORS Whitelist**: Removed wildcard `*`. Whitelist allows only authorized web and mobile origins (`localhost:3000`, `localhost:8081`, `exp://`, `https://arena-wog5.onrender.com`).
- **Helmet Content Security Policy (CSP)**: Strict headers configured in `app.js` preventing clickjacking (`frame-ancestors 'none'`) and restricting script/style evaluation.
- **Per-Route Rate Limiting**:
  - `authLimiter`: 10 attempts per 15 minutes (mitigates credential stuffing).
  - `registrationLimiter`: 30 requests per minute per IP.
  - `webhookLimiter`: 120 requests per minute.
  - `globalLimiter`: 300 requests per 15 minutes.
- **Razorpay Webhook Verification**:
  - Validates `x-razorpay-signature` using HMAC-SHA256 with `crypto.timingSafeEqual` to prevent timing attacks.
  - Rejects tampered webhooks with 401 Unauthorized and logs security alerts.
- **Sensitive Data Masking**:
  - Winston logger automatically scrubs passwords, JWT tokens, credit card details, and Razorpay signatures before writing to disk/stdout.
- **JWT Key Rotation Strategy**:
  - Access tokens have short 15-minute TTL to reduce blast radius.
  - Refresh tokens have 7-day TTL and are stored securely.
  - Production key rotation implements dual-key verification (active + previous key) for a 24-hour overlap window.
- **Dependency Audit**:
  - `npm audit` on backend: **0 vulnerabilities**.

---

### 4. Observability & Health Probes

- **Structured Logging (Winston)**:
  - Generates JSON structured logs in production with timestamp, log level, service tag, duration, and error stacks.
  - **Traceability / Correlation ID**: `requestLoggerMiddleware` injects an `X-Request-Id` header (using `uuidv4`) into every request and attaches child loggers `req.logger` so all logs across the request lifecycle share the same correlation ID.
- **Orchestration Probes**:
  - **Liveness Probe (`GET /health`)**: Returns 200 if the Node.js event loop is healthy.
  - **Readiness Probe (`GET /ready`)**: Pings MongoDB via `admin().ping()` and verifies Redis connection latency before allowing Kubernetes/Render load balancers to route traffic.
- **APM & Metrics Integration (Prometheus / Grafana / Datadog)**:
  - Structured logs capture `durationMs`, `statusCode`, and `route`.
  - For production, `prom-client` metrics endpoints can be added at `/metrics` exporting:
    - `http_request_duration_seconds{method, route, status_code}`
    - `registration_attempts_total{status="success|conflict|error"}`
    - `mongodb_pool_available_connections`

---

### 5. Mobile App Performance

- **Elimination of Unnecessary Re-renders**:
  - Extracted the Socket.IO-driven spots indicator into an isolated, memoized component: `LiveSpotsTracker.js`.
  - When Socket.IO broadcasts `spots_updated`, **ONLY `LiveSpotsTracker` re-renders**. The parent `CompetitionHeaderCard` and the overall `CompetitionDetailsScreen` remain un-rendered.
  - `BottomActionBar`, `JudgeCard`, and `PreviousWinnersCarousel` are wrapped in `React.memo`.
  - Action handlers (`handleCtaAction`) are memoized with `useCallback`.
- **Image Caching with `expo-image`**:
  - Replaced standard React Native `Image` with `expo-image` in `JudgeCard` and `PreviousWinnersCarousel`.
  - Configured `cachePolicy="memory-disk"` and smooth fading transitions (`transition={150}`), ensuring image assets are cached locally across app restarts.
- **Error Boundaries**:
  - Created `ErrorBoundary.js` with fallback error cards and retry buttons.
  - Wrapped each section (`Header Card`, `Judge Card`, `Winners Carousel`, `Rewards Table`, `Referral Card`) in individual error boundaries. If an unexpected runtime error occurs in one card, the rest of the competition screen functions normally.
- **Bundle Size Optimization**:
  - Heavy features (`SubmissionUploadScreen`, `VideoPlayerModal`) are separated and loaded lazily through React Navigation.
  - Unused Expo SDK modules excluded; bundle analysis via `npx expo-bundle-analyzer` to ensure bundle stays lean.

---

### 6. Deployment & CI/CD

- **Multi-Stage `Dockerfile`**:
  - Stage 1: Builds dependencies.
  - Stage 2: Prunes to production-only modules (`npm ci --only=production`).
  - Stage 3: Runs non-root user (`USER node`) on Alpine with `dumb-init` for PID 1 signal forwarding and container healthchecks.
- **Docker Compose (`docker-compose.yml`)**:
  - Spins up the entire stack with a single command:
    ```bash
    docker-compose up --build
    ```
  - Includes:
    1. `backend`: Production Node.js container on port 5000.
    2. `mongo`: MongoDB 7.0 container configured as a single-node replica set `rs0` (required for ACID multi-document transactions).
    3. `redis`: Redis 7.2 Alpine container configured with 256MB LRU eviction policy.
- **GitHub Actions Pipeline (`.github/workflows/ci.yml`)**:
  - Automated CI triggered on every push and PR to `main`:
    1. Installs clean dependencies (`npm ci`).
    2. Runs ESLint code quality gates.
    3. Executes automated tests against live containerized MongoDB and Redis services.
    4. Validates Docker multi-stage build.
- **Environment Documentation**:
  - Complete `.env.example` in both root and backend directories documenting all runtime variables, security keys, and rotation procedures.


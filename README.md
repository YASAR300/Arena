# 🏆 Feedants Arena — Competition Platform

> **Assignment Submission** · Full-stack mobile competition platform (React Native + Node.js)

---

## Project Overview

Feedants Arena is a production-grade online competition platform that lets participants discover, register for, and submit entries to creative competitions. The system is built as a **React Native (Expo) mobile application** backed by a **Node.js/Express REST API** with **MongoDB** for persistence, **Redis** for high-read caching, **Socket.IO** for real-time spot updates, and **Razorpay** for payment processing. The architecture is designed to handle thousands of concurrent users safely — atomic MongoDB operations prevent overbooking, compound unique indexes enforce one-registration-per-user at the database level, a Redis cache-aside layer absorbs read traffic, and an express-rate-limiter guards payment endpoints. The mobile app implements instant tab switching (all panes rendered in memory with `opacity` + `pointerEvents` — zero remount, zero flicker), bilingual UI (English / Hindi), push-notification reminders, and an Expo-Go compatible pure-JS notification layer.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Mobile Framework | Expo / React Native | SDK 57 | Cross-platform iOS + Android app |
| Navigation | React Navigation v7 | 7.x | Stack + tab navigation |
| State / Data | Zustand + TanStack Query | 5.x | Auth state + server data caching |
| HTTP Client | Axios | 1.x | REST API calls + token interceptors |
| Real-time | Socket.IO client | 4.x | Live spots counter |
| Backend Framework | Express.js | 4.x | REST API + middleware chain |
| Database | MongoDB Atlas (Mongoose) | 8.x | Persistent data storage |
| Cache | Redis (ioredis) | 7.2 | 3-min competition cache-aside |
| Auth | JWT (RS256) | jsonwebtoken | Access (15 min) + Refresh (7 day) tokens |
| Payments | Razorpay | Test mode | Entry fee checkout + webhook verification |
| Logging | Winston | 3.x | Structured JSON logs |
| Real-time transport | Socket.IO | 4.x | WebSocket + polling fallback |
| Containerisation | Docker + docker-compose | 27.x | Local dev stack |
| CI | GitHub Actions | — | Lint + test on push |

---

## Architecture Diagram

```mermaid
graph TB
    subgraph Mobile["📱 React Native App (Expo SDK 57)"]
        UI[UI Screens]
        TQ[TanStack Query Cache]
        ZS[Zustand Auth Store]
        SIO[Socket.IO Client]
    end

    subgraph Backend["🖥️ Node.js / Express API"]
        AUTH[Auth Controller]
        COMP[Competition Controller]
        REG[Registration Controller]
        SUB[Submission Controller]
        WH[Webhook Controller]
        JOB[Lifecycle Cron Job]
    end

    subgraph Infra["☁️ Infrastructure"]
        MONGO[(MongoDB Atlas)]
        REDIS[(Redis Cache)]
        RZP[Razorpay Gateway]
        S3[Cloud Storage\nSigned Upload URL]
    end

    UI -- REST / JSON --> AUTH
    UI -- REST / JSON --> COMP
    UI -- REST / JSON --> REG
    UI -- REST / JSON --> SUB
    SIO -- WebSocket --> Backend
    TQ -- cache-aside --> REDIS
    COMP -- 3-min TTL --> REDIS
    AUTH --> MONGO
    COMP --> MONGO
    REG -- atomic findOneAndUpdate --> MONGO
    SUB --> MONGO
    REG -- create order --> RZP
    WH -- payment.captured --> RZP
    SUB -- signed URL --> S3
    JOB -- every 1 min --> MONGO
```

---

## Folder Structure

```
Arena/
├── backend/                  # Node.js/Express API server
│   ├── src/
│   │   ├── app.js            # Express app setup (middleware, routes, Swagger)
│   │   ├── server.js         # HTTP + Socket.IO server startup
│   │   ├── config/           # Logger (Winston), DB connection
│   │   ├── controllers/      # Route handlers (auth, competition, registration, submission…)
│   │   ├── jobs/             # node-cron lifecycle status updater (runs every minute)
│   │   ├── middlewares/      # Auth, validation, sanitization, rate-limiter
│   │   ├── models/           # Mongoose schemas (User, Competition, Registration, Submission…)
│   │   ├── routes/           # Express routers (auth, competition, registration, submission…)
│   │   ├── seeds/            # Database seed script (sample competition + demo user)
│   │   ├── services/         # Business logic (competition details, cache, auth tokens)
│   │   └── utils/            # AsyncHandler, ApiError, ApiResponse, pagination helpers
│   ├── Dockerfile            # Production container image
│   ├── package.json
│   └── .env.example
│
├── mobile/                   # Expo / React Native mobile app
│   ├── App.js                # Root component (NavigationContainer + QueryClientProvider)
│   ├── src/
│   │   ├── api/              # Axios client, competition API, shared QueryClient
│   │   ├── assets/           # Static images and fonts
│   │   ├── components/       # Reusable UI components (BottomActionBar, JudgeCard, etc.)
│   │   ├── constants/        # Theme tokens (colors, spacing, typography)
│   │   ├── hooks/            # Custom hooks (useCompetitionDetails, mutations)
│   │   ├── i18n/             # Bilingual strings (English + Hindi) via LanguageContext
│   │   ├── navigation/       # AppNavigator, routes, linking config, navigationRef
│   │   ├── screens/          # Screens (CompetitionDetails, Home, Explore, Profile, Login…)
│   │   ├── services/         # NotificationService (Expo Notifications scheduling)
│   │   ├── store/            # Zustand auth store + SecureStore session persistence
│   │   └── utils/            # Debounce/throttle helpers
│   ├── package.json
│   └── .env.example
│
├── docker-compose.yml        # Local dev stack (backend + MongoDB replica set + Redis)
├── .env.example              # Root env template
└── README.md
```

---

## Database Schema Diagram

```mermaid
erDiagram
    User {
        ObjectId _id PK
        string name
        string email UK
        string phone UK
        string passwordHash
        string avatarUrl
        string referralCode UK
        string[] refreshTokens
        Date createdAt
    }

    Judge {
        ObjectId _id PK
        string name
        string photoUrl
        string designation
        number experienceYears
        string bio
        string introVideoUrl
        boolean isActive
    }

    Competition {
        ObjectId _id PK
        string title
        string slug UK
        string[] categoryTags
        string about
        string judgingCriteria
        string rules
        number prizePool
        number entryFee
        number totalSpots
        number spotsBooked
        Date registrationStartAt
        Date registrationEndAt
        Date submissionStartAt
        Date submissionEndAt
        Date resultDate
        string status
        ObjectId judge FK
        RewardTier[] rewards
        boolean isActive
    }

    Registration {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId competitionId FK
        Date registeredAt
        number entryFeePaid
        ObjectId paymentId FK
        string status
    }

    Payment {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId competitionId FK
        string razorpayOrderId UK
        string razorpayPaymentId
        string razorpaySignature
        number amount
        string currency
        string status
    }

    Submission {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId competitionId FK
        string title
        string mediaUrl
        number durationSeconds
        string status
        Date submittedAt
    }

    PreviousWinner {
        ObjectId _id PK
        string participantName
        number rank
        string rankLabel
        string photoUrl
        string videoUrl
        string seriesId
        string season
    }

    Referral {
        ObjectId _id PK
        ObjectId referrerId FK
        ObjectId refereeId FK
        string referralCode
        number rewardAmount
        string status
    }

    User ||--o{ Registration : "registers"
    Competition ||--o{ Registration : "has"
    User ||--o{ Submission : "submits"
    Competition ||--o{ Submission : "receives"
    Registration ||--o| Payment : "paid via"
    Judge ||--o{ Competition : "adjudicates"
    User ||--o{ Referral : "refers"
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| **Auth** | | | |
| POST | `/api/auth/signup` | Public | Create account (name, email, phone, password) |
| POST | `/api/auth/login` | Public | Login with email/phone + password → JWT pair |
| POST | `/api/auth/refresh-token` | Public | Exchange refresh token for new access token |
| POST | `/api/auth/logout` | Bearer | Revoke refresh token |
| **Competitions** | | | |
| GET | `/api/competitions` | Public | Paginated competition list (filter by category/status) |
| GET | `/api/competitions/:idOrSlug` | Optional Bearer | Full competition details + `currentUserState` (Redis cached 3 min) |
| GET | `/api/competitions/:id/spots` | Public | Lightweight spots polling (cached 30 s) |
| GET | `/api/competitions/series/:seriesId/winners` | Public | Paginated previous winners for a series |
| **Registration** | | | |
| POST | `/api/competitions/:id/register/initiate-payment` | Bearer | Create Razorpay order for entry fee |
| POST | `/api/competitions/:id/register/confirm` | Bearer | Verify payment signature → atomic spot booking |
| POST | `/api/competitions/:id/register/cancel` | Bearer | Cancel registration (blocked after submission opens) |
| **Submissions** | | | |
| GET | `/api/competitions/:id/submissions/signed-url` | Bearer | Get pre-signed S3/GCS upload URL |
| POST | `/api/competitions/:id/submissions` | Bearer | Save submission metadata after upload |
| PUT | `/api/competitions/:id/submissions` | Bearer | Replace/update existing submission |
| GET | `/api/competitions/:id/submissions/me` | Bearer | Fetch current user's own submission |
| GET | `/api/competitions/:id/submissions` | Bearer | List all submissions (admin) — paginated |
| **Misc** | | | |
| GET | `/api/competitions/:id/previous-winners` | Public | Previous winners for a competition |
| GET | `/api/judges/:id` | Public | Judge profile |
| GET | `/api/users/me/referral-code` | Bearer | Get my referral code + share URL |
| POST | `/api/referrals/redeem` | Public | Apply referral code to a registration |
| **Webhooks** | | | |
| POST | `/api/webhook/razorpay` | HMAC-SHA256 | Handle `payment.captured` / `payment.failed` events |
| **Health** | | | |
| GET | `/api/health` | Public | Liveness check (uptime, memory, version) |
| GET | `/api/health/ready` | Public | Readiness check (MongoDB + Redis connectivity) |
| GET | `/api/docs` | Public | Swagger UI documentation |

---

## Setup & Run Instructions

### Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Node.js | 18.x LTS | `node --version` |
| npm | 9.x | bundled with Node |
| MongoDB | 7.0 (or Atlas free tier) | Atlas recommended; replica set required for transactions |
| Redis | 7.x | `redis-server` locally **or** Redis Cloud free tier |
| Android Studio | Giraffe / Hedgehog | For Android emulator |
| Xcode | 15+ | macOS only, for iOS simulator |
| Watchman | Latest | macOS only — `brew install watchman` |
| Java JDK | 17 (LTS) | Required by Android build tools |
| Expo CLI | Latest | `npm install -g expo-cli` (optional — `npx expo` also works) |

---

### 1 · Clone the Repository

```bash
git clone https://github.com/YASAR300/Arena.git
cd Arena
```

---

### 2 · Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create your local environment file
cp ../.env.example .env   # or: copy .env.example .env  (Windows)

# Edit .env — fill in at minimum:
#   MONGODB_URI   — your Atlas connection string (or mongodb://localhost:27017/feedants_arena)
#   REDIS_URL     — redis://127.0.0.1:6379  (if running Redis locally)
#   JWT_ACCESS_SECRET / JWT_REFRESH_SECRET — any random 32+ character strings
#   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET   — from Razorpay test dashboard

# Start the development server
npm run dev
# → Server listening on http://localhost:5000
# → Swagger UI at  http://localhost:5000/api/docs
# → Health check at http://localhost:5000/api/health
```

**Alternative — Docker (runs backend + MongoDB replica set + Redis together):**

```bash
# From the Arena/ root directory
docker-compose up --build

# Backend will be at http://localhost:5000
# MongoDB at        mongodb://localhost:27017
# Redis at          redis://localhost:6379
```

Confirm the server is healthy:

```bash
curl http://localhost:5000/api/health
# Expected: {"success":true,"data":{"status":"healthy",...}}
```

---

### 3 · Seed the Database

```bash
# From the backend/ directory (with .env loaded)
npm run seed
```

This creates:
- **1 Judge** — Manju Dubey, Professional Kathak Dancer, 12+ years experience
- **4 Previous Winners** — Riya Shah (1st), Aarav Mehta (1st), Neha Verma (2nd), Ishita Chokshi (3rd)
- **1 Competition** — "Feedants Classical Dance" · ₹1,500 prize pool · ₹99 entry fee · 20 spots (1 booked) · all 6 reward tiers · live registration + submission windows
- **1 Demo user** — `demo@feedants.com` / `password123`

After seeding, the app immediately shows the **exact screen from the design reference**.

---

### 4 · Mobile App Setup

```bash
cd mobile   # from Arena/ root: cd mobile

# Install JavaScript dependencies
npm install

# Create your local environment file
cp ../.env.example .env

# Edit .env — set EXPO_PUBLIC_API_URL:
#   Local backend:  EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api   (Android emulator)
#   Local backend:  EXPO_PUBLIC_API_URL=http://localhost:5000/api   (iOS simulator)
#   Render deploy:  EXPO_PUBLIC_API_URL=https://arena-wog5.onrender.com/api

# Start Metro bundler
npm start          # or: npx expo start -c  (clears cache)

# Run on Android emulator  (Android Studio must be open with an AVD running)
npm run android    # or: npx expo run:android

# Run on iOS simulator  (macOS + Xcode required)
npm run ios        # or: npx expo run:ios

# Run in Expo Go on a physical device
# → Scan the QR code printed by Metro with the Expo Go app
```

> **Note:** This project uses **Expo Go** (pure-JS mode). No `npx expo prebuild` or native compilation steps are needed for running in Expo Go. The Razorpay integration uses a custom React Native WebView modal instead of the native SDK to preserve Expo Go compatibility.

---

### 5 · iOS Pod Install (native build only)

```bash
# Only needed if running via 'npx expo run:ios' (not Expo Go):
cd mobile
npx expo prebuild --platform ios
cd ios
pod install
cd ..
npx expo run:ios
```

---

## Required Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example | Required |
|---|---|---|---|
| `PORT` | HTTP server port | `5000` | Optional (default: 5000) |
| `NODE_ENV` | Environment mode | `development` | Optional (default: development) |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/feedants_arena` | **Required** |
| `REDIS_URL` | Redis connection URL | `redis://127.0.0.1:6379` | Optional (cache disabled gracefully without it) |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens | `at_least_32_random_chars_here` | **Required** |
| `JWT_ACCESS_EXPIRATION` | Access token lifetime | `15m` | Optional (default: 15m) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | `another_32_random_chars_here` | **Required** |
| `JWT_REFRESH_EXPIRATION` | Refresh token lifetime | `7d` | Optional (default: 7d) |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID | `rzp_test_xxxxxxxxxxxxxxxx` | **Required** for payments |
| `RAZORPAY_KEY_SECRET` | Razorpay API Key Secret | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | **Required** for payments |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification secret | `webhook_secret_here` | **Required** for webhooks |
| `CORS_ORIGIN` | Comma-separated allowed origins | `http://localhost:8081,http://localhost:19006` | Optional |
| `LOG_LEVEL` | Winston log level | `info` | Optional (default: info) |

### Mobile (`mobile/.env`)

| Variable | Description | Example | Required |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | Backend REST API base URL | `http://10.0.2.2:5000/api` | **Required** |
| `EXPO_PUBLIC_ENV` | Environment label | `development` | Optional |

---

## Assumptions Made

- **Single submission per user per competition** — a user may submit once; a `PUT /submissions` endpoint replaces the existing submission before the submission window closes.
- **"Multi-Win" category tag** — this is a display-only tag on the `categoryTags` array (type `string[]`) indicating the competition awards prizes to multiple rank positions, not just 1st place. No special business logic is gated on this tag.
- **All timestamps stored in UTC** — the mobile client is responsible for converting to local time using `Date` and `Intl.DateTimeFormat`. The API never applies timezone offsets.
- **Registration lifecycle is irrevocable after `submissionStartAt`** — cancel endpoint returns 400 if submission window is open; this matches the refund policy text shown in the design.
- **Referral reward is a flat ₹10 discount on the entry fee** — it is applied at payment initiation time and deducted from the Razorpay order amount. The referrer credit (₹10 wallet credit) is created as a `Referral` document but wallet payout is marked as a future task (out of scope for assignment).
- **Payment confirmation via Razorpay HMAC signature** — the `confirmRegistration` endpoint validates the Razorpay `razorpay_signature` using `HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, keySecret)`. In test mode, a mock signature is accepted by the mobile app's fallback path.
- **Spot booking is atomic at the database layer** — `Competition.findOneAndUpdate({ _id, spotsBooked: { $lt: totalSpots } }, { $inc: { spotsBooked: 1 } })` prevents overbooking under concurrent requests without application-level locks.
- **A duplicate registration attempt (same userId + competitionId) returns HTTP 409** — MongoDB compound unique index `{ userId: 1, competitionId: 1 }` enforces this at the storage level.
- **Push notifications are scheduled client-side using Expo Notifications** — the backend sends no push notifications. This was chosen for Expo Go compatibility (no custom native build required). In production, APNs/FCM would be used via a server-side notification service.
- **Redis is optional** — if `REDIS_URL` is not set or Redis is unavailable, the cache service falls back gracefully to direct MongoDB reads with a console warning.
- **`status` field on Competition is "soft status"** — `calculateDerivedStatus()` recomputes the live lifecycle from timestamps at query time. The stored `status` field is updated by a background cron job every minute but is NOT the source of truth for CTA decisions (timestamps are).
- **Previous Winners are per `seriesId` (competition slug)** — "Season N" winners from past runs of the same competition type are grouped by the competition's slug, not by MongoDB `_id`, allowing new competition documents to inherit winner history.
- **The assignment requires support for "thousands of concurrent users"** — this was addressed through: Redis caching (3-min TTL on competition details), atomic MongoDB spot booking, rate limiting on payment/registration endpoints (5 req/min/IP), and a Socket.IO spots broadcast on every confirmed registration.
- **Session management uses in-memory + SecureStore** — the access token is stored in memory (`inMemoryAccessToken`) for the fastest possible API request attachment; the refresh token and user object are persisted in Expo SecureStore for session restoration across app restarts.

---

## Major Technical Decisions

- **TanStack Query instead of Redux** — Competition data is server state (fetched, cached, and invalidated), not UI state. TanStack Query handles cache invalidation, background refetch, stale-while-revalidate, and loading states natively. Redux would add unnecessary boilerplate for this use case.

- **REST instead of GraphQL** — The data shape is well-defined and stable (one competition detail payload, one registration flow). REST with OpenAPI/Swagger is simpler to test, document, and reason about. GraphQL would be warranted if the client needed highly variable field selections across many resources.

- **Socket.IO + Redis for real-time spot updates** — Socket.IO provides automatic WebSocket → long-polling fallback for unreliable mobile networks. Redis pub/sub (via the `ioredis` adapter) allows horizontal scaling with multiple server instances. A polling-only approach would add unnecessary latency; pure WebSocket-only would fail silently on poor connections.

- **Atomic MongoDB `$inc` + `$lt` for concurrency safety** — Application-level "check then write" patterns fail under concurrent requests. A single atomic `findOneAndUpdate` with a conditional filter (`spotsBooked: { $lt: totalSpots }`) moves the race condition check into MongoDB's document-level lock, guaranteeing zero overbooking.

- **JWT access (15 min) + refresh (7 day) token pair** — Short-lived access tokens limit the blast radius if a token is intercepted. Refresh tokens are stored per-user as an array in MongoDB, enabling targeted revocation (logout from one device) or full revocation (all devices).

- **Cache-aside (lazy) pattern for Redis** — On first read the backend populates Redis; subsequent reads skip MongoDB entirely. TTL of 3 minutes on competition details and 30 seconds on spots data balances freshness with load reduction. The `currentUserState` object is intentionally NOT cached in Redis (it's computed per-user on every request) to prevent cross-user state leakage.

- **User-scoped TanStack Query key** — The competition query key is `['competition', slug, userId]`. This ensures a new user (or a user who just logged in/out) always gets a fresh fetch with their correct personalized CTA state rather than serving another user's cached result.

- **`opacity + pointerEvents` tab switching instead of `display: none`** — React Native's `display: 'none'` removes a node from the Android layout tree on every hide, causing layout recalculations and flicker. All tab panes are rendered in memory at all times; hidden panes use `opacity: 0 + pointerEvents: 'none'` for instant visual-only toggling with zero side effects.

- **Monorepo structure** — `backend/` and `mobile/` live in the same repository for a single source of truth during assignment development. Shared `.env.example` and a root-level `docker-compose.yml` simplify reviewer setup.

- **Expo Go-compatible pure-JS architecture** — No custom native modules (no `expo-notifications` native, no Razorpay native SDK). This allows the evaluator to run the app by scanning a QR code in Expo Go without installing Android Studio or Xcode.

---

## Trade-offs Considered

- **Razorpay WebView modal vs native SDK** — Chose a custom `WebView`-based checkout modal so the app runs in Expo Go without a native build. Trade-off: the checkout UI is less polished than the native SDK (no fingerprint auth, no saved UPI VPAs). Acceptable for assignment scope; production would use `react-native-razorpay` with a prebuild.

- **Client-side notification scheduling vs APNs/FCM** — Expo Notifications schedules reminders locally on the device. Trade-off: notifications only fire if the app has been opened at least once on the device; a server push would fire unconditionally. The client approach requires zero backend infrastructure for notifications, which was the deciding factor for assignment scope.

- **Socket.IO polling fallback vs pure WebSocket** — Socket.IO adds ~12 KB to the bundle and may fall back to HTTP long-polling on very restricted networks. Trade-off: higher latency on fallback (~3 s vs ~50 ms) but guaranteed delivery. Chosen over a raw WebSocket for reliability on Indian mobile networks with variable connectivity.

- **Redis TTL 3 min for competition details** — Spots count can be slightly stale for up to 3 minutes between a registration and the next cache eviction. A Socket.IO push invalidates the spots counter in real time, but the full competition payload (dates, rewards, judge) is cached. Trade-off: slightly stale secondary data vs significantly reduced MongoDB read load under high traffic.

- **`display: 'flex'` → `opacity: 0` for hidden tabs** — `display: 'none'` would be slightly more memory-efficient (no GPU compositing layer for hidden panes). `opacity: 0` keeps all panes in the render tree and composited. Trade-off: ~4× more GPU layers vs zero-flicker instant switching. Accepted because modern devices handle 4 composited full-screen layers trivially.

- **In-memory access token storage** — The access token lives in a JS variable, not AsyncStorage. This means the access token is lost on app restart (handled by the refresh token flow). Trade-off: tokens cannot be read by other processes (more secure than AsyncStorage which is unencrypted) but requires a refresh-token round-trip on every app cold start.

---

## What I'd Improve / Change For Real Production

- **Split monorepo** — Separate `backend/` into its own repository/service with independent versioning, deploy pipelines, and teams. Consider a dedicated `packages/shared-types` for TypeScript interfaces shared between mobile and backend.
- **Proper CDN for media** — Use Cloudflare R2 or AWS CloudFront in front of the storage bucket. Signed upload URLs already point to cloud storage, but a CDN is needed for fast video streaming to participants across India.
- **Full APNs/FCM push notification infrastructure** — Replace client-side Expo Notifications with a server-side notification service (Firebase Admin SDK or Expo Push API with server tokens) so reminders fire even on devices that haven't opened the app recently.
- **Admin dashboard** — A React web admin panel for organizers to: manage competitions, view all submissions, update lifecycle status manually, export participant lists, and trigger prize disbursements.
- **Judge portal** — A separate authenticated view for judges to review and score submissions within the platform rather than via email/spreadsheet.
- **Full i18n** — Extend the bilingual system (currently English/Hindi on the competition details screen) to every screen in the app. Use `i18next` with a dedicated translations file per language.
- **Automated E2E testing with Detox** — Add Detox E2E tests covering the registration → payment → upload flow. Add Maestro flows for CI smoke tests.
- **Observability stack** — Add Datadog or Grafana/Prometheus + Loki for metrics, distributed traces (OpenTelemetry), and structured log aggregation in production. Currently only Winston JSON logs to stdout.
- **Feature flags** — Add LaunchDarkly or a simple home-grown feature flag service to gate new competition types, UI experiments, and backend rollouts without a redeploy.
- **Multi-region MongoDB** — Use MongoDB Atlas Global Clusters with read replicas in Mumbai and Singapore to reduce latency for Indian users and provide geo-redundancy.
- **Wallet / payout system** — Implement the ₹10 referral credit as an actual wallet balance that can be applied to future entry fees or paid out via UPI.
- **TypeScript migration** — Move both projects to TypeScript for better type safety at the mobile/API boundary (shared DTO types).
- **Proper secret management** — Use AWS Secrets Manager or HashiCorp Vault for rotating JWT secrets and Razorpay API keys, rather than environment variables in a `.env` file.

---

## Known Limitations

- **Razorpay in test mode only** — The app uses Razorpay test credentials. Real payment flow requires live credentials and an approved Razorpay business account.
- **No real file upload** — The submission upload screen generates a signed URL but the actual media upload to S3/GCS and CDN delivery is mocked. In a real deployment the pre-signed URL from `GET /submissions/signed-url` would be used with a `PUT` directly to the storage provider.
- **Referral wallet credit is recorded but not redeemable** — The `Referral` document is created (so the referrer's ₹10 is tracked), but there is no wallet balance UI or UPI payout flow within assignment scope.
- **Socket.IO spots updates require the backend to be the same process** — The current implementation broadcasts within a single Node.js process. A horizontally scaled deployment would need the Redis adapter (`@socket.io/redis-adapter`) wired up (the `ioredis` dependency is present, wiring is a 5-line addition).
- **No admin auth role** — The `GET /submissions` list endpoint is `protect`-guarded but any authenticated user can call it. A production system would add a `role: 'admin'` field to `User` and an `isAdmin` middleware guard.
- **Expo Go limitations** — Deep links (referral URLs like `feedants://r/CODE`) work correctly in a development build but require a custom URI scheme in `app.json` and a production Expo build for reliable handling on physical devices via Expo Go.
- **iOS not tested** — Development and testing were done exclusively on Android emulator + Android physical device. The code is written to be cross-platform but iOS-specific edge cases (safe area insets, font rendering) may need minor adjustments.
- **Background lifecycle cron is single-process** — The `node-cron` job updates competition `status` every minute but only runs in the same process as the API. A production system would run this as a separate worker or use a managed scheduler.

---

## Screen Recording

📹 Screen recording demonstrating the full working flow: **[LINK — to be added after recording]**

### Recording Script

Record the following numbered steps in a single continuous session (estimated 8–10 minutes):

1. **Cold start** — Launch the app on a physical Android device or emulator. Show the login screen appearing (auth guard in place — cannot access home without login).
2. **New account creation** — Tap "Create Account", fill name/email/phone/password, submit. Confirm the competition details screen appears immediately with **"Not Registered"** pill and **"Register Now • ₹99 Entry Fee"** button. *(Proves new accounts are never auto-registered.)*
3. **Competition information is dynamic** — Scroll through the full competition screen. Call out: judge name, prize pool ₹1,500, entry fee ₹99, "1 / 20 Booked" spots counter, countdown timer ticking live, all 6 reward tiers, 4 previous winners carousel, important dates grid.
4. **Registration → payment flow** — Tap "Register Now". Show the RegistrationSheet bottom sheet with Login/Signup card (for unauthenticated users) or Proceed-to-Pay button (for authenticated users). Tap "Proceed to Pay ₹99". Show the Razorpay checkout modal. Complete test payment. Confirm "Registration Confirmed 🎉" alert appears.
5. **State change after registration** — Show the competition screen re-fetching: "Registered" pill now appears, button changes to "Upload Submission • Registered".
6. **Live spots update** *(two-device/two-emulator proof)* — Open the app simultaneously on a second device/emulator with a different account. On device 1: complete a registration. Within 2–3 seconds, show the spots counter updating on device 2 via Socket.IO push. *(Proves real-time concurrency handling.)*
7. **Tab switching** — Tap Home, Explore, Profile, Competitions tabs in quick succession. All switch instantly with zero reload, zero white flash. *(Proves in-memory tab rendering.)*
8. **Language switch** — Tap "हिंदी" on the header. Show all labels switch to Hindi instantly. Tap "ENG" to switch back.
9. **Countdown timer** — Leave the app on the competition screen for 10 seconds. Show the countdown decrementing in real time.
10. **Logout → login again** — Logout from Profile. Confirm login screen appears. Log back in with the registered account. Confirm competition screen shows "Registered" state correctly restored from backend.
11. **Health endpoints** — Show in a browser or Postman: `GET /api/health` → `{"status":"healthy"}` and `GET /api/docs` → Swagger UI.

---

## License

ISC — Feedants Engineering, 2026

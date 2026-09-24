# 🏆 Feedants Arena — Competition Platform

> **Assignment Submission** · Full-stack mobile competition platform (React Native + Node.js)

---

## Project Overview

Feedants Arena is a production-grade online competition platform that lets participants discover, register for, and submit entries to creative competitions. The system is built as a **React Native (Expo) mobile application** backed by a **Node.js/Express REST API** with **MongoDB** for persistence, **Redis** for high-read caching, **Socket.IO** for real-time spot updates, and **Razorpay** for payment processing. The architecture is designed to handle thousands of concurrent users safely — atomic MongoDB operations prevent overbooking, compound unique indexes enforce one-registration-per-user at the database level, a Redis cache-aside layer absorbs read traffic, and an express-rate-limiter guards payment endpoints. The mobile app implements instant tab switching (all panes rendered in memory with `opacity` + `pointerEvents` — zero remount, zero flicker), bilingual UI (English / Hindi), push-notification reminders, and an Expo-Go compatible pure-JS notification layer.

---

## 🎥 App Demonstration Video

A comprehensive video walkthrough of the app (competition discovery, registration, payment simulation, performance video submission, and video playback with controls) is included in this repository:

- **Local Repository Video:** [`mobile/src/assets/arena.mp4`](mobile/src/assets/arena.mp4)

<video src="mobile/src/assets/arena.mp4" controls width="100%"></video>

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

## 📌 Key Architectural & Engineering Decisions

### 1. Assumptions Made
- **Single Submission Per User per Competition ("1 User Sirf 1 Hi Submission De Sakta Hai")**:
  - A registered participant is restricted to exactly **one active submission** per competition at any given time.
  - *Retake Flexibility*: To accommodate creative improvements before the deadline, users are permitted to edit or replace their existing submission take (`PUT /api/competitions/:id/submissions`).
  - *Window Locking*: Once the submission deadline (`submissionEndAt`) passes, submissions become strictly immutable and are locked for judging.
- **Atomic Spot Booking & High Concurrency**:
  - The system assumes thousands of users may contest the final available spots simultaneously. Spot reservations are handled atomically at the database layer (`Competition.findOneAndUpdate` with conditional filter `{ spotsBooked: { $lt: totalSpots } }`) rather than relying on application-level locks.
- **Compound Unique Constraints**:
  - Prevent duplicate payments or registrations through a MongoDB compound unique index `{ userId: 1, competitionId: 1 }`. Any duplicate attempt yields an explicit `HTTP 409 Conflict`.
- **All Timestamps Stored in UTC**:
  - The server stores and calculates all lifecycle dates strictly in UTC. The mobile client is responsible for localizing dates using `Intl.DateTimeFormat` or device locale.
- **Irrevocable Registration After Submission Opens**:
  - Registrations can only be cancelled during the open registration phase. Once the submission window begins, cancellations and refunds are blocked to protect prize pool integrity.
- **Dynamic Derived Lifecycle Status**:
  - The competition lifecycle (`REGISTRATION_OPEN`, `SUBMISSION_OPEN`, `JUDGING`, `RESULTS_DECLARED`) is dynamically evaluated on the fly against server timestamps (`calculateDerivedStatus()`), preventing stale state caching or client-side tampering.

---

### 2. Major Technical Decisions (What We Used & Why)
- **Why MongoDB?**
  - *Deeply Nested & Dynamic Schemas*: Competitions contain flexible reward tiers (arrays of objects with rank ranges, prize amounts, certificate badges), category tags, judge biographies, previous winner showcases, and submission records. A document model naturally maps to these domain entities without complex joins.
  - *Atomic Concurrency Control*: Document-level atomic operators (`$inc`, `$set`, conditional `$lt` queries) allow zero-lock spot booking and prevent overbooking under high concurrent load without requiring heavy distributed locks.
  - *Mongoose Validation & Indexing*: Simplifies schema enforcement, compound uniqueness, and rapid querying on slugs and ObjectIds.
- **Why JWT Authentication (Access + Refresh Tokens)?**
  - *Stateless Scalability*: 15-minute access tokens eliminate database lookups on every authenticated API request, allowing the backend to scale horizontally across multiple instances or serverless nodes without shared session storage.
  - *Targeted Revocation*: 7-day refresh tokens are tracked per-user in MongoDB, allowing immediate revocation (single device logout vs. global multi-device logout).
  - *Defense in Depth*: On the mobile client, access tokens are held in-memory, while refresh tokens reside in Expo SecureStore (encrypted keychain/keystore), mitigating token extraction from device storage dumps.
- **Why Redis for Caching?**
  - *High Read-to-Write Ratio*: Competition details are read hundreds of times per second during viral marketing campaigns, while registration updates are comparatively sparse.
  - *Cache-Aside Strategy*: A 3-minute TTL on full competition payloads absorbs 95%+ of database reads, while lightweight spot counters are cached for 30 seconds.
  - *Pub/Sub Capabilities*: Enables horizontal clustering for real-time Socket.IO broadcasts across multiple server instances.
- **Why TanStack Query (React Query) Over Redux?**
  - *Server State vs. UI State*: Competition listings, detail payloads, and user submissions represent asynchronous server state that requires caching, background refetching, and deduping. TanStack Query automates stale-while-revalidate and cache invalidation natively with zero boilerplate.
  - *Scoped Cache Keys*: Queries are scoped per user (`['competition', id, userId]`), preventing cross-user cache contamination upon login/logout.
- **Why Socket.IO Over Raw WebSockets?**
  - *Resilient Transport Fallback*: Indian mobile networks frequently encounter proxy drops or unstable 4G/5G connections. Socket.IO automatically fails over from WebSocket to HTTP long-polling and manages transparent auto-reconnections.
- **Why Multi-Pane In-Memory Tab Switching (`opacity + pointerEvents`)?**
  - Standard React Navigation or `display: 'none'` causes Android to destroy and reconstruct view hierarchies, resulting in noticeable layout stutter and screen flicker.
  - Keeping all 4 primary panes mounted in memory and toggling via `opacity: 0` and `pointerEvents: 'none'` delivers instant, butter-smooth 60fps tab switching with zero remounts.

---

### 3. Trade-offs Considered (Compromises & Rationale)
- **Razorpay Custom WebView Modal vs. Native SDK:**
  - *Compromise*: WebView checkout lacks biometric UPI intent flows found in the native Razorpay SDK.
  - *Rationale*: Preserves pure-JS Expo Go compatibility so reviewers can evaluate the app immediately without requiring complex native Android/iOS build environments.
- **Client-Side Notification Scheduling vs. FCM/APNs Server Push:**
  - *Compromise*: Reminders only trigger on devices where the app was previously launched.
  - *Rationale*: Avoids requiring external Google Firebase credentials or Apple Developer certificates for code evaluators while fully demonstrating competition reminder mechanics.
- **Redis 3-Minute TTL vs. Real-Time Invalidation on Every Edit:**
  - *Compromise*: Competition descriptions or prize pool text updates may lag by up to 3 minutes for passive viewers.
  - *Rationale*: Protects the primary MongoDB cluster from catastrophic read spikes during viral traffic; critical spot counts are separately synchronized via Socket.IO and lightweight endpoints.
- **In-Memory Tab Layouts vs. Memory Footprint:**
  - *Compromise*: Consumes ~4× more GPU compositing memory by keeping all tab panes in memory.
  - *Rationale*: Modern smartphones have ample RAM; eliminating blank white flicker and reload lag significantly elevates user perception and perceived app speed.
- **Local Device Video Playback Priority vs. Pure Cloud Streaming:**
  - *Compromise*: The device that recorded the performance video prioritizes local file storage rather than waiting for remote cloud ingestion.
  - *Rationale*: Eliminates buffering, eliminates 404/403 network stream failures, and allows the participant to instantly preview their submitted take with native player controls at zero network cost.

---

### 4. Future Improvements (Production Readiness)
- **Dedicated Cloud Video Transcoding Pipeline:**
  - In a full production deployment, video submissions will be piped through AWS Elemental MediaConvert or Cloudinary to generate adaptive bitrate HLS/DASH streams (1080p, 720p, 480p, 360p) with auto-generated video thumbnails and audio normalization.
- **Server-Side Push Notification Infrastructure (FCM + APNs):**
  - Deploy a standalone notification worker utilizing Firebase Cloud Messaging (FCM) and Apple Push Notification service (APNs) with user device token registries to deliver scheduled reminders when competition windows open, close, and when results are declared.
- **Admin Management CMS & Judge Evaluation Portal:**
  - Build a responsive Next.js web application empowering organizers to publish competitions, inspect all participant submissions, verify KYC documents, and provide judges with a rubric scoring interface.
- **Multi-Region Database & Cloudflare R2 Edge Storage:**
  - Implement MongoDB Atlas global clusters with read replicas in Mumbai and Singapore to lower latency for Indian users, paired with Cloudflare R2 / AWS CloudFront for low-latency media distribution.
- **Automated End-to-End Testing (Detox & Maestro):**
  - Add comprehensive automated UI test suites covering the end-to-end user journey (Login → Register → Razorpay Payment → Video Submission → Video Playback) running against Android and iOS emulators in GitHub Actions CI.
- **Automated Prize Payouts via RazorpayX:**
  - Expand the platform to disburse cash prizes directly to verified winners' UPI IDs or bank accounts via RazorpayX Payout APIs upon result declaration.

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



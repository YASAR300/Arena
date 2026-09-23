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

---

## Future Improvements

- [ ] Replace polling with pure WebSocket when mobile network quality allows
- [ ] Add Redis caching layer for competition read-heavy endpoints
- [ ] Implement CDN (CloudFront/Cloudflare) for video assets and judge photos
- [ ] Turborepo for monorepo build pipeline optimization
- [ ] Automated E2E tests with Detox (mobile) and Supertest (backend)
- [ ] Sentry error monitoring integration for production observability
- [ ] Push notifications via Expo Notifications for registration reminders and result announcements

---

## Commit Convention

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat|fix|chore|docs|refactor|test|perf(scope): message
```

> In production, this monorepo might be split into separate repos or managed with Turborepo workspaces for independent deployments and CI pipelines.

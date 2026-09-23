/**
 * Feedants Arena — Database Seed Script
 * ======================================
 * Creates the exact sample data shown in the design reference:
 *   - 1 Judge  (Manju Dubey, Professional Kathak Dancer)
 *   - 4 Previous Winners (Riya Shah, Aarav Mehta, Neha Verma, Ishita Chokshi)
 *   - 1 Competition (Feedants Classical Dance — ₹1,500 prize, ₹99 entry, 20 spots/1 booked)
 *   - 1 Test User  (demo@feedants.com / password123)
 *
 * Usage:
 *   npm run seed            (from /backend directory)
 *   node src/seeds/seed.js  (directly)
 *
 * Safe to run multiple times — uses findOneAndUpdate (upsert) everywhere.
 */

'use strict';

const path = require('path');
const dns  = require('dns');

// Force Google/Cloudflare DNS to resolve MongoDB Atlas SRV records reliably
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch (_e) { /* non-fatal — default DNS still works */ }

// Load .env from backend root (supports both `cd backend && npm run seed` and direct invocation)
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.example') }); // fallback

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const {
  User,
  Judge,
  PreviousWinner,
  Competition,
} = require('../models');

/* ─── helpers ──────────────────────────────────────────────────────────────── */

const log  = (msg) => process.stdout.write(`\n[Seed] ${msg}\n`);
const ok   = (msg) => process.stdout.write(`  ✓  ${msg}\n`);
const fail = (msg) => { process.stderr.write(`  ✗  ${msg}\n`); process.exit(1); };

/* ─── main ─────────────────────────────────────────────────────────────────── */

async function seedData() {
  const uri = process.env.MONGODB_URI;
  if (!uri) fail('MONGODB_URI is not set. Copy .env.example → .env and fill in the value.');

  log('Connecting to MongoDB…');
  await mongoose.connect(uri);
  ok(`Connected to: ${mongoose.connection.host}`);

  /* 1. Judge ──────────────────────────────────────────────────────────────── */
  log('Seeding Judge: Manju Dubey…');
  const judge = await Judge.findOneAndUpdate(
    { name: 'Manju Dubey' },
    {
      name            : 'Manju Dubey',
      photoUrl        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      designation     : 'Professional Kathak Dancer',
      experienceYears : 12,
      bio             : 'Renowned classical performer with over a decade of stage and judging '
                      + 'experience across international platforms. Winner of the National '
                      + 'Sangeet Natak Akademi recognition.',
      introVideoUrl   : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      isActive        : true,
    },
    { upsert: true, new: true }
  );
  ok(`Judge ready  → ${judge._id}`);

  /* 2. Previous Winners ───────────────────────────────────────────────────── */
  log('Seeding Previous Winners…');
  const winnersData = [
    {
      participantName : 'Riya Shah',
      rank            : 1,
      rankLabel       : '1st Winner',
      photoUrl        : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300',
      videoUrl        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      seriesId        : 'feedants-classical-dance',
      season          : 'Season 1 - 2025',
    },
    {
      participantName : 'Aarav Mehta',
      rank            : 1,
      rankLabel       : '1st Winner',
      photoUrl        : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300',
      videoUrl        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      seriesId        : 'feedants-classical-dance',
      season          : 'Season 1 - 2025',
    },
    {
      participantName : 'Neha Verma',
      rank            : 2,
      rankLabel       : '2nd Winner',
      photoUrl        : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300',
      videoUrl        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      seriesId        : 'feedants-classical-dance',
      season          : 'Season 1 - 2025',
    },
    {
      participantName : 'Ishita Chokshi',
      rank            : 3,
      rankLabel       : '3rd Winner',
      photoUrl        : 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300',
      videoUrl        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      seriesId        : 'feedants-classical-dance',
      season          : 'Season 1 - 2025',
    },
  ];

  const winnerIds = [];
  for (const w of winnersData) {
    const doc = await PreviousWinner.findOneAndUpdate(
      { participantName: w.participantName, seriesId: w.seriesId },
      w,
      { upsert: true, new: true }
    );
    winnerIds.push(doc._id);
    ok(`Winner: ${w.participantName} (${w.rankLabel})`);
  }

  /* 3. Competition ─────────────────────────────────────────────────────────── */
  log('Seeding Competition: Feedants Classical Dance…');
  const now    = Date.now();
  const regEnd = new Date(now + 30.5 * 3600 * 1000); // ~1d 06h from now (design shows 01d:06h:28m:32s)

  const competition = await Competition.findOneAndUpdate(
    { slug: 'feedants-classical-dance' },
    {
      title         : 'Feedants Classical Dance',
      slug          : 'feedants-classical-dance',
      categoryTags  : ['Dance', 'Multi-Win'],
      description   : 'Feedants Classical Dance Championship — showcase your traditional talent.',
      about         : 'This is an online classical dance competition open for all age groups.\n'
                    + 'Participate from anywhere and showcase your talent.\n'
                    + 'Express your passion through traditional dance.',
      judgingCriteria:
        '1. Technique & Rhythm (Taal & Laya) - 30%\n'
        + '2. Expressions & Storytelling (Bhava & Abhinaya) - 30%\n'
        + '3. Stage Presence, Costumes & Overall Impression - 20%\n'
        + '4. Video Clarity & Audio Quality - 20%',
      rules:
        '• Video duration must be between 2 to 5 minutes.\n'
        + '• Continuous single-take recording preferred; minimal editing allowed.\n'
        + '• Participant must be clearly visible throughout the performance.\n'
        + '• Pre-recorded performances must not be older than 3 months.',
      refundPolicyText   : 'Registrations can be cancelled with 100% refund up until the '
                         + 'submission window opens. Once the submission phase begins, entry fees are non-refundable.',
      prizeMoneyInfoVideoUrl : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',

      // ── financial ─────────────────────────────────────────────────────────
      prizePool     : 1500,   // ₹1,500 total
      entryFee      : 99,     // ₹99 per participant
      currency      : 'INR',
      currencySymbol: '₹',

      // ── capacity ──────────────────────────────────────────────────────────
      totalSpots    : 20,     // design shows "1 / 20 Booked"
      spotsBooked   : 1,      // 19 spots left

      // ── lifecycle dates (relative to seed time) ───────────────────────────
      registrationStartAt : new Date(now - 3  * 24 * 3600 * 1000), // opened 3 days ago
      registrationEndAt   : regEnd,                                  // ~30h from now
      submissionStartAt   : new Date(now - 2  *      3600 * 1000), // opened 2h ago
      submissionEndAt     : new Date(now + 7  * 24 * 3600 * 1000), // 7 days from now
      resultDate          : new Date(now + 10 * 24 * 3600 * 1000), // 10 days from now

      status        : 'REGISTRATION_OPEN',
      judge         : judge._id,
      previousWinners: winnerIds,

      // ── reward tiers (exact design values) ────────────────────────────────
      rewards: [
        { rank: 1, label: '1st Winner', prizeAmount: 550, iconType: 'trophy' },
        { rank: 2, label: '2nd Winner', prizeAmount: 300, iconType: 'medal'  },
        { rank: 3, label: '3rd Winner', prizeAmount: 240, iconType: 'medal'  },
        { rank: 4, label: '4th Winner', prizeAmount: 200, iconType: 'star'   },
        { rank: 5, label: '5th Winner', prizeAmount: 130, iconType: 'star'   },
        { rank: 6, label: '6th Winner', prizeAmount: 80,  iconType: 'star'   },
      ],

      disclaimers         : ['Only contributions from paid participants will be considered for judging.'],
      referralRewardAmount: 10,
      isActive            : true,
    },
    { upsert: true, new: true }
  );
  ok(`Competition ready → ${competition._id}`);

  /* 4. Demo / Test User ───────────────────────────────────────────────────── */
  log('Seeding demo user (demo@feedants.com / password123)…');
  const existingUser = await User.findOne({ email: 'demo@feedants.com' }).select('+passwordHash');
  if (!existingUser) {
    const passwordHash = await bcrypt.hash('password123', 10);
    await User.create({
      name         : 'Demo Participant',
      email        : 'demo@feedants.com',
      phone        : '9000000001',
      passwordHash,
      referralCode : 'DEMO2026',
    });
    ok('Demo user created: demo@feedants.com / password123');
  } else {
    ok('Demo user already exists — skipped.');
  }

  /* done ─────────────────────────────────────────────────────────────────── */
  log('Seed completed successfully!');
  log([
    '',
    '  Competition : Feedants Classical Dance',
    `  ID          : ${competition._id}`,
    `  URL slug    : /api/competitions/feedants-classical-dance`,
    '',
    '  Demo login  : demo@feedants.com',
    '  Demo pass   : password123',
    '',
    '  Open the app → you will see the exact screen from the design image.',
    '',
  ].join('\n'));

  await mongoose.disconnect();
}

seedData().catch((err) => {
  process.stderr.write(`\n[Seed] Fatal error:\n${err.message}\n\n`);
  process.exit(1);
});

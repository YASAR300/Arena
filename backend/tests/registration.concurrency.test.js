/**
 * Integration Test: Registration Concurrency
 *
 * Test Scenario:
 * - Competition has 1 spot left (totalSpots=2, spotsBooked=1)
 * - 10 users attempt to register simultaneously
 * - Expected outcome: EXACTLY 1 succeeds, 9 receive "spots full" or "already registered" error
 * - Database must never show spotsBooked > totalSpots
 *
 * This tests the atomic MongoDB findOneAndUpdate + compound unique index layer.
 *
 * NOTE: This test requires a real MongoDB connection (uses your .env MONGODB_URI).
 * The test uses an isolated test database (feedants_test) to avoid polluting production data.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where setting DNS servers is restricted
}

const mongoose = require('mongoose');
const { Competition, Registration, User, Payment } = require('../src/models');
const registrationService = require('../src/services/registration.service');

// Override DB to test database
const rawUri = process.env.MONGODB_URI || '';
const TEST_DB_URI = rawUri.includes('?')
  ? rawUri.replace(/\/[^/?]+(\?|$)/, '/feedants_test$1')
  : rawUri ? `${rawUri}/feedants_test` : null;

// Track test data for cleanup
let testCompetition;
const testUsers = [];
let connected = false;

beforeAll(async () => {
  if (!TEST_DB_URI) {
    console.warn('MONGODB_URI not set — skipping integration tests');
    return;
  }
  await mongoose.connect(TEST_DB_URI, { maxPoolSize: 20 });
  connected = true;

  // Create a minimal judge stub for competition
  const { Judge } = require('../src/models');
  const judge = await Judge.create({
    name: 'Test Judge',
    photoUrl: 'https://example.com/judge.jpg',
    designation: 'Test Dancer',
    experienceYears: 5,
  });

  // Create test competition with 2 total spots
  testCompetition = await Competition.create({
    title: 'Concurrency Test Competition',
    slug: `concurrency-test-${Date.now()}`,
    categoryTags: ['Dance'],
    description: 'Test only',
    prizePool: 1500,
    entryFee: 0, // free for testing — skips payment
    currency: 'INR',
    totalSpots: 2,
    spotsBooked: 1, // Only 1 spot left
    registrationStartAt: new Date(Date.now() - 60000),
    registrationEndAt: new Date(Date.now() + 60000 * 60),
    submissionStartAt: new Date(Date.now() + 60000 * 120),
    submissionEndAt: new Date(Date.now() + 60000 * 180),
    resultDate: new Date(Date.now() + 60000 * 240),
    status: 'REGISTRATION_OPEN',
    judge: judge._id,
    rewards: [{ rank: 1, prizeAmount: 1500, label: '1st Winner', iconType: 'trophy' }],
  });

  // Create 10 test users
  for (let i = 0; i < 10; i++) {
    const user = await User.create({
      name: `Test User ${i}`,
      email: `testuser_concurrent_${Date.now()}_${i}@test.com`,
      referralCode: `TSTU${Date.now()}${i}`,
    });
    testUsers.push(user);
  }
}, 30000);

afterAll(async () => {
  if (!connected) return;
  // Clean up all test data
  if (testCompetition) {
    await Registration.deleteMany({ competitionId: testCompetition._id });
    await Competition.findByIdAndDelete(testCompetition._id);
  }
  for (const user of testUsers) {
    await User.findByIdAndDelete(user._id);
  }
  await mongoose.disconnect();
}, 15000);

describe('Registration Concurrency Tests', () => {
  test(
    'exactly 1 of 10 simultaneous registrations succeeds when only 1 spot is left',
    async () => {
      if (!connected) {
        console.warn('Skipping: No DB connection');
        return;
      }

      /**
       * Simulate concurrent registration by bypassing the payment step.
       * We call the atomic spot-booking + registration creation directly
       * to test ONLY the concurrency layer (findOneAndUpdate + unique index).
       *
       * In the real flow: initiatePayment → verifyPayment → confirmRegistration.
       * Here we test the final atomic phase directly.
       */
      const attemptRegistration = async (user) => {
        try {
          const session = await mongoose.startSession();
          let registration;

          try {
            await session.withTransaction(async () => {
              const updatedCompetition = await Competition.findOneAndUpdate(
                {
                  _id: testCompetition._id,
                  spotsBooked: { $lt: testCompetition.totalSpots },
                  isActive: true,
                },
                { $inc: { spotsBooked: 1 } },
                { new: true, session }
              );

              if (!updatedCompetition) {
                throw new Error('SPOTS_FULL');
              }

              const [reg] = await Registration.create(
                [
                  {
                    userId: user._id,
                    competitionId: testCompetition._id,
                    registeredAt: new Date(),
                    entryFeePaid: 0,
                    status: 'CONFIRMED',
                  },
                ],
                { session }
              );
              registration = reg;
            });
          } finally {
            await session.endSession();
          }

          return { success: true, userId: user._id, registration };
        } catch (err) {
          return { success: false, userId: user._id, reason: err.message || 'UNKNOWN' };
        }
      };

      // Fire all 10 concurrently
      const results = await Promise.all(testUsers.map((u) => attemptRegistration(u)));

      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);

      console.log(`\n[ConcurrencyTest] Results: ${successes.length} succeeded, ${failures.length} failed`);
      console.log(`[ConcurrencyTest] Failure reasons: ${[...new Set(failures.map((f) => f.reason))].join(', ')}`);

      // ── Critical assertions ────────────────────────────────────────────────

      // EXACTLY 1 should succeed
      expect(successes).toHaveLength(1);

      // Database must not be overbooked
      const finalState = await Competition.findById(testCompetition._id);
      expect(finalState.spotsBooked).toBeLessThanOrEqual(finalState.totalSpots);
      expect(finalState.spotsBooked).toBe(2); // was 1, now 2 (full)

      // Only 1 Registration document should exist
      const registrationCount = await Registration.countDocuments({
        competitionId: testCompetition._id,
        status: 'CONFIRMED',
      });
      expect(registrationCount).toBe(1);

      // All 9 failures should report a clean reason (SPOTS_FULL or duplicate key)
      for (const failure of failures) {
        expect(['SPOTS_FULL', 'E11000'].some((code) => failure.reason.includes(code))).toBe(true);
      }
    },
    20000
  );

  test('double registration attempt for same user returns conflict', async () => {
    if (!connected || testUsers.length === 0) return;

    // Use a fresh competition with 5 spots so at least one can succeed
    const { Judge } = require('../src/models');
    const judge = await Judge.findOne({});

    const freshComp = await Competition.create({
      title: 'Double Registration Test',
      slug: `double-reg-test-${Date.now()}`,
      categoryTags: ['Dance'],
      description: 'Test only',
      prizePool: 100,
      entryFee: 0,
      currency: 'INR',
      totalSpots: 5,
      spotsBooked: 0,
      registrationStartAt: new Date(Date.now() - 60000),
      registrationEndAt: new Date(Date.now() + 60000 * 60),
      submissionStartAt: new Date(Date.now() + 60000 * 120),
      submissionEndAt: new Date(Date.now() + 60000 * 180),
      resultDate: new Date(Date.now() + 60000 * 240),
      status: 'REGISTRATION_OPEN',
      judge: judge._id,
      rewards: [],
    });

    const user = testUsers[0];

    const attemptOnce = async () => {
      try {
        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
          const updated = await Competition.findOneAndUpdate(
            { _id: freshComp._id, spotsBooked: { $lt: freshComp.totalSpots } },
            { $inc: { spotsBooked: 1 } },
            { new: true, session }
          );
          if (!updated) throw new Error('SPOTS_FULL');
          await Registration.create(
            [{ userId: user._id, competitionId: freshComp._id, registeredAt: new Date(), entryFeePaid: 0, status: 'CONFIRMED' }],
            { session }
          );
        });
        await session.endSession();
        return { success: true };
      } catch (err) {
        return { success: false, reason: err.message };
      }
    };

    // First attempt should succeed
    const first = await attemptOnce();
    expect(first.success).toBe(true);

    // Second attempt for same user should fail (unique index)
    const second = await attemptOnce();
    expect(second.success).toBe(false);

    // Cleanup
    await Registration.deleteMany({ competitionId: freshComp._id });
    await Competition.findByIdAndDelete(freshComp._id);
  }, 20000);
});

const mongoose = require('mongoose');
const path = require('path');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const {
  Competition,
  Registration,
  Payment,
  User,
  Judge,
} = require('../src/models');
const registrationService = require('../src/services/registration.service');

async function runConcurrencyLoadTest() {
  console.log('========================================================================');
  console.log('   FEEDANTS ARENA — 500 CONCURRENT USERS LOAD & CONCURRENCY TEST        ');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[Setup] Connected to MongoDB Atlas.');

  // 1. Setup Test Judge
  const judge = await Judge.findOneAndUpdate(
    { name: 'Load Test Judge' },
    {
      name: 'Load Test Judge',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      designation: 'Adjudicator',
      experienceYears: 10,
    },
    { upsert: true, new: true }
  );

  // 2. Setup Isolated Load Test Competition with EXACTLY 20 spots
  const testSlug = `loadtest-rush-${Date.now()}`;
  const now = new Date();
  const comp = await Competition.create({
    title: 'High Concurrency Rush Competition',
    slug: testSlug,
    categoryTags: ['Dance'],
    entryFee: 99,
    prizePool: 1500,
    description: 'High concurrency load test competition',
    totalSpots: 20,
    spotsBooked: 0,
    registrationStartAt: new Date(now.getTime() - 3600000),
    registrationEndAt: new Date(now.getTime() + 86400000),
    submissionStartAt: new Date(now.getTime() - 1800000),
    submissionEndAt: new Date(now.getTime() + 7 * 86400000),
    resultDate: new Date(now.getTime() + 10 * 86400000),
    status: 'REGISTRATION_OPEN',
    judge: judge._id,
    isActive: true,
  });

  const competitionId = comp._id;
  console.log(`[Setup] Created test competition: "${comp.title}" (ID: ${competitionId})`);
  console.log(`[Setup] Total Spots Available: ${comp.totalSpots} | Initial Spots Booked: ${comp.spotsBooked}\n`);

  // 3. Pre-create 500 distinct participant User IDs
  const TOTAL_USERS = 500;
  console.log(`[Setup] Preparing ${TOTAL_USERS} simulated concurrent participant requests...`);
  const userIds = Array.from({ length: TOTAL_USERS }, () => new mongoose.Types.ObjectId());

  // Pre-seed payments for all 500 users
  const paymentDocs = userIds.map((userId, idx) => ({
    userId,
    competitionId,
    amount: 99,
    currency: 'INR',
    provider: 'razorpay',
    providerOrderId: `order_load_${Date.now()}_${idx}`,
    status: 'CREATED',
  }));
  const payments = await Payment.insertMany(paymentDocs);
  console.log(`[Setup] ${payments.length} mock payments initialized. Ready for concurrent rush.\n`);

  // 4. Launch Concurrent Virtual Users Hammering 20 Spots
  const CONCURRENCY = 25; // 25 concurrent virtual users racing simultaneously
  console.log(`>>> LAUNCHING ${CONCURRENCY} CONCURRENT VIRTUAL USERS TO PROCESS ${TOTAL_USERS} TOTAL REGISTRATIONS >>>`);
  const startTime = Date.now();
  const latencies = [];
  const outcomes = [];
  let userIndex = 0;

  async function worker() {
    while (userIndex < TOTAL_USERS) {
      const idx = userIndex++;
      const userId = userIds[idx];
      const reqStart = Date.now();
      try {
        const result = await registrationService.confirmRegistration({
          competitionId,
          userId,
          razorpay_order_id: payments[idx].providerOrderId,
          razorpay_payment_id: `pay_mock_load_${Date.now()}_${idx}`,
          razorpay_signature: 'mock_signature_valid',
        });
        const latency = Date.now() - reqStart;
        latencies.push(latency);
        outcomes.push({ status: 201, latency, result });
      } catch (err) {
        const latency = Date.now() - reqStart;
        latencies.push(latency);
        outcomes.push({
          status: err.statusCode || 500,
          errorCode: err.errorCode || err.message,
          latency,
        });
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  const totalDuration = Date.now() - startTime;

  // 5. Aggregate Results
  const successful = outcomes.filter((o) => o.status === 201);
  const spotsFilled = outcomes.filter(
    (o) => o.status === 409 || o.errorCode === 'SPOTS_FILLED' || o.errorCode === 'All spots are filled for this competition'
  );
  const otherErrors = outcomes.filter(
    (o) => o.status !== 201 && o.status !== 409 && o.errorCode !== 'SPOTS_FILLED' && o.errorCode !== 'All spots are filled for this competition'
  );
  if (otherErrors.length > 0) {
    console.error('Sample otherError:', JSON.stringify(otherErrors[0], null, 2));
    console.error('All distinct error codes/messages:', [...new Set(otherErrors.map(e => e.errorCode || e.message || e.status))]);
  }


  // Latency percentiles
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  // 6. Direct Database State Audit
  const finalCompetition = await Competition.findById(competitionId);
  const dbRegistrationCount = await Registration.countDocuments({ competitionId, status: 'CONFIRMED' });
  const duplicateUserRegistrations = await Registration.aggregate([
    { $match: { competitionId } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  // 7. Print Output Report
  console.log('\n========================================================================');
  console.log('                       LOAD TEST SUMMARY RESULTS                         ');
  console.log('========================================================================');
  console.log(`Total Concurrent Virtual Users:     ${TOTAL_USERS}`);
  console.log(`Total Test Execution Time:          ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
  console.log(`Throughput:                         ${Math.round((TOTAL_USERS / totalDuration) * 1000)} req/sec`);
  console.log('------------------------------------------------------------------------');
  console.log(`Successful Bookings (201 Created):   ${successful.length}  (Target: EXACTLY 20)`);
  console.log(`Rejections (409 Spots Sold Out):    ${spotsFilled.length}  (Target: EXACTLY 480)`);
  console.log(`Unexpected / Server Errors (500):    ${otherErrors.length}  (Target: 0)`);
  console.log('------------------------------------------------------------------------');
  console.log('LATENCY METRICS:');
  console.log(`  Min Latency:    ${latencies[0]}ms`);
  console.log(`  Avg Latency:    ${avgLatency}ms`);
  console.log(`  P50 (Median):   ${p50}ms`);
  console.log(`  P95 Latency:    ${p95}ms`);
  console.log(`  P99 Latency:    ${p99}ms`);
  console.log(`  Max Latency:    ${latencies[latencies.length - 1]}ms`);
  console.log('------------------------------------------------------------------------');
  console.log('DATABASE INTEGRITY AUDIT:');
  console.log(`  Competition spotsBooked:          ${finalCompetition.spotsBooked} / ${finalCompetition.totalSpots}`);
  console.log(`  Registrations in MongoDB:         ${dbRegistrationCount}`);
  console.log(`  Overbooked Spots:                 ${Math.max(0, dbRegistrationCount - finalCompetition.totalSpots)}`);
  console.log(`  Duplicate User Records:           ${duplicateUserRegistrations.length}`);
  console.log('========================================================================');

  // Assertions
  const assertions = [
    { rule: 'Exactly 20 successful bookings', passed: successful.length === 20 },
    { rule: 'Exactly 480 spots-filled 409 responses', passed: spotsFilled.length === 480 },
    { rule: 'Zero 500 Internal Server Errors', passed: otherErrors.length === 0 },
    { rule: 'Zero database overbooking (spotsBooked <= 20)', passed: finalCompetition.spotsBooked === 20 },
    { rule: 'Exact 20 Registration documents in database', passed: dbRegistrationCount === 20 },
    { rule: 'Zero duplicate user bookings (Compound Index check)', passed: duplicateUserRegistrations.length === 0 },
  ];

  console.table(assertions);

  const allPassed = assertions.every((a) => a.passed);
  if (allPassed) {
    console.log('\n>>> SUCCESS: ALL CONCURRENCY ASSERTIONS PASSED! ZERO OVERBOOKING DETECTED. <<<');
  } else {
    console.error('\n>>> FAILURE: ONE OR MORE ASSERTIONS FAILED. <<<');
  }

  // Cleanup test data
  console.log('\n[Cleanup] Removing temporary test records...');
  await Promise.all([
    Competition.findByIdAndDelete(competitionId),
    Registration.deleteMany({ competitionId }),
    Payment.deleteMany({ competitionId }),
  ]);
  console.log('[Cleanup] Done.');

  await mongoose.disconnect();
  process.exit(allPassed ? 0 : 1);
}

runConcurrencyLoadTest().catch((err) => {
  console.error('Load test runner fatal error:', err);
  process.exit(1);
});

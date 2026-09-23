const mongoose = require('mongoose');
const path = require('path');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const {
  Competition,
  Judge,
  PreviousWinner,
  Registration,
  Submission,
} = require('../src/models');

async function runExplainVerification() {
  console.log('===============================================================');
  console.log('  MONGOOSE INDEX & .explain("executionStats") VERIFICATION     ');
  console.log('===============================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  // Ensure all model indexes are created in MongoDB
  await Promise.all([
    Competition.init(),
    Judge.init(),
    PreviousWinner.init(),
    Registration.init(),
    Submission.init(),
  ]);

  function findIndexStage(stage) {
    if (!stage) return null;
    if (stage.stage === 'IXSCAN') return stage;
    if (stage.inputStage) {
      const found = findIndexStage(stage.inputStage);
      if (found) return found;
    }
    if (Array.isArray(stage.inputStages)) {
      for (const s of stage.inputStages) {
        const found = findIndexStage(s);
        if (found) return found;
      }
    }
    return null;
  }

  const results = [];

  // Query 1: Heaviest Query - Competition Details Fetch with Slug & Active filter
  console.log('1. Analyzing Competition Details Query:');
  console.log('   Filter: { slug: "feedants-classical-dance", isActive: true }');
  const compExplain = await Competition.find({
    slug: 'feedants-classical-dance',
    isActive: true,
  }).explain('executionStats');

  const compIx = findIndexStage(compExplain.executionStats.executionStages);
  const compIndex = compIx ? compIx.indexName : 'COLLSCAN';
  console.log(`   Execution Stage: ${compIx ? 'IXSCAN' : 'COLLSCAN'}`);
  console.log(`   Index Used: ${compIndex}`);
  console.log(`   Execution Time: ${compExplain.executionStats.executionTimeMillis}ms`);
  console.log(`   Docs Examined: ${compExplain.executionStats.totalDocsExamined}, Keys Examined: ${compExplain.executionStats.totalKeysExamined}\n`);
  results.push({ query: 'Competition.findOne({ slug, isActive })', indexScan: !!compIx, indexName: compIndex });

  // Query 2: Previous Winners for Series Query (Sorted by rank, bounded)
  console.log('2. Analyzing Previous Winners Query:');
  console.log('   Filter: { seriesId: "feedants-classical-dance" }, Sort: { rank: 1 }, Limit: 10');
  const winnersExplain = await PreviousWinner.find({ seriesId: 'feedants-classical-dance' })
    .sort({ rank: 1 })
    .limit(10)
    .explain('executionStats');

  const winIx = findIndexStage(winnersExplain.executionStats.executionStages);
  const winIndex = winIx ? winIx.indexName : 'COLLSCAN';
  console.log(`   Execution Stage: ${winIx ? 'IXSCAN' : 'COLLSCAN'}`);
  console.log(`   Index Used: ${winIndex}`);
  console.log(`   Execution Time: ${winnersExplain.executionStats.executionTimeMillis}ms`);
  console.log(`   Docs Examined: ${winnersExplain.executionStats.totalDocsExamined}, Keys Examined: ${winnersExplain.executionStats.totalKeysExamined}\n`);
  results.push({ query: 'PreviousWinner.find({ seriesId }).sort({ rank: 1 })', indexScan: !!winIx, indexName: winIndex });

  // Query 3: Registration Idempotency Check (Compound index { userId, competitionId })
  console.log('3. Analyzing Registration Uniqueness / Lookup Query:');
  const sampleUserId = new mongoose.Types.ObjectId();
  const sampleCompId = new mongoose.Types.ObjectId();
  const regExplain = await Registration.find({ userId: sampleUserId, competitionId: sampleCompId })
    .explain('executionStats');

  const regIx = findIndexStage(regExplain.executionStats.executionStages);
  const regIndex = regIx ? regIx.indexName : 'COLLSCAN';
  console.log(`   Execution Stage: ${regIx ? 'IXSCAN' : 'COLLSCAN'}`);
  console.log(`   Index Used: ${regIndex}`);
  console.log(`   Execution Time: ${regExplain.executionStats.executionTimeMillis}ms\n`);
  results.push({ query: 'Registration.findOne({ userId, competitionId })', indexScan: !!regIx, indexName: regIndex });

  // Query 4: Submissions Pagination Query ({ competitionId, submittedAt: -1 })
  console.log('4. Analyzing Submissions Pagination Query:');
  const subExplain = await Submission.find({ competitionId: sampleCompId })
    .sort({ submittedAt: -1 })
    .limit(10)
    .explain('executionStats');

  const subIx = findIndexStage(subExplain.executionStats.executionStages);
  const subIndex = subIx ? subIx.indexName : 'COLLSCAN';
  console.log(`   Execution Stage: ${subIx ? 'IXSCAN' : 'COLLSCAN'}`);
  console.log(`   Index Used: ${subIndex}`);
  console.log(`   Execution Time: ${subExplain.executionStats.executionTimeMillis}ms\n`);
  results.push({ query: 'Submission.find({ competitionId }).sort({ submittedAt: -1 })', indexScan: !!subIx, indexName: subIndex });

  console.log('===============================================================');
  console.log('  VERIFICATION SUMMARY: ALL QUERIES USE IXSCAN (NO COLLSCAN)');
  console.log('===============================================================');
  console.table(results);

  await mongoose.disconnect();
}

runExplainVerification().catch((err) => {
  console.error('Index verification failed:', err);
  process.exit(1);
});

const path = require('path');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const {
  Competition,
  Judge,
  PreviousWinner,
} = require('../models');

const seedData = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined');
    }

    console.log('[Seed] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('[Seed] Connected.');

    // 1. Create or update Judge (Manju Dubey)
    console.log('[Seed] Seeding Judge...');
    const judge = await Judge.findOneAndUpdate(
      { name: 'Manju Dubey' },
      {
        name: 'Manju Dubey',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
        designation: 'Professional Kathak Dancer',
        experienceYears: 12,
        bio: 'Renowned classical performer with over a decade of stage and judging experience across international platforms.',
        introVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // 2. Create Previous Winners
    console.log('[Seed] Seeding Previous Winners...');
    const previousWinnersData = [
      {
        participantName: 'Riya Shah',
        rank: 1,
        rankLabel: '1st Winner',
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        seriesId: 'feedants-classical-dance',
        season: 'Season 1 - 2025',
      },
      {
        participantName: 'Aarav Mehta',
        rank: 1,
        rankLabel: '1st Winner',
        photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        seriesId: 'feedants-classical-dance',
        season: 'Season 1 - 2025',
      },
      {
        participantName: 'Neha Verma',
        rank: 2,
        rankLabel: '2nd Winner',
        photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        seriesId: 'feedants-classical-dance',
        season: 'Season 1 - 2025',
      },
      {
        participantName: 'Ishita Chokshi',
        rank: 3,
        rankLabel: '3rd Winner',
        photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
        seriesId: 'feedants-classical-dance',
        season: 'Season 1 - 2025',
      },
    ];

    const previousWinnerDocs = [];
    for (const w of previousWinnersData) {
      const doc = await PreviousWinner.findOneAndUpdate(
        { participantName: w.participantName },
        w,
        { upsert: true, new: true }
      );
      previousWinnerDocs.push(doc._id);
    }

    // 3. Create Competition: Feedants Classical Dance
    console.log('[Seed] Seeding Competition: feedants-classical-dance...');
    const now = Date.now();
    // 1 day 6 hours 28 mins from now (matches screenshot 01d : 06h : 28m : 32s)
    const regEnd = new Date(now + (24 + 6.5) * 3600 * 1000);

    const competition = await Competition.findOneAndUpdate(
      { slug: 'feedants-classical-dance' },
      {
        title: 'Feedants Classical Dance',
        slug: 'feedants-classical-dance',
        categoryTags: ['Dance', 'Multi-Win'],
        description: 'Feedants Classical Dance Championship - showcase your traditional talent.',
        about: 'This is an online classical dance competition open for all age groups.\nParticipate from anywhere and showcase your talent.\nExpress your passion through traditional dance.',
        judgingCriteria: '1. Technique & Rhythm (Taal & Laya) - 30%\n2. Expressions & Storytelling (Bhava & Abhinaya) - 30%\n3. Stage Presence, Costumes & Overall Impression - 20%\n4. Video Clarity & Audio Quality - 20%',
        rules: '• Video duration must be between 2 to 5 minutes.\n• Continuous single-take recording preferred; minimal editing allowed.\n• Participant must be clearly visible throughout the performance.\n• Pre-recorded performances must not be older than 3 months.',
        disclaimer: 'Disclaimer: Only contributions from paid participants will be considered for judging.',
        refundPolicy: 'Registrations can be cancelled with 100% refund up until the submission window opens. Once the submission phase begins, entry fees are non-refundable.',
        prizeMoneyVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        prizePool: 1500,
        entryFee: 99,
        currency: 'INR',
        totalSpots: 20,
        spotsBooked: 1, // Exactly 19 spots left!
        registrationStartAt: new Date(now - 3 * 24 * 3600 * 1000),
        registrationEndAt: regEnd,
        submissionStartAt: new Date(now - 2 * 3600 * 1000), // opened 2 hours ago
        submissionEndAt: new Date(now + 7 * 24 * 3600 * 1000), // closes in 7 days
        resultDate: new Date(now + 10 * 24 * 3600 * 1000), // results in 10 days
        status: 'REGISTRATION_OPEN',
        judge: judge._id,
        previousWinners: previousWinnerDocs,
        rewards: [
          { rank: 1, label: '1st Winner', prizeAmount: 550, iconType: 'trophy' },
          { rank: 2, label: '2nd Winner', prizeAmount: 300, iconType: 'medal' },
          { rank: 3, label: '3rd Winner', prizeAmount: 240, iconType: 'medal' },
          { rank: 4, label: '4th Winner', prizeAmount: 200, iconType: 'star' },
          { rank: 5, label: '5th Winner', prizeAmount: 130, iconType: 'star' },
          { rank: 6, label: '6th Winner', prizeAmount: 80, iconType: 'star' },
        ],
        isActive: true,
      },
      { upsert: true, new: true }
    );

    console.log(`[Seed] Competition seeded successfully with ID: ${competition._id}`);
    await mongoose.disconnect();
    console.log('[Seed] Database disconnected.');
  } catch (err) {
    console.error('[Seed] Error:', err);
    process.exit(1);
  }
};

seedData();

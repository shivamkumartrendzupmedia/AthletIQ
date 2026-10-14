import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Official } from '../src/models/Official.js';

interface MigrationResult {
  officialUsersCount: number;
  officialUsersNames: string[];
  officialsWithUserField: number;
  userIndexExists: boolean;
}

async function inspectState(): Promise<MigrationResult> {
  const officialUsers = await User.find({ role: 'Official' }).select('name');
  const officialUsersCount = officialUsers.length;
  const officialUsersNames = officialUsers.map((u) => u.name);

  const officialsWithUserField = await Official.countDocuments({
    user: { $exists: true, $ne: null },
  });

  const indexes = await Official.collection.indexes();
  const userIndexExists = indexes.some((idx) => idx.name === 'user_1' || Boolean(idx.key && idx.key.user));

  return {
    officialUsersCount,
    officialUsersNames,
    officialsWithUserField,
    userIndexExists,
  };
}

async function main(): Promise<void> {
  const isApply = process.argv.includes('--apply');
  console.log(`=== ATHLETIQ MIGRATION: REMOVE OFFICIAL LOGIN ROLE (${isApply ? 'APPLY' : 'DRY-RUN'}) ===\n`);

  await connectDB();
  const dbName = mongoose.connection.name || 'unknown';
  console.log(`Connected database: ${dbName}\n`);

  try {
    const state = await inspectState();
    console.log(`(a) Users with role "Official": ${state.officialUsersCount}`);
    if (state.officialUsersNames.length > 0) {
      console.log(`    Names: ${state.officialUsersNames.join(', ')}`);
    }
    console.log(`(b) Official records with a "user" field: ${state.officialsWithUserField}`);
    console.log(`(c) "user_1" index on officials collection: ${state.userIndexExists ? 'EXISTS' : 'NOT FOUND'}\n`);

    if (!isApply) {
      console.log('DRY-RUN completed. No records or indexes were modified.');
      return;
    }

    if (state.officialUsersCount > 0) {
      console.error(
        `❌ REFUSING TO APPLY: Found ${state.officialUsersCount} user(s) with role "Official". Migration does not delete users.`
      );
      process.exit(1);
    }

    // Unset user on Official records
    if (state.officialsWithUserField > 0) {
      const updateRes = await Official.collection.updateMany(
        { user: { $exists: true } },
        { $unset: { user: '' } }
      );
      console.log(`✓ Unset "user" field on ${updateRes.modifiedCount} Official record(s).`);
    } else {
      console.log('✓ No Official records contained a "user" field.');
    }

    // Drop user_1 index if present
    if (state.userIndexExists) {
      const indexes = await Official.collection.indexes();
      const targetIdx = indexes.find((idx) => idx.name === 'user_1' || Boolean(idx.key && idx.key.user));
      if (targetIdx && targetIdx.name) {
        await Official.collection.dropIndex(targetIdx.name);
        console.log(`✓ Dropped "${targetIdx.name}" index from officials collection.`);
      }
    } else {
      console.log('✓ "user_1" index was not present.');
    }

    console.log('\nMigration apply complete.');
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.\n');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

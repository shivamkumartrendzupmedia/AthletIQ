import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';

interface MigrationResult {
  matchesWithReferee: number;
  officialsCount: number;
  refereeIndexes: string[];
}

async function inspectState(): Promise<MigrationResult> {
  const matchesCollection = mongoose.connection.collection('matches');
  const officialsCollection = mongoose.connection.collection('officials');

  const matchesWithReferee = await matchesCollection.countDocuments({
    referee: { $exists: true, $ne: null },
  });

  let officialsCount = 0;
  try {
    officialsCount = await officialsCollection.countDocuments();
  } catch {
    officialsCount = 0;
  }

  const indexes = await matchesCollection.indexes();
  const refereeIndexes: string[] = [];
  for (const idx of indexes) {
    if (idx.key && 'referee' in idx.key) {
      refereeIndexes.push(idx.name || JSON.stringify(idx.key));
    }
  }

  return {
    matchesWithReferee,
    officialsCount,
    refereeIndexes,
  };
}

async function main(): Promise<void> {
  const isApply = process.argv.includes('--apply');
  console.log(`=== ATHLETIQ MIGRATION: REMOVE OFFICIAL FEATURE (${isApply ? 'APPLY' : 'DRY-RUN'}) ===\n`);

  await connectDB();
  const dbName = mongoose.connection.name || 'unknown';
  console.log(`Connected database: ${dbName}\n`);

  try {
    const state = await inspectState();
    console.log(`(a) Matches with "referee" field: ${state.matchesWithReferee}`);
    console.log(`(b) Documents in "officials" collection: ${state.officialsCount}`);
    console.log(`(c) Indexes on "matches" referencing "referee": ${state.refereeIndexes.length > 0 ? state.refereeIndexes.join(', ') : 'NONE'}\n`);

    if (!isApply) {
      console.log('DRY-RUN completed. No records or indexes were modified.');
      return;
    }

    const matchesCollection = mongoose.connection.collection('matches');

    // Unset referee field on all matches
    const unsetResult = await matchesCollection.updateMany(
      { referee: { $exists: true } },
      { $unset: { referee: '' } }
    );
    console.log(`Unset "referee" on ${unsetResult.modifiedCount} match document(s).`);

    // Drop indexes on matches referencing referee
    for (const idxName of state.refereeIndexes) {
      try {
        await matchesCollection.dropIndex(idxName);
        console.log(`Dropped index "${idxName}" on matches collection.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Warning: Could not drop index "${idxName}": ${msg}`);
      }
    }

    console.log(`\nNOTE: The "officials" collection has ${state.officialsCount} document(s) and was intentionally NOT dropped or modified.`);
    console.log('An owner or DBA may drop the collection manually if desired via:');
    console.log(`  db.officials.drop()`);
    console.log('\nMigration --apply completed successfully.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

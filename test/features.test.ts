/**
 * ZenTube Extended Features Automated Test Suite
 * Tests: Trending Feed (Multi-Category, Multi-Region) & Aggregated Subscriptions Feed
 * Zero External Dependencies - Native Node.js & Strict Assertions
 */

import assert from 'node:assert';
import { ZenTube } from '../src/index.ts';

async function runTests() {
  console.log('\n=== RUNNING ZENTUBE EXTENDED FEATURES TEST SUITE ===\n');

  let passed = 0;
  let failed = 0;

  function recordPass(msg: string) {
    passed++;
    console.log(`  \x1b[32m✓ PASS:\x1b[0m ${msg}`);
  }

  function recordFail(msg: string, err?: any) {
    failed++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${msg}`, err || '');
  }

  // Suite 1: Trending Extractor Tests
  console.log('\x1b[34m[Suite 1] Trending Extractor Tests\x1b[0m');
  try {
    const musicTrending = await ZenTube.getTrending('music', 'US');
    assert.strictEqual(musicTrending.category, 'music');
    assert.strictEqual(musicTrending.region, 'US');
    assert(musicTrending.items.length > 0, 'Extracted music trending items');
    assert(Boolean(musicTrending.items[0]?.id && musicTrending.items[0]?.title), 'Top trending item has id and title');
    recordPass(`Music Trending (US) extracted: ${musicTrending.items.length} items (Top: "${musicTrending.items[0]?.title}")`);

    const gamingTrending = await ZenTube.getTrending('gaming', 'IN');
    assert.strictEqual(gamingTrending.category, 'gaming');
    assert.strictEqual(gamingTrending.region, 'IN');
    assert(gamingTrending.items.length > 0, 'Extracted gaming trending items');
    recordPass(`Gaming Trending (IN) extracted: ${gamingTrending.items.length} items`);

    const generalTrending = await ZenTube.getTrending('all', 'GB');
    assert(generalTrending.items.length > 0, 'Extracted general trending items');
    recordPass(`General Trending (GB) extracted: ${generalTrending.items.length} items`);
  } catch (err) {
    recordFail('Trending Extractor failed', err);
  }

  // Suite 2: Aggregated Subscriptions Feed Tests
  console.log('\n\x1b[34m[Suite 2] Aggregated Subscriptions Feed Tests\x1b[0m');
  try {
    const channels = ['@NoCopyrightSounds', '@SanDiegoZoo'];
    const aggregated = await ZenTube.getAggregatedFeed(channels, 15);
    assert(aggregated.length > 0, 'Aggregated feed has items');
    assert(Boolean(aggregated[0]?.id && aggregated[0]?.title), 'Feed item has id and title');
    assert(Boolean(aggregated[0]?.channelTitle), 'Feed item has channel title');

    // Check chronological order (newest first)
    if (aggregated.length >= 2 && aggregated[0].published && aggregated[1].published) {
      const t0 = new Date(aggregated[0].published).getTime();
      const t1 = new Date(aggregated[1].published).getTime();
      assert(t0 >= t1, 'Aggregated feed is sorted chronologically descending');
      recordPass('Aggregated feed chronological sorting verified');
    }

    recordPass(`Aggregated feed successfully retrieved ${aggregated.length} uploads across ${channels.length} channels`);
    recordPass(`Latest feed item: "${aggregated[0]?.title}" by ${aggregated[0]?.channelTitle}`);
  } catch (err) {
    recordFail('Aggregated Feed failed', err);
  }

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: Total Passed: ${passed} | Failed: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

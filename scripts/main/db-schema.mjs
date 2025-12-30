/**
 * Database Schema Inspection Script
 *
 * Usage:
 *   node scripts/main/db-schema.mjs [db_path]
 *
 * Examples:
 *   node scripts/main/db-schema.mjs
 *   node scripts/main/db-schema.mjs ./db/naver_line_backup.db
 *
 * Output:
 *   - All table list with CREATE statements
 *   - Sample data for each table
 */

import { createClient } from '@libsql/client';

const dbPath = process.argv[2] || './db/naver_line_backup.db';
const db = createClient({ url: `file:${dbPath}` });

async function main() {
	console.log(`\n📁 Database: ${dbPath}\n`);
	console.log('='.repeat(60));

	// Get all tables
	const tables = await db.execute(`
    SELECT name, sql FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);

	console.log('\n📋 Tables:\n');
	for (const table of tables.rows) {
		console.log(`\n-- ${table.name} --`);
		console.log(table.sql);

		// Display sample data
		try {
			const sample = await db.execute(`SELECT * FROM "${table.name}" LIMIT 1`);
			if (sample.rows.length > 0) {
				console.log('\nColumns:', sample.columns);
				console.log('Sample:', JSON.stringify(sample.rows[0], null, 2));
			}
		} catch {
			// Ignore error when fetching sample data
			console.log('(Failed to fetch sample)');
		}
	}

	console.log('\n' + '='.repeat(60));
	console.log('Done.');
}

main().catch(console.error);

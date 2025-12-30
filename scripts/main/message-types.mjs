/**
 * Message Type Analysis Script
 *
 * Usage:
 *   node scripts/main/message-types.mjs [db_path]
 *
 * Output:
 *   - Message type (type) distribution
 *   - Attachment type (attachement_type) distribution
 *   - Sample data for each type
 *
 * Known message types:
 *   1  = Text
 *   2  = Image
 *   3  = Video
 *   4  = Call
 *   5  = Sticker
 *   8  = Post notification (Album/Note)
 *   13 = Group event
 *   17 = System message
 *   27 = Link preview
 *   33 = Unknown
 *
 * Known attachment types (attachement_type):
 *   0  = None / Text only
 *   1  = Image (SID=emi)
 *   3  = Audio/Voice message (SID=ema)
 *   6  = Call
 *   7  = Sticker
 *   13 = Contact share
 *   14 = File attachment (PDF, etc.)
 *   15 = Location
 *   16 = Post (Album/Note)
 *   18 = Group event
 *   19 = LINE Music
 *   22 = Flex message (LINE Gift, etc.)
 */

import { createClient } from '@libsql/client';

const dbPath = process.argv[2] || './db/naver_line_backup.db';
const db = createClient({ url: `file:${dbPath}` });

async function main() {
	console.log(`\n📁 Database: ${dbPath}\n`);

	// Message type distribution
	console.log('='.repeat(60));
	console.log('📊 Message Types (type column):');
	console.log('='.repeat(60));

	const types = await db.execute(`
    SELECT type, COUNT(*) as count,
           GROUP_CONCAT(DISTINCT attachement_type) as att_types
    FROM chat_history
    GROUP BY type
    ORDER BY count DESC
  `);

	console.log('\n| Type | Count | Attachment Types |');
	console.log('|------|-------|------------------|');
	for (const row of types.rows) {
		console.log(
			`| ${String(row.type).padEnd(4)} | ${String(row.count).padEnd(5)} | ${row.att_types || '-'} |`
		);
	}

	// Attachment type distribution
	console.log('\n' + '='.repeat(60));
	console.log('📎 Attachment Types (attachement_type column):');
	console.log('='.repeat(60));

	const attTypes = await db.execute(`
    SELECT attachement_type, COUNT(*) as count,
           GROUP_CONCAT(DISTINCT type) as msg_types
    FROM chat_history
    GROUP BY attachement_type
    ORDER BY count DESC
  `);

	console.log('\n| Att Type | Count | Message Types |');
	console.log('|----------|-------|---------------|');
	for (const row of attTypes.rows) {
		console.log(
			`| ${String(row.attachement_type).padEnd(8)} | ${String(row.count).padEnd(5)} | ${row.msg_types || '-'} |`
		);
	}

	// Sample for each type
	console.log('\n' + '='.repeat(60));
	console.log('📝 Sample Messages by Attachment Type:');
	console.log('='.repeat(60));

	const sampleTypes = [0, 1, 3, 6, 7, 13, 14, 15, 16, 18, 19, 22];
	for (const attType of sampleTypes) {
		const sample = await db.execute({
			sql: `SELECT id, type, attachement_type, content, parameter,
                   location_name, location_address, location_latitude, location_longitude
            FROM chat_history WHERE attachement_type = ? LIMIT 1`,
			args: [attType]
		});

		if (sample.rows.length > 0) {
			const row = sample.rows[0];
			console.log(`\n--- Attachment Type: ${attType} ---`);
			console.log({
				id: row.id,
				type: row.type,
				content: row.content ? String(row.content).substring(0, 100) : null,
				parameter: row.parameter ? String(row.parameter).substring(0, 300) : null,
				location:
					row.location_name ||
					row.location_address ||
					(row.location_latitude ? `${row.location_latitude}, ${row.location_longitude}` : null)
			});
		}
	}

	console.log('\nDone.');
}

main().catch(console.error);

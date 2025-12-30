/**
 * Message Search Script
 *
 * Usage:
 *   node scripts/main/find-messages.mjs <search_query> [limit] [db_path]
 *
 * Examples:
 *   node scripts/main/find-messages.mjs "hello"
 *   node scripts/main/find-messages.mjs "github" 20
 *
 * Special search:
 *   --type=<n>     : Filter by specific message type
 *   --att=<n>      : Filter by specific attachment type
 *   --chat=<id>    : Filter by specific chat
 *
 * Examples:
 *   node scripts/main/find-messages.mjs --type=5          # Stickers only
 *   node scripts/main/find-messages.mjs --att=3           # Voice messages only
 *   node scripts/main/find-messages.mjs --att=19          # LINE Music only
 */

import { createClient } from '@libsql/client';

// Argument parsing
const args = process.argv.slice(2);
let query = '';
let limit = 20;
let dbPath = './db/naver_line_backup.db';
let typeFilter = null;
let attFilter = null;
let chatFilter = null;

for (const arg of args) {
	if (arg.startsWith('--type=')) {
		typeFilter = parseInt(arg.split('=')[1]);
	} else if (arg.startsWith('--att=')) {
		attFilter = parseInt(arg.split('=')[1]);
	} else if (arg.startsWith('--chat=')) {
		chatFilter = arg.split('=')[1];
	} else if (arg.startsWith('--db=')) {
		dbPath = arg.split('=')[1];
	} else if (!isNaN(parseInt(arg))) {
		limit = parseInt(arg);
	} else if (!arg.startsWith('--')) {
		query = arg;
	}
}

// Help display
if (args.length === 0 || args.includes('--help')) {
	console.log(`
Usage: node scripts/main/find-messages.mjs <query> [options]

Options:
  --type=<n>    Filter by message type (1=text, 4=call, 5=sticker, etc.)
  --att=<n>     Filter by attachment type (1=image, 3=voice, 14=file, etc.)
  --chat=<id>   Filter by chat ID
  --db=<path>   Database path (default: ./db/naver_line_backup.db)
  <number>      Limit results (default: 20)

Examples:
  node scripts/main/find-messages.mjs "hello"
  node scripts/main/find-messages.mjs --type=5              # All stickers
  node scripts/main/find-messages.mjs --att=3               # Voice messages
  node scripts/main/find-messages.mjs --att=19              # LINE Music
  node scripts/main/find-messages.mjs --att=14              # Files
  node scripts/main/find-messages.mjs "pdf" --att=14        # PDF files

Known Types:
  Message Types: 1=text, 2=image, 3=video, 4=call, 5=sticker, 8=post, 17=system
  Attachment Types: 0=none, 1=image, 3=voice, 6=call, 7=sticker, 13=contact,
                    14=file, 15=location, 16=post, 18=group, 19=music, 22=flex
`);
	process.exit(0);
}

const db = createClient({ url: `file:${dbPath}` });

async function main() {
	console.log(`\n📁 Database: ${dbPath}`);
	if (query) console.log(`🔍 Query: "${query}"`);
	if (typeFilter !== null) console.log(`📌 Type filter: ${typeFilter}`);
	if (attFilter !== null) console.log(`📎 Attachment filter: ${attFilter}`);
	if (chatFilter) console.log(`💬 Chat filter: ${chatFilter}`);
	console.log(`📊 Limit: ${limit}\n`);

	// Build SQL query
	let sql = `SELECT id, chat_id, type, attachement_type, from_mid, content, parameter,
                    location_name, location_address, created_time
             FROM chat_history WHERE 1=1`;
	const sqlArgs = [];

	if (query) {
		sql += ` AND (content LIKE ? OR parameter LIKE ?)`;
		sqlArgs.push(`%${query}%`, `%${query}%`);
	}
	if (typeFilter !== null) {
		sql += ` AND type = ?`;
		sqlArgs.push(typeFilter);
	}
	if (attFilter !== null) {
		sql += ` AND attachement_type = ?`;
		sqlArgs.push(attFilter);
	}
	if (chatFilter) {
		sql += ` AND chat_id = ?`;
		sqlArgs.push(chatFilter);
	}

	sql += ` ORDER BY created_time DESC LIMIT ?`;
	sqlArgs.push(limit);

	const messages = await db.execute({ sql, args: sqlArgs });

	console.log('='.repeat(60));
	console.log(`📨 Found: ${messages.rows.length} messages`);
	console.log('='.repeat(60));

	for (const msg of messages.rows) {
		const time = new Date(parseInt(msg.created_time)).toLocaleString('ja-JP');
		console.log(`\n[${msg.id}] ${time} | chat: ${msg.chat_id.substring(0, 8)}...`);
		console.log(`  type: ${msg.type}, att_type: ${msg.attachement_type}`);
		if (msg.content) {
			console.log(`  content: ${String(msg.content).substring(0, 100)}`);
		}
		if (msg.parameter) {
			const params = parseParameter(msg.parameter);
			// Show only important parameters
			const highlights = {};
			for (const [k, v] of Object.entries(params)) {
				if (
					[
						'SID',
						'STKID',
						'FILE_NAME',
						'DURATION',
						'displayName',
						'previewUrl',
						'serviceType'
					].includes(k)
				) {
					highlights[k] = v.substring(0, 50);
				}
			}
			if (Object.keys(highlights).length > 0) {
				console.log(`  params: ${JSON.stringify(highlights)}`);
			}
		}
		if (msg.location_address) {
			console.log(`  location: ${msg.location_address}`);
		}
	}

	console.log('\nDone.');
}

function parseParameter(param) {
	if (!param) return {};
	const result = {};
	const parts = param.split('\t');
	for (let i = 0; i < parts.length - 1; i += 2) {
		if (parts[i]) result[parts[i]] = parts[i + 1] || '';
	}
	return result;
}

main().catch(console.error);

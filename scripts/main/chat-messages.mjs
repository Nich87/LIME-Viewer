/**
 * Specific Chat Messages Inspection Script
 *
 * Usage:
 *   node scripts/main/chat-messages.mjs <chat_name_or_id> [limit] [db_path]
 *
 * Examples:
 *   node scripts/main/chat-messages.mjs ChatName
 *   node scripts/main/chat-messages.mjs ChatName 20
 *   node scripts/main/chat-messages.mjs c0123456789abcdef0123456789abcdef0 50
 *
 * Output:
 *   - Chat information
 *   - Message list (newest first)
 *   - Each message's type, attachement_type, content, parameter
 */

import { createClient } from '@libsql/client';

const chatNameOrId = process.argv[2];
const limit = parseInt(process.argv[3]) || 30;
const dbPath = process.argv[4] || './db/naver_line_backup.db';

if (!chatNameOrId) {
	console.log(`
Usage: node scripts/main/chat-messages.mjs <chat_name_or_id> [limit] [db_path]

Examples:
  node scripts/main/chat-messages.mjs ChatName
  node scripts/main/chat-messages.mjs ChatName 20
  node scripts/main/chat-messages.mjs c0123456789abcdef0123456789abcdef0 50
`);
	process.exit(1);
}

const db = createClient({ url: `file:${dbPath}` });

async function main() {
	console.log(`\n📁 Database: ${dbPath}`);
	console.log(`🔍 Search: "${chatNameOrId}"\n`);

	// Chat search
	let chatId = chatNameOrId;

	// If it doesn't look like a chat_id, search by name
	if (!chatNameOrId.startsWith('c') && !chatNameOrId.startsWith('u')) {
		const chatSearch = await db.execute({
			sql: `SELECT chat_id, chat_name, last_message, message_count
            FROM chat
            WHERE chat_name LIKE ? OR last_message LIKE ?
            LIMIT 5`,
			args: [`%${chatNameOrId}%`, `%${chatNameOrId}%`]
		});

		if (chatSearch.rows.length === 0) {
			console.log('❌ Chat not found');
			return;
		}

		console.log('📋 Found Chats:');
		chatSearch.rows.forEach((c, i) => {
			console.log(`  ${i + 1}. ${c.chat_id}`);
			console.log(`     Name: ${c.chat_name || '(no name)'}`);
			console.log(`     Last: ${c.last_message?.substring(0, 50) || '(no message)'}`);
			console.log(`     Count: ${c.message_count}`);
		});

		chatId = chatSearch.rows[0].chat_id;
		console.log(`\n➡️ Using: ${chatId}\n`);
	}

	// Get messages
	console.log('='.repeat(60));
	console.log(`📨 Messages (limit: ${limit}):`);
	console.log('='.repeat(60));

	const messages = await db.execute({
		sql: `SELECT id, type, attachement_type, from_mid, content, parameter,
                 location_name, location_address, location_latitude, location_longitude,
                 created_time
          FROM chat_history
          WHERE chat_id = ?
          ORDER BY created_time DESC
          LIMIT ?`,
		args: [chatId, limit]
	});

	console.log(`\nTotal: ${messages.rows.length} messages\n`);

	for (const msg of messages.rows) {
		const time = new Date(parseInt(msg.created_time)).toLocaleString('ja-JP');
		console.log(`\n[${msg.id}] ${time}`);
		console.log(`  type: ${msg.type}, att_type: ${msg.attachement_type}`);
		if (msg.content) {
			console.log(`  content: ${String(msg.content).substring(0, 80)}`);
		}
		if (msg.parameter) {
			// Parse parameter and display in readable format
			const params = parseParameter(msg.parameter);
			const importantKeys = [
				'SID',
				'STKID',
				'STKPKGID',
				'FILE_NAME',
				'FILE_SIZE',
				'DURATION',
				'TYPE',
				'RESULT',
				'displayName',
				'mid',
				'web_page_preview_type',
				'serviceType',
				'albumName',
				'FLEX_JSON',
				'previewUrl'
			];
			const filtered = {};
			for (const key of importantKeys) {
				if (params[key]) {
					filtered[key] = params[key].substring(0, 100);
				}
			}
			if (Object.keys(filtered).length > 0) {
				console.log(`  params: ${JSON.stringify(filtered)}`);
			}
		}
		if (msg.location_address) {
			console.log(`  location: ${msg.location_address}`);
		}
	}

	console.log('\n' + '='.repeat(60));
	console.log('Done.');
}

// Parse tab-delimited parameter
function parseParameter(param) {
	if (!param) return {};
	const result = {};
	const parts = param.split('\t');
	for (let i = 0; i < parts.length - 1; i += 2) {
		const key = parts[i];
		const value = parts[i + 1];
		if (key) result[key] = value || '';
	}
	return result;
}

main().catch(console.error);

/**
 * Chat List Display Script
 *
 * Usage:
 *   node scripts/main/list-chats.mjs [db_path]
 *
 * Output:
 *   - All chat list
 *   - Chat ID, name, message count, last message
 */

import { createClient } from '@libsql/client';

const dbPath = process.argv[2] || './db/naver_line_backup.db';
const db = createClient({ url: `file:${dbPath}` });

async function main() {
	console.log(`\n📁 Database: ${dbPath}\n`);

	// Get chat list
	const chats = await db.execute(`
    SELECT chat_id, chat_name, message_count, last_message, last_created_time, type
    FROM chat
    ORDER BY last_created_time DESC
  `);

	console.log('='.repeat(80));
	console.log(`💬 Chats: ${chats.rows.length}`);
	console.log('='.repeat(80));

	console.log('\n| # | Chat ID | Name | Messages | Type | Last Message |');
	console.log('|---|---------|------|----------|------|--------------|');

	chats.rows.forEach((chat, i) => {
		const chatType = chat.type === 1 ? '1:1' : chat.type === 3 ? 'Group' : `${chat.type}`;
		const lastMsg = chat.last_message ? chat.last_message.substring(0, 30) : '(none)';
		const name = chat.chat_name || '-';
		console.log(
			`| ${i + 1} | ${chat.chat_id.substring(0, 12)}... | ${name.substring(0, 20)} | ${chat.message_count} | ${chatType} | ${lastMsg} |`
		);
	});

	// Statistics
	console.log('\n' + '='.repeat(80));
	console.log('📊 Statistics:');

	const stats = await db.execute(`
    SELECT
      COUNT(*) as total_messages,
      COUNT(DISTINCT chat_id) as total_chats,
      COUNT(DISTINCT from_mid) as total_senders
    FROM chat_history
  `);

	const s = stats.rows[0];
	console.log(`  Total Messages: ${s.total_messages}`);
	console.log(`  Total Chats: ${s.total_chats}`);
	console.log(`  Total Senders: ${s.total_senders}`);

	console.log('\nDone.');
}

main().catch(console.error);

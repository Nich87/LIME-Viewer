import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:db/naver_line_backup.db' });

// Check for contacts table
console.log('=== Looking for contact-related tables ===');
const tables = await db.execute(`
    SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%contact%'
`);
console.log('Contact tables:', tables.rows);

// Profile related tables
const profileTables = await db.execute(`
    SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%profile%' OR name LIKE '%user%' OR name LIKE '%friend%')
`);
console.log('Profile/user tables:', profileTables.rows);

// Check for member_info, etc.
const memberTables = await db.execute(`
    SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%member%'
`);
console.log('Member tables:', memberTables.rows);

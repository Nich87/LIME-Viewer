/**
 * Database Service
 * Handles reading and querying the LINE backup database
 */

import initSqlJs, { type Database } from 'sql.js';
import type { ChatRoom, Message } from '$lib/schema';
import { MessageType } from '$lib/schema';
import { contactsService } from './contacts';
import { mediaService } from './media';
import { storageService } from './storage';
import { determineAttachment } from './messageParser';

export class DatabaseError extends Error {
	constructor(
		message: string,
		public readonly code: 'NOT_INITIALIZED' | 'LOAD_FAILED' | 'QUERY_FAILED' | 'STORAGE_FAILED'
	) {
		super(message);
		this.name = 'DatabaseError';
	}
}

class DatabaseService {
	private db: Database | null = null;
	private initialized = false;
	private dbBuffer: ArrayBuffer | null = null;

	async initialize(dbBuffer: ArrayBuffer, persist = true): Promise<void> {
		const SQL = await initSqlJs({
			// Load local wasm placed in static/sql-wasm.wasm for offline use
			locateFile: (file: string) => `/` + file
		});

		this.db = new SQL.Database(new Uint8Array(dbBuffer));
		this.dbBuffer = dbBuffer;
		this.initialized = true;

		if (persist) await storageService.saveDatabase(dbBuffer);
	}

	async loadFromStorage(): Promise<boolean> {
		const buffer = await storageService.loadDatabase();
		if (!buffer) {
			return false;
		}
		await this.initialize(buffer, false);
		return true;
	}

	isInitialized(): boolean {
		return this.initialized && this.db !== null;
	}

	async hasStoredData(): Promise<boolean> {
		return storageService.hasStoredData();
	}

	async getChats(): Promise<ChatRoom[]> {
		if (!this.db) throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');

		const chatsResult = this.db.exec('SELECT * FROM chat ORDER BY last_created_time DESC');
		if (chatsResult.length === 0) return [];

		const chats = chatsResult[0];
		const columns = chats.columns;
		const rows = chats.values;

		const groupsResult = this.db.exec('SELECT id, name FROM groups');
		const groupsMap = new Map<string, string>();
		if (groupsResult.length > 0) {
			groupsResult[0].values.forEach((row: (string | number | Uint8Array | null)[]) => {
				groupsMap.set(row[0] as string, row[1] as string);
			});
		}

		const chatRooms: ChatRoom[] = rows.map((row: (string | number | Uint8Array | null)[]) => {
			const rowObj: Record<string, unknown> = {};
			columns.forEach((col: string, i: number) => {
				rowObj[col] = row[i];
			});

			const chatId = rowObj.chat_id as string;
			const isGroup = groupsMap.has(chatId);
			let name = rowObj.chat_name as string | null;

			if (isGroup) {
				name = groupsMap.get(chatId)!;
			} else if (!name) {
				const contactName = contactsService.getContactName(chatId);
				if (contactName) {
					name = contactName;
				} else {
					name = 'Unknown';
				}
			}

			return {
				id: chatId,
				name: name || 'Unknown',
				memberCount: 0,
				lastMessage:
					(rowObj.input_text as string) || (rowObj.last_message as string) || 'No message',
				lastMessageTime: parseInt((rowObj.last_created_time as string) || '0'),
				unreadCount: (rowObj.unread_count as number) || 0,
				isGroup: isGroup,
				avatarUrl: undefined
			};
		});

		return chatRooms;
	}

	async getMessages(chatId: string, limit = 100, offset = 0): Promise<Message[]> {
		if (!this.db) {
			throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
		}

		const result = this.db.exec(
			`SELECT * FROM chat_history WHERE chat_id = ? ORDER BY created_time DESC LIMIT ? OFFSET ?`,
			[chatId, limit, offset]
		);

		if (result.length === 0) return [];

		const columns = result[0].columns;
		const rows = result[0].values;

		const messages: Message[] = rows.map((row: (string | number | Uint8Array | null)[]) => {
			const rowObj: Record<string, unknown> = {};
			columns.forEach((col: string, i: number) => {
				rowObj[col] = row[i];
			});

			const fromId = rowObj.from_mid as string | null;
			const isMe = !fromId || fromId === '';

			return {
				id: rowObj.id as number,
				serverId: rowObj.server_id as string,
				type: rowObj.type as MessageType,
				attachmentType: rowObj.attachement_type as number,
				chatId: rowObj.chat_id as string,
				fromId: fromId || '',
				fromName: fromId ? contactsService.getContactName(fromId) : undefined,
				content: rowObj.content as string | null,
				timestamp: parseInt(rowObj.created_time as string),
				isMe,
				status: rowObj.status === 3 ? 'read' : 'sent',
				attachment: determineAttachment(rowObj, chatId)
			};
		});

		return messages.reverse();
	}

	close(): void {
		if (this.db) {
			this.db.close();
			this.db = null;
			this.initialized = false;
			this.dbBuffer = null;
		}
	}

	// Clear all persisted data and close database
	async clearAllData(): Promise<void> {
		this.close();
		contactsService.clear();
		mediaService.clear();
		await storageService.clearAll();
	}
}

export const databaseService = new DatabaseService();

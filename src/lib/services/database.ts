/**
 * Database Service
 * Handles reading and querying the LINE backup database
 */

import initSqlJs, { type Database, type Statement } from 'sql.js';
import type { ChatRoom, GlobalMessageSearchResult, Message } from '$lib/schema';
import { MessageType } from '$lib/schema';
import { contactsService } from './contacts';
import { mediaService } from './media';
import { bubbleAssetService } from './bubbleAssets';
import { storageService } from './storage';
import { determineAttachment, extractMessageRelation } from './messageParser';
import { getLineGroupImageUrl, getLineProfileImageUrl } from '$lib/utils';

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

	private queryRows(sql: string, params?: unknown[]): Record<string, unknown>[] {
		if (!this.db) return [];

		let statement: Statement | null = null;
		const rows: Record<string, unknown>[] = [];

		try {
			statement = this.db.prepare(sql);
			if (params && params.length > 0) {
				statement.bind(params);
			}

			while (statement.step()) {
				rows.push(statement.getAsObject());
			}
		} finally {
			statement?.free();
		}

		return rows;
	}

	private toString(value: unknown, fallback = ''): string {
		if (typeof value === 'string') return value;
		if (typeof value === 'number' || typeof value === 'bigint') return String(value);
		return fallback;
	}

	private toNumber(value: unknown, fallback = 0): number {
		if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
		if (typeof value === 'bigint') return Number(value);
		if (typeof value === 'string') {
			const parsed = Number(value);
			return Number.isFinite(parsed) ? parsed : fallback;
		}
		return fallback;
	}

	private getSyntheticMessageContent(
		type: MessageType,
		fromId: string,
		fromName?: string
	): string | null {
		const actorName =
			fromName || (fromId ? contactsService.getContactName(fromId) : undefined) || '誰か';

		if (type === MessageType.CHAT_ROOM_BGM_UPDATED) {
			return `${actorName}がBGMを設定しました。`;
		}
		if (type === MessageType.CHAT_ROOM_BGM_DELETED) {
			return `${actorName}がBGMを削除しました。`;
		}
		if (type === MessageType.LINK_PREVIEW) {
			return '[リンク]';
		}
		return null;
	}

	private mapMessageRow(rowObj: Record<string, unknown>, fallbackChatId = ''): Message {
		const fromId = this.toString(rowObj.from_mid);
		const chatId = this.toString(rowObj.chat_id, fallbackChatId);
		const isMe = !fromId || fromId === '';
		const fromName = fromId ? contactsService.getContactName(fromId) : undefined;
		const type = this.toNumber(rowObj.type) as MessageType;
		const messageId = this.toNumber(rowObj.id);
		const content = rowObj.content == null ? null : this.toString(rowObj.content);
		const syntheticContent = !content
			? this.getSyntheticMessageContent(type, fromId, fromName)
			: null;
		const resolvedContent = syntheticContent ?? content;

		return {
			id: messageId,
			serverId: this.toString(rowObj.server_id),
			type,
			attachmentType: this.toNumber(rowObj.attachement_type),
			chatId,
			fromId: fromId || '',
			fromName,
			avatarUrl: isMe ? undefined : getLineProfileImageUrl(fromId),
			content: resolvedContent,
			timestamp: this.toNumber(rowObj.created_time),
			isMe,
			status: this.toNumber(rowObj.status) === 3 ? 'read' : 'sent',
			relation:
				rowObj.parameter == null
					? undefined
					: extractMessageRelation(this.toString(rowObj.parameter)),
			attachment: determineAttachment(rowObj, chatId)
		};
	}

	async initialize(dbBuffer: ArrayBuffer, persist = true): Promise<void> {
		const SQL = await initSqlJs({
			// sql.js can request different wasm filenames depending on build/runtime.
			// Always serve the bundled file from /static for offline use.
			locateFile: (file: string) => (file.endsWith('.wasm') ? '/sql-wasm.wasm' : `/${file}`)
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

		// NOTE: sql.js 1.14 browser build can return undefined `columns` from `exec()`.
		// Use `prepare()+getAsObject()` for stable row shape across versions.
		const rows = this.queryRows(`
			SELECT *
			FROM chat
			ORDER BY last_created_time DESC
		`);
		if (rows.length === 0) return [];

		const groupsMap = new Map<string, string>();
		try {
			const groupRows = this.queryRows('SELECT id, name FROM groups');
			for (const rowObj of groupRows) {
				const groupId = this.toString(rowObj.id);
				if (!groupId) continue;
				groupsMap.set(groupId, this.toString(rowObj.name, groupId));
			}
		} catch (error) {
			console.warn('Failed to load groups table:', error);
		}

		const keepMemoChatIds = new Set<string>();
		try {
			const keepMemoRows = this.queryRows(
				'SELECT DISTINCT chat_id FROM chat_history WHERE type = ?',
				[MessageType.CREATE_MEMO_CHAT]
			);
			for (const rowObj of keepMemoRows) {
				const keepMemoChatId = this.toString(rowObj.chat_id);
				if (keepMemoChatId) keepMemoChatIds.add(keepMemoChatId);
			}
		} catch (error) {
			console.warn('Failed to detect Keep Memo chats:', error);
		}

		const chatRooms: ChatRoom[] = [];
		for (const rowObj of rows) {
			const chatId = this.toString(rowObj.chat_id);
			if (!chatId) continue;

			const isGroup = groupsMap.has(chatId);
			const isKeepMemo = keepMemoChatIds.has(chatId);
			const partnerMid = this.toString(rowObj.mid_p);
			const messageCount = this.toNumber(rowObj.message_count);
			const readMessageCount = this.toNumber(rowObj.read_message_count);
			const unreadCount = Math.max(0, messageCount - readMessageCount);
			let name = this.toString(rowObj.chat_name);

			if (isKeepMemo) {
				name = 'Keepメモ';
			} else if (isGroup) {
				name = groupsMap.get(chatId) ?? name;
			} else if (!name) {
				const contactName = contactsService.getContactName(chatId);
				if (contactName) {
					name = contactName;
				} else {
					name = 'Unknown';
				}
			}

			chatRooms.push({
				id: chatId,
				name: name || 'Unknown',
				memberCount: 0,
				lastMessage:
					this.toString(rowObj.input_text) || this.toString(rowObj.last_message) || 'No message',
				lastMessageTime: this.toNumber(rowObj.last_created_time),
				unreadCount,
				isGroup: isGroup,
				avatarUrl: isGroup
					? getLineGroupImageUrl(chatId)
					: getLineProfileImageUrl(partnerMid || chatId),
				notificationDisabled: this.toNumber(rowObj.is_notification, 1) === 0
			});
		}

		return chatRooms;
	}

	async getMessages(chatId: string, limit = 100, offset = 0): Promise<Message[]> {
		if (!this.db) {
			throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
		}

		const rows = this.queryRows(
			`SELECT * FROM chat_history WHERE chat_id = ? ORDER BY created_time DESC LIMIT ? OFFSET ?`,
			[chatId, limit, offset]
		);
		if (rows.length === 0) return [];

		const messages = rows.map((rowObj) => this.mapMessageRow(rowObj, chatId));

		return messages.reverse();
	}

	async getAllMessages(chatId: string): Promise<Message[]> {
		if (!this.db) {
			throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
		}

		const rows = this.queryRows(
			`SELECT * FROM chat_history WHERE chat_id = ? ORDER BY created_time ASC`,
			[chatId]
		);
		if (rows.length === 0) return [];

		return rows.map((rowObj) => this.mapMessageRow(rowObj, chatId));
	}

	async searchGlobalMessages(query: string, limit = 80): Promise<GlobalMessageSearchResult[]> {
		if (!this.db) {
			throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
		}

		const trimmedQuery = query.trim();
		if (!trimmedQuery) return [];

		const rows = this.queryRows(
			`SELECT id, chat_id, from_mid, content, created_time
			 FROM chat_history
			 WHERE content IS NOT NULL AND content != '' AND content LIKE ?
			 ORDER BY created_time DESC
			 LIMIT ?`,
			[`%${trimmedQuery}%`, limit]
		);

		return rows.map((rowObj) => {
			const fromId = this.toString(rowObj.from_mid);
			return {
				id: this.toNumber(rowObj.id),
				chatId: this.toString(rowObj.chat_id),
				content: this.toString(rowObj.content),
				timestamp: this.toNumber(rowObj.created_time),
				fromId: fromId || '',
				fromName: fromId ? contactsService.getContactName(fromId) : undefined,
				avatarUrl: fromId ? getLineProfileImageUrl(fromId) : undefined
			};
		});
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
		bubbleAssetService.clear();
		await storageService.clearAll();
	}
}

export const databaseService = new DatabaseService();

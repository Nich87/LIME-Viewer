/**
 * Export service for chat history
 * Generates TEXT and CSV formats matching LINE's official export format
 */

import type { Message, ChatRoom } from '$lib/schema';
import { MessageType } from '$lib/schema';
import { formatCallDuration, getGroupEventText } from '$lib/utils';

// Constants
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;
const UTF8_BOM = new Uint8Array([0xef, 0xbb, 0xbf]);
const SEPARATOR_LINE = '═'.repeat(50);

// Attachment type to text mapping
const ATTACHMENT_TEXT_MAP: Record<string, string> = {
	sticker: '[スタンプ]',
	image: '[写真]',
	voice: '[ボイスメッセージ]',
	flex: '[Flexメッセージ]'
} as const;

// Message type to text mapping
const MESSAGE_TYPE_TEXT_MAP: Partial<Record<MessageType, string>> = {
	[MessageType.VIDEO]: '[動画]'
} as const;

/**
 * Get message content as plain text for export
 */
function getMessageContentText(message: Message): string {
	const { type, attachment, content } = message;

	// Group event
	if (attachment?.type === 'groupEvent' && attachment.groupEvent) {
		const { locKey, actorName, targetName } = attachment.groupEvent;
		return getGroupEventText(locKey, actorName, targetName);
	}

	// System message
	if (type === MessageType.SYSTEM) return content || '';

	// Simple attachment types
	if (type === MessageType.STICKER || attachment?.type === 'sticker') {
		return ATTACHMENT_TEXT_MAP.sticker;
	}

	if (attachment?.type && attachment.type in ATTACHMENT_TEXT_MAP) {
		return ATTACHMENT_TEXT_MAP[attachment.type];
	}

	// Simple message types
	if (type in MESSAGE_TYPE_TEXT_MAP) {
		return MESSAGE_TYPE_TEXT_MAP[type] ?? '';
	}

	// Call
	if (type === MessageType.CALL && attachment?.call) {
		return formatCallText(attachment.call);
	}

	// Complex attachment types
	if (attachment) {
		const text = formatComplexAttachment(attachment, content);
		if (text !== null) return text;
	}

	return content || '';
}

/**
 * Format call attachment to text
 */
function formatCallText(call: NonNullable<Message['attachment']>['call']): string {
	if (!call) return '';

	const callType = call.type === 'video' ? 'ビデオ通話' : '音声通話';

	switch (call.result) {
		case 'normal':
			return call.duration ? `☎ ${callType} ${formatCallDuration(call.duration)}` : `☎ ${callType}`;
		case 'canceled':
			return `☎ キャンセルされた${callType}`;
		case 'rejected':
			return '☎ 応答なし';
		default:
			return `☎ ${callType}`;
	}
}

/**
 * Format complex attachment types
 */
function formatComplexAttachment(
	attachment: NonNullable<Message['attachment']>,
	content: string | null
): string | null {
	switch (attachment.type) {
		case 'file':
			return attachment.file ? `[ファイル: ${attachment.file.name}]` : null;
		case 'location':
			return attachment.location
				? attachment.location.name
					? `[位置情報: ${attachment.location.name}]`
					: '[位置情報]'
				: null;
		case 'contact':
			return attachment.contact ? `[連絡先: ${attachment.contact.displayName}]` : null;
		case 'music':
			if (!attachment.music) return null;
			return attachment.music.artist
				? `♪ ${attachment.music.title} - ${attachment.music.artist}`
				: `♪ ${attachment.music.title}`;
		case 'post':
			if (!attachment.post) return null;
			return attachment.post.type === 'album'
				? `[アルバム${attachment.post.albumName ? `: ${attachment.post.albumName}` : ''}]`
				: '[ノート]';
		case 'link':
			return attachment.link?.url || content || '';
		default:
			return null;
	}
}

// Date/Time formatting utilities
const pad2 = (n: number): string => n.toString().padStart(2, '0');

function formatDateParts(date: Date) {
	return {
		year: date.getFullYear(),
		month: date.getMonth() + 1,
		day: date.getDate(),
		hours: date.getHours(),
		minutes: pad2(date.getMinutes()),
		weekday: WEEKDAYS[date.getDay()]
	};
}

function formatExportDate(date: Date): string {
	const { year, month, day, hours, minutes } = formatDateParts(date);
	const ampm = hours >= 12 ? '午後' : '午前';
	const displayHours = hours % 12 || 12;
	return `${year}/${month}/${day} ${ampm}${displayHours}:${minutes}`;
}

function formatMessageDate(timestamp: number): string {
	const { year, month, day, weekday } = formatDateParts(new Date(timestamp));
	return `${year}/${month}/${day}(${weekday})`;
}

function formatMessageTime(timestamp: number): string {
	const { hours, minutes } = formatDateParts(new Date(timestamp));
	return `${hours}:${minutes}`;
}

function formatDateStr(date: Date): string {
	const { year, month, day } = formatDateParts(date);
	return `${year}/${pad2(month)}/${pad2(day)}`;
}

function formatFilenameTimestamp(): string {
	const now = new Date();
	const { year, month, day, hours, minutes } = formatDateParts(now);
	return `${year}${pad2(month)}${pad2(day)}_${pad2(hours)}${minutes}`;
}

/**
 * Get sender name for message
 */
function getSenderName(msg: Message, selfName: string): string {
	return msg.isMe ? selfName : msg.fromName || '相手';
}

/**
 * Process messages and format as text lines with date grouping
 */
function formatMessagesAsTextLines(messages: Message[], selfName: string, lines: string[]): void {
	let currentDate = '';

	for (const msg of messages) {
		const msgDate = formatMessageDate(msg.timestamp);

		if (msgDate !== currentDate) {
			currentDate = msgDate;
			lines.push(currentDate);
		}

		const content = getMessageContentText(msg);
		if (!content) continue;

		const time = formatMessageTime(msg.timestamp);
		const senderName = getSenderName(msg, selfName);
		lines.push(`${time}\t${senderName}\t${content}`);
	}
}

/**
 * Export messages as TEXT format (LINE official format)
 */
export function exportAsText(
	chat: ChatRoom,
	messages: Message[],
	selfName: string = '自分'
): string {
	const lines: string[] = [
		`[LINE] ${chat.name}とのトーク履歴`,
		`保存日時：${formatExportDate(new Date())}`,
		''
	];

	formatMessagesAsTextLines(messages, selfName, lines);

	return lines.join('\n');
}

/**
 * Escape CSV field (handle quotes and commas)
 */
function escapeCSVField(value: string): string {
	return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Format message as CSV row
 */
function formatMessageAsCSVRow(
	msg: Message,
	selfName: string,
	chatName?: string,
	isGroup?: boolean
): string | null {
	const content = getMessageContentText(msg);
	if (!content) return null;

	const date = new Date(msg.timestamp);
	const fields = [
		...(chatName !== undefined
			? [escapeCSVField(chatName), escapeCSVField(isGroup ? 'はい' : 'いいえ')]
			: []),
		escapeCSVField(formatDateStr(date)),
		escapeCSVField(formatMessageTime(msg.timestamp)),
		escapeCSVField(getSenderName(msg, selfName)),
		escapeCSVField(content)
	];

	return fields.join(',');
}

/**
 * Export messages as CSV format
 */
export function exportAsCSV(
	chat: ChatRoom,
	messages: Message[],
	selfName: string = '自分'
): string {
	const lines: string[] = ['日付,時刻,送信者,メッセージ'];

	for (const msg of messages) {
		const row = formatMessageAsCSVRow(msg, selfName);
		if (row) lines.push(row);
	}

	return lines.join('\n');
}

/**
 * Download text content as a file
 */
export function downloadFile(
	content: string,
	filename: string,
	mimeType: string = 'text/plain'
): void {
	const blob = new Blob([UTF8_BOM, content], { type: `${mimeType};charset=utf-8` });
	const url = URL.createObjectURL(blob);

	const a = Object.assign(document.createElement('a'), { href: url, download: filename });
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Sanitize string for use in filename
 */
function sanitizeFilename(name: string): string {
	return name.replace(/[\\/:*?"<>|]/g, '_');
}

/**
 * Generate filename for export
 */
export function generateExportFilename(chatName: string, extension: 'txt' | 'csv'): string {
	return `[LINE] ${sanitizeFilename(chatName)}_${formatFilenameTimestamp()}.${extension}`;
}

/**
 * Export all chats as a single TEXT file
 */
export function exportAllChatsAsText(
	chats: ChatRoom[],
	getMessages: (chatId: string) => Message[],
	selfName: string = '自分'
): string {
	const lines: string[] = [
		'[LINE] 全トーク履歴',
		`保存日時：${formatExportDate(new Date())}`,
		`トーク数：${chats.length}件`,
		''
	];

	for (const chat of chats) {
		const messages = getMessages(chat.id);
		if (messages.length === 0) continue;

		lines.push(
			SEPARATOR_LINE,
			`■ ${chat.name}${chat.isGroup ? ' (グループ)' : ''}`,
			SEPARATOR_LINE,
			''
		);

		formatMessagesAsTextLines(messages, selfName, lines);
		lines.push('');
	}

	return lines.join('\n');
}

/**
 * Export all chats as a single CSV file
 */
export function exportAllChatsAsCSV(
	chats: ChatRoom[],
	getMessages: (chatId: string) => Message[],
	selfName: string = '自分'
): string {
	const lines: string[] = ['トーク名,グループ,日付,時刻,送信者,メッセージ'];

	for (const chat of chats) {
		const messages = getMessages(chat.id);

		for (const msg of messages) {
			const row = formatMessageAsCSVRow(msg, selfName, chat.name, chat.isGroup);
			if (row) lines.push(row);
		}
	}

	return lines.join('\n');
}

/**
 * Generate filename for all chats export
 */
export function generateAllExportFilename(extension: 'txt' | 'csv'): string {
	return `[LINE] 全トーク履歴_${formatFilenameTimestamp()}.${extension}`;
}

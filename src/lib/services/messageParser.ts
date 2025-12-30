/**
 *Message parser
 *Responsible for LINE backup DB parameter analysis and Attachment determination
 */

import type { Message } from '$lib/schema';
import { MessageType, AttachmentType } from '$lib/schema';
import { contactsService } from './contacts';
import { mediaService } from './media';

/**
 * Parse tab-delimited parameter string
 * @param param -A string in the format "key1\tvalue1\tkey2\tvalue2..."
 * @returns key value object
 */
export function parseParameter(param: string | null): Record<string, string> {
	if (!param) return {};
	const result: Record<string, string> = {};
	const parts = param.split('\t');
	for (let i = 0; i < parts.length - 1; i += 2) {
		const key = parts[i];
		const value = parts[i + 1];
		if (key) result[key] = value || '';
	}
	return result;
}

type MessageRecord = Record<string, unknown>;

interface AttachmentContext {
	msg: MessageRecord;
	chatId: string;
	params: Record<string, string>;
	messageId: number;
	attType: AttachmentType;
}

function handleVoiceMessage(ctx: AttachmentContext): Message['attachment'] {
	return {
		type: 'voice',
		url: mediaService.getMediaUrl(ctx.chatId, `voice_${ctx.messageId}.aac`),
		voice: {
			duration: ctx.params['DURATION'] ? parseInt(ctx.params['DURATION']) : 0,
			fileSize: ctx.params['FILE_SIZE'] ? parseInt(ctx.params['FILE_SIZE']) : undefined
		}
	};
}

function handleImage(ctx: AttachmentContext): Message['attachment'] {
	return {
		type: 'image',
		url: mediaService.getMediaUrl(ctx.chatId, String(ctx.messageId))
	};
}

function handleLinkPreview(ctx: AttachmentContext): Message['attachment'] | undefined {
	const content = ctx.msg.content as string;
	const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
	if (urlMatch) {
		return {
			type: 'link',
			link: {
				url: urlMatch[1],
				title: undefined
			}
		};
	}
	return undefined;
}

function handleLocation(ctx: AttachmentContext): Message['attachment'] {
	const locLat = ctx.msg.location_latitude as number | null;
	const locLng = ctx.msg.location_longitude as number | null;
	return {
		type: 'location',
		location: {
			name: (ctx.msg.location_name as string) || undefined,
			address: (ctx.msg.location_address as string) || undefined,
			latitude: locLat ? locLat / 1000000 : undefined,
			longitude: locLng ? locLng / 1000000 : undefined
		}
	};
}

function handleFile(ctx: AttachmentContext): Message['attachment'] {
	return {
		type: 'file',
		file: {
			name: ctx.params['FILE_NAME'] || 'Unknown file',
			size: parseInt(ctx.params['FILE_SIZE']) || 0,
			expireTimestamp: ctx.params['FILE_EXPIRE_TIMESTAMP']
				? parseInt(ctx.params['FILE_EXPIRE_TIMESTAMP'])
				: undefined
		}
	};
}

function handleContact(ctx: AttachmentContext): Message['attachment'] {
	return {
		type: 'contact',
		contact: {
			mid: ctx.params['mid'] || '',
			displayName: ctx.params['displayName'] || 'Unknown'
		}
	};
}

function handleLineMusic(ctx: AttachmentContext): Message['attachment'] {
	let trackId: string | undefined = ctx.params['id'];
	if (!trackId) {
		const linkUri = ctx.params['linkUri'] || ctx.params['a-linkUri'] || ctx.params['i-linkUri'];
		if (linkUri) {
			const match = linkUri.match(/subitem=(mt[a-f0-9]+)/i);
			if (match) trackId = match[1];
		}
	}
	return {
		type: 'music',
		music: {
			title: (ctx.msg.content as string) || ctx.params['text'] || ctx.params['title'] || 'Unknown',
			artist: ctx.params['subText'] || undefined,
			previewUrl: ctx.params['previewUrl'] || undefined,
			duration: ctx.params['duration'] ? parseInt(ctx.params['duration']) : undefined,
			trackId,
			linkUrl: ctx.params['linkUri'] || undefined
		}
	};
}

function handleFlexMessage(ctx: AttachmentContext): Message['attachment'] {
	const flexJson = ctx.params['FLEX_JSON'];
	let imageUrl: string | undefined;
	if (flexJson) {
		try {
			const parsed = JSON.parse(flexJson) as Record<string, unknown>;
			imageUrl = findImageUrlInFlex(parsed);
		} catch {
			// Invalid JSON, continue with undefined imageUrl
		}
	}
	return {
		type: 'flex',
		flex: {
			json: flexJson,
			imageUrl
		}
	};
}

function findImageUrlInFlex(obj: unknown): string | undefined {
	if (!obj || typeof obj !== 'object') return undefined;
	const record = obj as Record<string, unknown>;
	if (record.url && typeof record.url === 'string' && record.url.includes('http')) {
		return record.url;
	}
	for (const key of Object.keys(record)) {
		const found = findImageUrlInFlex(record[key]);
		if (found) return found;
	}
	return undefined;
}

function handlePostNotification(ctx: AttachmentContext): Message['attachment'] {
	const isAlbum = ctx.params['serviceType'] === 'AB';
	return {
		type: 'post',
		post: {
			type: isAlbum ? 'album' : 'note',
			albumName: ctx.params['albumName'] || undefined,
			text: ctx.params['text'] || undefined,
			postUrl: ctx.params['postEndUrl'] || undefined
		}
	};
}

function handleSticker(ctx: AttachmentContext): Message['attachment'] {
	const parameter = ctx.msg.parameter as string | null;
	const pkgMatch = parameter?.match(/STKPKGID["']?[:=\t]?\s*["']?(\d+)/i);
	const stkMatch = parameter?.match(/STKID["']?[:=\t]?\s*["']?(\d+)/i);

	if (pkgMatch && stkMatch) {
		return {
			type: 'sticker',
			metadata: {
				packageId: pkgMatch[1],
				stickerId: stkMatch[1]
			}
		};
	}
	if (ctx.params['STKPKGID'] && ctx.params['STKID']) {
		return {
			type: 'sticker',
			metadata: {
				packageId: ctx.params['STKPKGID'],
				stickerId: ctx.params['STKID']
			}
		};
	}
	return { type: 'sticker', metadata: {} };
}

function handleCall(ctx: AttachmentContext): Message['attachment'] {
	const callType = ctx.params['TYPE'] === 'V' ? 'video' : 'audio';
	const result = (ctx.params['RESULT'] || 'normal').toLowerCase() as
		| 'normal'
		| 'canceled'
		| 'rejected';
	const duration = ctx.params['DURATION'] ? parseInt(ctx.params['DURATION']) : 0;
	return {
		type: 'call',
		call: {
			type: callType,
			result,
			duration
		}
	};
}

function parseGroupEvent(params: Record<string, string>): Message['attachment'] {
	const locKey = params['LOC_KEY'];
	const locArgs = params['LOC_ARGS'] || '';
	const mids: string[] = [];
	const midPattern = /u[a-f0-9]{32}/g;
	let match;
	while ((match = midPattern.exec(locArgs)) !== null) {
		mids.push(match[0]);
	}
	return {
		type: 'groupEvent',
		groupEvent: {
			locKey,
			mids,
			actorName: mids[0] ? contactsService.getContactName(mids[0]) : undefined,
			targetName: mids[1] ? contactsService.getContactName(mids[1]) : undefined
		}
	};
}

// Determine message attachment information
export function determineAttachment(
	msg: MessageRecord,
	chatId: string
): Message['attachment'] | undefined {
	const attType = msg.attachement_type as AttachmentType;
	const params = parseParameter(msg.parameter as string | null);
	const messageId = msg.id as number;
	const ctx: AttachmentContext = { msg, chatId, params, messageId, attType };

	const handlers: Array<{ condition: boolean; handle: () => Message['attachment'] | undefined }> = [
		{
			condition: attType === AttachmentType.AUDIO || params['SID'] === 'ema',
			handle: () => handleVoiceMessage(ctx)
		},
		{ condition: attType === AttachmentType.IMAGE, handle: () => handleImage(ctx) },
		{
			condition:
				attType === AttachmentType.NONE &&
				!!params['web_page_preview_type'] &&
				typeof msg.content === 'string',
			handle: () => handleLinkPreview(ctx)
		},
		{ condition: attType === AttachmentType.LOCATION, handle: () => handleLocation(ctx) },
		{ condition: attType === AttachmentType.FILE, handle: () => handleFile(ctx) },
		{ condition: attType === AttachmentType.CONTACT, handle: () => handleContact(ctx) },
		{ condition: attType === AttachmentType.LINE_MUSIC, handle: () => handleLineMusic(ctx) },
		{ condition: attType === AttachmentType.FLEX, handle: () => handleFlexMessage(ctx) },
		{
			condition: msg.type === MessageType.POST_NOTIFICATION || attType === AttachmentType.POST,
			handle: () => handlePostNotification(ctx)
		},
		{ condition: msg.type === MessageType.STICKER, handle: () => handleSticker(ctx) },
		{ condition: msg.type === MessageType.CALL, handle: () => handleCall(ctx) },
		{ condition: msg.type === MessageType.IMAGE, handle: () => handleImage(ctx) },
		{
			condition:
				attType === AttachmentType.GROUP_EVENT &&
				(msg.type === MessageType.GROUP_EVENT || msg.type === MessageType.SYSTEM),
			handle: () => parseGroupEvent(params)
		}
	];

	for (const { condition, handle } of handlers) {
		if (condition) return handle();
	}

	return undefined;
}

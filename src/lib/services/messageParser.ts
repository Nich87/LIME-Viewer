/**
 *Message parser
 *Responsible for LINE backup DB parameter analysis and Attachment determination
 */

import type { Message } from '$lib/schema';
import { MessageType, AttachmentType } from '$lib/schema';
import { getLineCdnImageUrl } from '$lib/utils';
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

export function extractMessageRelation(param: string | null): Message['relation'] | undefined {
	const params = parseParameter(param);
	const serverMessageId = params['message_relation_server_message_id'] || undefined;
	const serviceCode = params['message_relation_service_code'] || undefined;
	const typeCode = params['message_relation_type_code'] || undefined;

	if (!serverMessageId && !serviceCode && !typeCode) return undefined;

	return {
		serverMessageId,
		serviceCode,
		typeCode
	};
}

type MessageRecord = Record<string, unknown>;

interface AttachmentContext {
	msg: MessageRecord;
	chatId: string;
	params: Record<string, string>;
	messageId: number;
	attType: AttachmentType;
}

function parseOptionalInt(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const parsed = parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function hasParam(params: Record<string, string>, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(params, key);
}

function hasAnyParam(params: Record<string, string>, keys: string[]): boolean {
	return keys.some((key) => hasParam(params, key));
}

function getParamValue(params: Record<string, string>, keys: string[]): string | undefined {
	for (const key of keys) {
		const value = params[key];
		if (value !== undefined && value !== '') return value;
	}
	return undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
	if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
	if (typeof value === 'string') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function getMediaAssetInfo(params: Record<string, string>) {
	return {
		objectId: params['OID'] || undefined,
		serviceId: params['SID'] || undefined,
		encryptionKey: params['ENC_KM'] || undefined
	};
}

function getStringValue(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const normalized = value.trim();
	return normalized || undefined;
}

function getImageCdnFallbackUrl(ctx: AttachmentContext): string | undefined {
	const localUri = getLineCdnImageUrl(getStringValue(ctx.msg.attachement_local_uri));
	if (localUri) return localUri;

	for (const value of Object.values(ctx.params)) {
		const url = getLineCdnImageUrl(value);
		if (url) return url;
	}

	return undefined;
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
	if (value == null || value === '') return undefined;
	const normalized = value.trim().toLowerCase();
	if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
	if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
	return undefined;
}

function normalizeCallResult(result: string | undefined): 'normal' | 'canceled' | 'rejected' {
	const normalized = result?.trim().toLowerCase();
	if (!normalized || normalized === 'normal') return 'normal';
	if (
		[
			'canceled',
			'cancelled',
			'cancel',
			'missed',
			'canceled_by_caller',
			'canceled-by-caller'
		].includes(normalized)
	) {
		return 'canceled';
	}
	return 'rejected';
}

function normalizeSingleCallType(type: string | undefined): 'audio' | 'video' {
	const normalized = type?.trim().toLowerCase();
	return normalized === 'v' || normalized === 'video' || normalized === 'videocall'
		? 'video'
		: 'audio';
}

function normalizeGroupCallMediaType(
	type: string | undefined
): NonNullable<NonNullable<Message['attachment']>['call']>['type'] {
	const normalized = type?.trim().toLowerCase();
	if (normalized === 'video') return 'video';
	if (normalized === 'live') return 'live';
	if (normalized === 'photobooth' || normalized === 'photo_booth') return 'photoBooth';
	return 'audio';
}

function normalizeGroupCallState(
	type: string | undefined
): NonNullable<NonNullable<Message['attachment']>['call']>['groupState'] {
	const normalized = type?.trim().toUpperCase();
	if (normalized === 'S' || normalized === 'STARTED') return 'started';
	if (normalized === 'E' || normalized === 'ENDED') return 'ended';
	if (normalized === 'I' || normalized === 'INVITED') return 'invited';
	return undefined;
}

function normalizePaymentType(
	type: string | undefined
): NonNullable<NonNullable<Message['attachment']>['paymentTransfer']>['paymentType'] {
	const normalized = type?.trim().toUpperCase();
	if (normalized === 'INVITATION') return 'invitation';
	if (normalized === 'REQUEST') return 'request';
	if (normalized === 'DUTCH_REQUEST') return 'dutchRequest';
	if (normalized === 'TRANSFER') return 'transfer';
	return 'unknown';
}

function normalizeGiftProductType(
	type: string | undefined
): NonNullable<NonNullable<Message['attachment']>['gift']>['productType'] {
	const normalized = type?.trim().toUpperCase();
	if (normalized === 'STICKER') return 'sticker';
	if (normalized === 'THEME') return 'theme';
	if (normalized === 'STICON') return 'sticon';
	return 'unknown';
}

function getUndecryptedReason(
	params: Record<string, string>
): NonNullable<NonNullable<Message['attachment']>['e2eeUndecrypted']>['reason'] {
	if (parseOptionalBoolean(params['IS_UNREAD_AT_RESTORE_FROM_MESSAGE_BOX'])) {
		return 'unreadAtRestoreFromMessageBox';
	}
	if (parseOptionalBoolean(params['IS_VERIFICATION_HMAC_FAILURE'])) {
		return 'verificationHmacFailure';
	}
	if (parseOptionalBoolean(params['isUnreadAtRestoreFromMessageBox'])) {
		return 'unreadAtRestoreFromMessageBox';
	}
	if (parseOptionalBoolean(params['isVerificationHmacFailure'])) {
		return 'verificationHmacFailure';
	}
	return 'unknown';
}

function getUndecryptedContentHint(
	ctx: AttachmentContext
): NonNullable<NonNullable<Message['attachment']>['e2eeUndecrypted']>['contentHint'] {
	const originalType = getParamValue(ctx.params, ['ORIGINAL_CONTENT_TYPE'])?.trim().toLowerCase();
	if (originalType) {
		if (originalType.includes('text')) return 'text';
		if (originalType.includes('image')) return 'image';
		if (originalType.includes('video')) return 'video';
		if (originalType.includes('audio') || originalType.includes('voice')) return 'audio';
	}
	if (ctx.attType === AttachmentType.IMAGE || ctx.msg.type === MessageType.IMAGE) return 'image';
	if (ctx.msg.type === MessageType.VIDEO) return 'video';
	if (ctx.attType === AttachmentType.AUDIO) return 'audio';
	return typeof ctx.msg.content === 'string' && ctx.msg.content.trim() ? 'text' : 'other';
}

function handleVoiceMessage(ctx: AttachmentContext): Message['attachment'] {
	return {
		type: 'voice',
		url: mediaService.getMediaUrl(ctx.chatId, `voice_${ctx.messageId}.aac`),
		voice: {
			duration:
				parseOptionalInt(
					getParamValue(ctx.params, ['DURATION', 'VOICE_DURATION', 'AUDLEN', 'voiceDuration'])
				) ?? 0,
			fileSize: parseOptionalInt(getParamValue(ctx.params, ['FILE_SIZE', 'TRANSFER_FILE_SIZE'])),
			...getMediaAssetInfo(ctx.params)
		}
	};
}

function handleImage(ctx: AttachmentContext): Message['attachment'] {
	const localUrl = mediaService.getMediaUrl(ctx.chatId, String(ctx.messageId));
	const cdnUrl = getImageCdnFallbackUrl(ctx);

	return {
		type: 'image',
		url: localUrl ?? cdnUrl,
		image: {
			width: toOptionalNumber(ctx.msg.attachement_image_width),
			height: toOptionalNumber(ctx.msg.attachement_image_height),
			size:
				parseOptionalInt(getParamValue(ctx.params, ['FILE_SIZE', 'TRANSFER_FILE_SIZE'])) ??
				toOptionalNumber(ctx.msg.attachement_image_size),
			groupId: getParamValue(ctx.params, ['MULTIPLE_IMAGE_SERVER_GROUP_ID', 'GID']) || undefined,
			groupSequence: parseOptionalInt(
				getParamValue(ctx.params, ['MULTIPLE_IMAGE_GROUP_SEQUENCE_NUMBER', 'GSEQ'])
			),
			groupTotal: parseOptionalInt(
				getParamValue(ctx.params, ['MULTIPLE_IMAGE_GROUP_TOTAL_COUNT', 'GTOTAL'])
			),
			isMultipleImageGroup:
				parseOptionalBoolean(
					getParamValue(ctx.params, [
						'IS_ANCHOR_IN_MULTIPLE_IMAGE_GROUP',
						'is_anchor_in_multiple_image_group'
					])
				) ||
				!!getParamValue(ctx.params, ['MULTIPLE_IMAGE_SERVER_GROUP_ID', 'GID']) ||
				undefined,
			...getMediaAssetInfo(ctx.params)
		}
	};
}

function handleVideo(ctx: AttachmentContext): Message['attachment'] {
	return {
		type: 'video',
		url: mediaService.getMediaUrl(ctx.chatId, String(ctx.messageId)),
		video: {
			width: toOptionalNumber(ctx.msg.attachement_image_width),
			height: toOptionalNumber(ctx.msg.attachement_image_height),
			size:
				parseOptionalInt(getParamValue(ctx.params, ['FILE_SIZE', 'TRANSFER_FILE_SIZE'])) ??
				toOptionalNumber(ctx.msg.attachement_image_size),
			duration: parseOptionalInt(
				getParamValue(ctx.params, ['DURATION', 'PLAYABLE_CONTENT_DURATION'])
			),
			...getMediaAssetInfo(ctx.params)
		}
	};
}

function handleLinkPreview(ctx: AttachmentContext): Message['attachment'] | undefined {
	const directUrl = getParamValue(ctx.params, ['LINK_LINKURI', 'linkUri']);
	const title = getParamValue(ctx.params, ['LINK_LINKTEXT', 'title']);
	const subText = getParamValue(ctx.params, ['LINK_SUBTEXT', 'subText']);
	const content = typeof ctx.msg.content === 'string' ? ctx.msg.content : '';
	const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
	const url = directUrl || urlMatch?.[1];

	if (!url) return undefined;

	return {
		type: 'link',
		link: {
			url,
			title,
			subText
		}
	};
}

function handlePaymentTransfer(ctx: AttachmentContext): Message['attachment'] {
	let paymentType = normalizePaymentType(ctx.params['PAYMENT_TYPE']);
	const requestId =
		getParamValue(ctx.params, ['KEY_PAYMENT_REQUEST_ID', 'REQUEST_ID']) || undefined;
	const transactionId =
		getParamValue(ctx.params, ['KEY_PAYMENT_TRANSFAR_TRANSACTION_ID', 'TRANSACTION_ID']) ||
		undefined;
	const representativeUserId =
		getParamValue(ctx.params, ['KEY_PAYMENT_REQUESTED_REPRESENTATIVE_USER_ID', 'TO_USER']) ||
		undefined;
	const requestedUserCount = parseOptionalInt(
		getParamValue(ctx.params, ['KEY_PAYMENT_REQUESTED_USER_COUNT', 'TO_USER_NUM'])
	);
	const templateId = parseOptionalInt(
		getParamValue(ctx.params, ['KEY_PAYMENT_TEMPLATE_ID', 'MSGTPL'])
	);
	const linkUrl = getParamValue(ctx.params, ['KEY_PAYMENT_LINK_URL', 'LINK_URL']) || undefined;
	const notificationText =
		getParamValue(ctx.params, ['KEY_PAYMENT_NOTIFICATION_TEXT', 'NOTIFICATION']) || undefined;
	const receivableDaysText =
		getParamValue(ctx.params, ['KEY_PAYMENT_RECEIVABLE_DAYS_TEXT', 'RECEIVABLE_DAYS']) || undefined;
	const payBalancePriceText =
		getParamValue(ctx.params, ['KEY_PAYMENT_DISP_PAY_PRICE_TEXT', 'DISP_PRICE_PAY_BAL']) ||
		undefined;
	const lightBalancePriceText =
		getParamValue(ctx.params, ['KEY_PAYMENT_DISP_LIGHT_PRICE_TEXT', 'DISP_PRICE_LIGHT_BAL']) ||
		undefined;
	const isBillSplitting = paymentType === 'dutchRequest' || (requestedUserCount ?? 0) > 1;
	if (paymentType === 'unknown') {
		if (
			transactionId ||
			notificationText ||
			receivableDaysText ||
			payBalancePriceText ||
			lightBalancePriceText
		) {
			paymentType = 'transfer';
		} else if (representativeUserId || requestedUserCount !== undefined) {
			paymentType = isBillSplitting ? 'dutchRequest' : 'request';
		} else if (requestId || linkUrl || templateId !== undefined) {
			paymentType = 'invitation';
		}
	}

	return {
		type: 'paymentTransfer',
		paymentTransfer: {
			paymentType,
			priceText: getParamValue(ctx.params, ['KEY_PAYMENT_PRICE_TEXT', 'DISP_PRICE']) || undefined,
			requestId,
			transactionId,
			linkUrl,
			notificationText,
			receivableDaysText,
			representativeUserId,
			requestedUserCount,
			templateId,
			payBalancePriceText,
			lightBalancePriceText,
			isBillSplitting
		}
	};
}

function handleGift(ctx: AttachmentContext): Message['attachment'] {
	const productId = getParamValue(ctx.params, ['GIFT_PRODUCT_ID', 'PRDID']) || undefined;
	const productType = normalizeGiftProductType(
		getParamValue(ctx.params, ['GIFT_PRODUCT_TYPE', 'PRDTYPE'])
	);

	return {
		type: 'gift',
		gift: {
			orderId: getParamValue(ctx.params, ['GIFT_ORDER_ID', 'ORDERID']) || undefined,
			productType,
			productId,
			packageId:
				getParamValue(ctx.params, ['STICKER_PACKAGE_ID', 'STKPKGID']) ||
				(productType === 'theme' ? undefined : productId)
		}
	};
}

function handleUndecryptedMessage(ctx: AttachmentContext): Message['attachment'] {
	return {
		type: 'e2eeUndecrypted',
		e2eeUndecrypted: {
			reason: getUndecryptedReason(ctx.params),
			contentHint: getUndecryptedContentHint(ctx),
			verificationHmacFailure:
				parseOptionalBoolean(ctx.params['IS_VERIFICATION_HMAC_FAILURE']) ??
				parseOptionalBoolean(ctx.params['isVerificationHmacFailure']),
			contentInfo: getParamValue(ctx.params, ['OBS_CONTENT_INFO', 'obsContentInfo']) || undefined,
			copyServerMessageId: ctx.params['OBSCOPY_ENCRYPTED_CONTENT_SERVER_MESSAGE_ID'] || undefined,
			copyKeyMaterial: ctx.params['OBSCOPY_ENCRYPTED_CONTENT_KEY_MATERIAL'] || undefined
		}
	};
}

function hasPaymentTransferParams(params: Record<string, string>): boolean {
	return hasAnyParam(params, [
		'PAYMENT_TYPE',
		'KEY_PAYMENT_REQUEST_ID',
		'KEY_PAYMENT_TRANSFAR_TRANSACTION_ID',
		'KEY_PAYMENT_PRICE_TEXT',
		'KEY_PAYMENT_LINK_URL',
		'KEY_PAYMENT_NOTIFICATION_TEXT',
		'KEY_PAYMENT_REQUESTED_REPRESENTATIVE_USER_ID',
		'KEY_PAYMENT_REQUESTED_USER_COUNT',
		'KEY_PAYMENT_TEMPLATE_ID',
		'KEY_PAYMENT_DISP_PAY_PRICE_TEXT',
		'KEY_PAYMENT_DISP_LIGHT_PRICE_TEXT',
		'REQUEST_ID',
		'TRANSACTION_ID',
		'DISP_PRICE',
		'NOTIFICATION',
		'LINK_URL',
		'TO_USER',
		'TO_USER_NUM'
	]);
}

function hasGiftParams(params: Record<string, string>): boolean {
	return hasAnyParam(params, [
		'GIFT_ORDER_ID',
		'GIFT_PRODUCT_ID',
		'GIFT_PRODUCT_TYPE',
		'ORDERID',
		'PRDID',
		'PRDTYPE'
	]);
}

function hasUndecryptedParams(params: Record<string, string>): boolean {
	return hasAnyParam(params, [
		'IS_UNREAD_AT_RESTORE_FROM_MESSAGE_BOX',
		'IS_VERIFICATION_HMAC_FAILURE',
		'OBS_CONTENT_INFO',
		'OBSCOPY_ENCRYPTED_CONTENT_SERVER_MESSAGE_ID',
		'OBSCOPY_ENCRYPTED_CONTENT_KEY_MATERIAL',
		'isUnreadAtRestoreFromMessageBox',
		'isVerificationHmacFailure'
	]);
}

function hasGroupCallParams(params: Record<string, string>): boolean {
	return hasAnyParam(params, [
		'VOIP_GC_EVENT_TYPE',
		'VOIP_GC_EVENT_TYPE_OLD',
		'VOIP_GC_MEDIA_TYPE',
		'VOIP_GC_MEDIA_TYPE_OLD',
		'VOIP_GC_CHAT_MID',
		'VOIP_GC_CHAT_MID_OLD',
		'GC_EVT_TYPE',
		'voipGcEventType',
		'GC_MEDIA_TYPE',
		'voipGcMediaType',
		'GC_CHAT_MID',
		'voipGcChatMid'
	]);
}

function hasContactParams(params: Record<string, string>): boolean {
	return hasAnyParam(params, ['mid', 'displayName', 'CONTACT_MID', 'CONTACT_DISPLAYNAME']);
}

function hasDeviceContactParams(params: Record<string, string>): boolean {
	return hasAnyParam(params, ['vCard', 'CONTACT_VCARD']);
}

function hasLinkPreviewParams(params: Record<string, string>): boolean {
	return hasAnyParam(params, [
		'WEB_PAGE_PREVIEW_TYPE',
		'web_page_preview_type',
		'LINK_LINKURI',
		'linkUri'
	]);
}

function hasRichContentParams(params: Record<string, string>): boolean {
	return hasAnyParam(params, ['MARKUP_JSON', 'DOWNLOAD_URL', 'ALT_TEXT', 'SPEC_REV']);
}

function handleGroupCall(ctx: AttachmentContext): Message['attachment'] {
	const mediaType = getParamValue(ctx.params, [
		'VOIP_GC_MEDIA_TYPE',
		'VOIP_GC_MEDIA_TYPE_OLD',
		'GC_MEDIA_TYPE',
		'voipGcMediaType'
	]);
	const normalizedEventType = getParamValue(ctx.params, [
		'VOIP_GC_EVENT_TYPE',
		'VOIP_GC_EVENT_TYPE_OLD',
		'GC_EVT_TYPE',
		'voipGcEventType'
	]);
	const rawResult = getParamValue(ctx.params, [
		'RESULT',
		'voipResult',
		'VOIP_RESULT',
		'VOIP_RESULT_OLD'
	]);

	return {
		type: 'call',
		call: {
			type: normalizeGroupCallMediaType(mediaType),
			result: normalizeCallResult(rawResult),
			duration: parseOptionalInt(
				getParamValue(ctx.params, [
					'DURATION',
					'voipDuration',
					'VOIP_DURATION',
					'VOIP_DURATION_OLD'
				])
			),
			rawResult: rawResult || undefined,
			scope: 'group',
			groupState: normalizeGroupCallState(normalizedEventType),
			groupChatId: getParamValue(ctx.params, [
				'VOIP_GC_CHAT_MID',
				'VOIP_GC_CHAT_MID_OLD',
				'GC_CHAT_MID',
				'voipGcChatMid'
			])
		}
	};
}

function handleLocation(ctx: AttachmentContext): Message['attachment'] {
	const locLat = ctx.msg.location_latitude as number | null;
	const locLng = ctx.msg.location_longitude as number | null;
	return {
		type: 'location',
		location: {
			name: (ctx.msg.location_name as string) || undefined,
			address: (ctx.msg.location_address as string) || undefined,
			phone: (ctx.msg.location_phone as string) || undefined,
			latitude: locLat ? locLat / 1000000 : undefined,
			longitude: locLng ? locLng / 1000000 : undefined
		}
	};
}

function handleFile(ctx: AttachmentContext): Message['attachment'] {
	return {
		type: 'file',
		file: {
			name: getParamValue(ctx.params, ['FILE_NAME', 'TRANSFER_FILE_NAME']) || 'Unknown file',
			size: parseOptionalInt(getParamValue(ctx.params, ['FILE_SIZE', 'TRANSFER_FILE_SIZE'])) ?? 0,
			expireTimestamp: getParamValue(ctx.params, ['FILE_EXPIRE_TIMESTAMP'])
				? parseInt(getParamValue(ctx.params, ['FILE_EXPIRE_TIMESTAMP'])!, 10)
				: undefined,
			...getMediaAssetInfo(ctx.params)
		}
	};
}

function handleContact(ctx: AttachmentContext): Message['attachment'] {
	const mid = getParamValue(ctx.params, ['mid', 'CONTACT_MID']);
	const displayName =
		getParamValue(ctx.params, ['displayName', 'CONTACT_DISPLAYNAME']) ||
		(mid ? contactsService.getContactName(mid) : undefined) ||
		'Unknown';

	return {
		type: 'contact',
		contact: {
			mid,
			displayName
		}
	};
}

function handleDeviceContact(ctx: AttachmentContext): Message['attachment'] {
	return {
		type: 'deviceContact',
		deviceContact: {
			vCard: getParamValue(ctx.params, ['vCard', 'CONTACT_VCARD']) || '',
			displayName: getParamValue(ctx.params, ['displayName', 'CONTACT_DISPLAYNAME']) || undefined
		}
	};
}

function handleLineMusic(ctx: AttachmentContext): Message['attachment'] {
	let trackId: string | undefined = getParamValue(ctx.params, ['id', 'KEY_ID']);
	if (!trackId) {
		const linkUri = getParamValue(ctx.params, [
			'linkUri',
			'a-linkUri',
			'i-linkUri',
			'KEY_PLAY_URL'
		]);
		if (linkUri) {
			const match = linkUri.match(/subitem=(mt[a-f0-9]+)/i);
			if (match) trackId = match[1];
		}
	}
	return {
		type: 'music',
		music: {
			title:
				(ctx.msg.content as string) ||
				getParamValue(ctx.params, ['KEY_TEXT', 'text', 'title']) ||
				'Unknown',
			artist: getParamValue(ctx.params, ['subText', 'KEY_SUBTEXT']) || undefined,
			previewUrl: getParamValue(ctx.params, ['previewUrl', 'KEY_PREVIEW_URL']) || undefined,
			duration: parseOptionalInt(getParamValue(ctx.params, ['duration', 'KEY_DURATION'])),
			trackId,
			linkUrl: getParamValue(ctx.params, [
				'linkUri',
				'a-linkUri',
				'i-linkUri',
				'KEY_ANDROID_LINK_URI',
				'KEY_PLAY_URL'
			])
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
			imageUrl,
			altText: ctx.params['ALT_TEXT'] || undefined,
			indexableText: ctx.params['INDEXABLE_TEXT'] || undefined
		}
	};
}

function handleRichContent(ctx: AttachmentContext): Message['attachment'] {
	return {
		type: 'richContent',
		richContent: {
			markupJson: getParamValue(ctx.params, ['MARKUP_JSON']) || undefined,
			downloadUrl: getParamValue(ctx.params, ['DOWNLOAD_URL']) || undefined,
			altText: getParamValue(ctx.params, ['ALT_TEXT']) || undefined,
			specRevision: parseOptionalInt(getParamValue(ctx.params, ['SPEC_REV'])),
			isPublic: parseOptionalBoolean(getParamValue(ctx.params, ['PUBLIC'])),
			notificationDisabled: parseOptionalBoolean(
				getParamValue(ctx.params, ['NOTIFICATION_DISABLED'])
			)
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
	const isAlbum = getParamValue(ctx.params, ['serviceType', 'POSTTYPE_SERVICE_TYPE']) === 'AB';
	return {
		type: 'post',
		post: {
			type: isAlbum ? 'album' : 'note',
			albumName: getParamValue(ctx.params, ['albumName', 'POSTTYPE_ALBUM_NAME']) || undefined,
			text: getParamValue(ctx.params, ['text', 'POSTTYPE_TEXT']) || undefined,
			postUrl: getParamValue(ctx.params, ['postEndUrl', 'POSTTYPE_POST_END_URL']) || undefined
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
	const rawCallType = getParamValue(ctx.params, ['TYPE', 'voipType', 'VOIP_TYPE', 'VOIP_TYPE_OLD']);
	const rawResult = getParamValue(ctx.params, [
		'RESULT',
		'voipResult',
		'VOIP_RESULT',
		'VOIP_RESULT_OLD'
	]);
	const result = normalizeCallResult(rawResult);
	const duration =
		parseOptionalInt(
			getParamValue(ctx.params, ['DURATION', 'voipDuration', 'VOIP_DURATION', 'VOIP_DURATION_OLD'])
		) ?? 0;
	return {
		type: 'call',
		call: {
			type: normalizeSingleCallType(rawCallType),
			result,
			duration,
			phoneNumber: getParamValue(ctx.params, [
				'PHONE',
				'voipPhone',
				'VOIP_PHONE',
				'VOIP_PHONE_OLD'
			]),
			rawResult: rawResult || undefined,
			scope: 'single'
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
		{ condition: hasUndecryptedParams(params), handle: () => handleUndecryptedMessage(ctx) },
		{ condition: hasGiftParams(params), handle: () => handleGift(ctx) },
		{ condition: hasPaymentTransferParams(params), handle: () => handlePaymentTransfer(ctx) },
		{ condition: hasGroupCallParams(params), handle: () => handleGroupCall(ctx) },
		{ condition: hasDeviceContactParams(params), handle: () => handleDeviceContact(ctx) },
		{
			condition: attType === AttachmentType.RICH_CONTENT || hasRichContentParams(params),
			handle: () => handleRichContent(ctx)
		},
		{
			condition: attType === AttachmentType.AUDIO || params['SID'] === 'ema',
			handle: () => handleVoiceMessage(ctx)
		},
		{ condition: msg.type === MessageType.VIDEO, handle: () => handleVideo(ctx) },
		{
			condition: attType === AttachmentType.IMAGE || msg.type === MessageType.IMAGE,
			handle: () => handleImage(ctx)
		},
		{
			condition: attType === AttachmentType.NONE && hasLinkPreviewParams(params),
			handle: () => handleLinkPreview(ctx)
		},
		{ condition: attType === AttachmentType.LOCATION, handle: () => handleLocation(ctx) },
		{ condition: attType === AttachmentType.FILE, handle: () => handleFile(ctx) },
		{
			condition: attType === AttachmentType.CONTACT || hasContactParams(params),
			handle: () => handleContact(ctx)
		},
		{ condition: attType === AttachmentType.LINE_MUSIC, handle: () => handleLineMusic(ctx) },
		{ condition: attType === AttachmentType.FLEX, handle: () => handleFlexMessage(ctx) },
		{
			condition: msg.type === MessageType.POST_NOTIFICATION || attType === AttachmentType.POST,
			handle: () => handlePostNotification(ctx)
		},
		{ condition: msg.type === MessageType.STICKER, handle: () => handleSticker(ctx) },
		{ condition: msg.type === MessageType.CALL, handle: () => handleCall(ctx) },
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

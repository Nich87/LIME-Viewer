export enum MessageType {
	TEXT = 1,
	IMAGE = 2,
	VIDEO = 3,
	CALL = 4,
	STICKER = 5,
	POST_NOTIFICATION = 8, // Album, Note notifications
	GROUP_EVENT = 13, // Group member join/leave/add
	SYSTEM = 17,
	LINK_PREVIEW = 27,
	UNKNOWN_33 = 33
}

// LINE uses attachement_type to further distinguish content
export enum AttachmentType {
	NONE = 0,
	IMAGE = 1, // Image attachment (SID=emi)
	AUDIO = 3, // Voice message (SID=ema)
	CALL = 6,
	STICKER = 7,
	CONTACT = 13, // Contact/Profile share
	FILE = 14, // File attachment (PDF, etc.)
	LOCATION = 15, // Location share
	POST = 16, // Album/Note post notification
	GROUP_EVENT = 18, // Group member join/leave
	LINE_MUSIC = 19, // LINE Music share
	FLEX = 22 // Flex message (LINE Gift, etc.)
}

export interface ChatRoom {
	id: string;
	name: string;
	memberCount?: number;
	lastMessage: string | null;
	lastMessageTime: number;
	unreadCount: number;
	isGroup: boolean;
	avatarUrl?: string; // Group avatar or 1:1 friend's avatar
}

export interface LocationInfo {
	name?: string;
	address?: string;
	latitude?: number; // Scaled by 1,000,000 in DB
	longitude?: number; // Scaled by 1,000,000 in DB
}

export interface FileInfo {
	name: string;
	size: number;
	expireTimestamp?: number;
}

export interface ContactInfo {
	mid: string;
	displayName: string;
}

export interface MusicInfo {
	title: string;
	artist?: string;
	previewUrl?: string;
	duration?: number; // milliseconds
	trackId?: string; // LINE Music track ID for embed player
	linkUrl?: string; // Full LINE Music URL
}

export interface VoiceInfo {
	duration: number; // milliseconds
	fileSize?: number;
}

export interface LinkPreviewInfo {
	url: string;
	title?: string;
}

export interface FlexInfo {
	json?: string;
	imageUrl?: string;
}

export interface PostInfo {
	type: 'album' | 'note';
	albumName?: string;
	text?: string;
	postUrl?: string;
}

export interface GroupEventInfo {
	locKey: string; // A_MC, C_MI, C_MA etc.
	mids: string[];
	actorName?: string;
	targetName?: string;
}

export interface Message {
	id: number;
	serverId: string;
	type: MessageType;
	attachmentType?: AttachmentType;
	chatId: string;
	fromId: string; // Member ID
	fromName?: string; // Resolved display name
	content: string | null;
	timestamp: number;
	isMe: boolean; // Whether sent by the user
	status: 'sent' | 'read' | 'sending' | 'failed';

	// Attachment/sticker information
	attachment?: {
		type:
			| 'sticker'
			| 'image'
			| 'video'
			| 'call'
			| 'location'
			| 'file'
			| 'contact'
			| 'music'
			| 'flex'
			| 'post'
			| 'voice'
			| 'link'
			| 'groupEvent'
			| 'other';
		url?: string;
		metadata?: Record<string, unknown>; // e.g., sticker ID
		call?: {
			type: 'audio' | 'video';
			result: 'normal' | 'canceled' | 'rejected';
			duration?: number;
		};
		location?: LocationInfo;
		file?: FileInfo;
		contact?: ContactInfo;
		music?: MusicInfo;
		voice?: VoiceInfo;
		link?: LinkPreviewInfo;
		flex?: FlexInfo;
		post?: PostInfo;
		groupEvent?: GroupEventInfo;
	};
}

export interface GlobalMessageSearchResult {
	id: number;
	chatId: string;
	content: string;
	timestamp: number;
	fromId: string;
	fromName?: string;
}

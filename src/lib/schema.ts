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
	CHAT_ROOM_BGM_UPDATED = 30,
	CHAT_ROOM_BGM_DELETED = 31,
	CREATE_MEMO_CHAT = 33
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
	RICH_CONTENT = 17, // Legacy rich message (MARKUP_JSON / DOWNLOAD_URL)
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

// Raw database row definitions for tables in LINE backup databases.
export interface DbAndroidMetadata {
	locale?: string | null;
}

export interface DbVersion {
	contactId: string;
	version: number;
	syncedTime: number;
}

export interface DbChat {
	chatId: string;
	chatName?: string | null;
	ownerMid?: string | null;
	lastFromMid?: string | null;
	lastMessage?: string | null;
	lastCreatedTime?: string | null;
	messageCount?: number;
	readMessageCount?: number;
	latestMentionedPosition?: number;
	type?: number;
	isNotification?: number;
	skinKey?: string | null;
	inputText?: string | null;
	inputTextMetadata?: string | null;
	hideMember?: number;
	pTimer?: number;
	lastMessageDisplayTime?: string | null;
	midP?: string | null;
	isArchived?: number;
	readUp?: string | null;
	isGroupcalling?: number;
	latestAnnouncementSeq?: number;
	announcementViewStatus?: number;
	lastMessageMetaData?: string | null;
	chatRoomBgmData?: string | null;
	chatRoomBgmChecked?: number;
	chatRoomShouldShowBgmBadge?: number;
	unreadTypeAndCount?: string | null;
}

export interface ChatRoomBgmInfo {
	musicId?: string;
	title?: string;
	artistName?: string;
	thumbnailUrl?: string;
	androidMusicAppSchemeUrl?: string;
	musicUrl?: string;
	requestId?: string;
	countryCode?: string;
	type?: string;
	setterMid?: string;
	latestPlayableMusicType?: number;
}

export interface DbChatMember {
	chatId: string;
	mid: string;
	createdTime?: string | null;
}

export interface DbChatHistory {
	id: number;
	serverId?: string | null;
	type?: number;
	chatId?: string | null;
	fromMid?: string | null;
	content?: string | null;
	createdTime?: string | null;
	deliveredTime?: string | null;
	status?: number;
	sentCount?: number;
	readCount?: number;
	locationName?: string | null;
	locationAddress?: string | null;
	locationPhone?: string | null;
	locationLatitude?: number;
	locationLongitude?: number;
	attachmentImage?: number;
	attachmentImageHeight?: number;
	attachmentImageWidth?: number;
	attachmentImageSize?: number;
	attachmentType?: number;
	attachmentLocalUri?: string | null;
	parameter?: string | null;
	chunks?: Uint8Array | null;
}

export interface DbGroup {
	id: string;
	name?: string | null;
	pictureStatus?: string | null;
	creator?: string | null;
	status?: number;
	isFirst?: number;
	displayType?: number;
	acceptedInvitationTime?: number;
	updatedTime?: number;
	createdTime: number;
	preventedJoinbyTicket?: number;
	invitationTicket?: string | null;
	favoriteTimestamp?: number;
	invitationEnabled?: number;
	canAddMemberAsFriend?: number;
	canInviteByTicket?: number;
	isAutoName?: number;
}

export interface DbMembership {
	id: string;
	memberId: string;
	isAccepted: number;
	updatedTime: number;
	createdTime: number;
}

export interface DbSettingEntry {
	key: string;
	value?: string | null;
}

export interface DbPermanentTask {
	taskId: number;
	type?: number;
	priority?: number;
	params?: string | null;
	createdTime?: number;
	lastExecutedTime?: number;
}

export interface DbChatNotification {
	chatId: string;
	isNotification?: number;
	isGroupcalling?: number;
}

export interface DbMyTheme {
	productId: string;
	orderNum?: number;
	notifiedExpireBefore2Week?: number;
	notifiedExpireBefore1Week?: number;
}

export interface DbSticonPackage {
	sticonPkgId: number;
	sticonPkgVer?: number;
	downloadedSticonPkgVer?: number;
	metaDataVer?: number;
	downloadedMetaDataVer?: number;
	newFlagVer?: number;
	confirmedNewFlagVer?: number;
	orderNum?: number;
	stickerPkgId?: number;
	stickerPkgVer?: number;
	autoSuggestionDataRevision?: number;
}

export interface DbSticon {
	sticonPkgId: number;
	sticonCode: number;
	orderNum?: number;
	stickerId?: number;
	keyword?: string | null;
}

export interface DbStickerPackage {
	packageId: number;
	name?: string | null;
	version?: number;
	stickerType?: number;
	stickerSize?: number;
	authorId?: number;
	isDefault?: number;
	suggestionDataRevisionMillis?: number;
	stickerHash?: string | null;
	encryptedText?: string | null;
	availableForPhotoEdit?: number;
	isSubscription?: number;
	isShowOnly?: number;
	isSendable?: number;
	orderNum?: number;
	packageStatus?: number;
	expirationTimeMillis?: number;
	validDays?: number;
	downloadStatus?: number;
	downloadStartTimeMillis?: number;
	downloadCompleteTimeMillis?: number;
	installCompleteTimeMillis?: number;
	buddyMid?: string | null;
	availableForCombinationSticker?: number;
	combinationStickerUseType?: number;
	showPromotionBanner?: number;
	promotionType?: number;
	usageState?: number;
}

export interface DbSticker {
	stickerId: number;
	packageId: number;
	orderNum?: number;
	imageWidth?: number;
	imageHeight?: number;
	popupAlign?: number;
	popupScale?: number;
	popupLayer?: number;
	messagePlainText?: string | null;
	defaultMessagePlainText?: string | null;
}

export interface DbGroupHome {
	homeId: string;
	mid?: string | null;
	isGroup: number;
	isNoteNewflag: number;
	isAlbumNewflag: number;
	newflagExpiredtime: number;
}

export interface DbStickerAutoSuggestionTag {
	packageId: number;
	stickerId: number;
	tagId: string;
	weight: number;
}

export interface DbStickerHistory {
	stickerId: number;
	packageId: number;
	lastUsedInMillis: number;
	plainText: string;
	weight: number;
	combinationStickerId: string;
}

export interface DbMessageRequestBoxEntry {
	chatId: string;
}

export interface MessageReaction {
	// Depending on schema revision, reactions can reference either a server message ID
	// or a local message row ID.
	serverMessageId?: number | string;
	localMessageId?: number;
	memberId: string;
	chatId?: string;
	reactionTimeMillis: number;
	reactionType: string;
	customReaction?: string;
}

export interface DbReaction extends MessageReaction {
	serverMessageId: number;
	chatId: string;
}

export interface SquareMessageReaction {
	localMessageId: number;
	reactionTypeToCount: Record<string, number>;
	myReactionType?: string;
}

export interface LocationInfo {
	name?: string;
	address?: string;
	phone?: string;
	latitude?: number; // Scaled by 1,000,000 in DB
	longitude?: number; // Scaled by 1,000,000 in DB
}

export interface MediaAssetInfo {
	objectId?: string;
	serviceId?: string;
	encryptionKey?: string;
}

export interface ImageInfo extends MediaAssetInfo {
	width?: number;
	height?: number;
	size?: number;
	groupId?: string;
	groupSequence?: number;
	groupTotal?: number;
	localGroupId?: string;
	isMultipleImageGroup?: boolean;
	isAnchorInMultipleImageGroup?: boolean;
}

export interface MultipleImageMessageMapping {
	localMessageId: number;
	groupId?: string;
	uploadingId?: number;
	chatId?: string;
}

export type DbMultipleImageMessageMapping = MultipleImageMessageMapping;

export interface VideoInfo extends MediaAssetInfo {
	width?: number;
	height?: number;
	size?: number;
	duration?: number;
}

export interface FileInfo extends MediaAssetInfo {
	name: string;
	size: number;
	expireTimestamp?: number;
}

export interface ContactInfo {
	mid?: string;
	displayName: string;
	vCard?: string;
}

export interface DeviceContactInfo {
	vCard: string;
	displayName?: string;
}

export interface MusicInfo {
	title: string;
	artist?: string;
	previewUrl?: string;
	duration?: number; // milliseconds
	trackId?: string; // LINE Music track ID for embed player
	linkUrl?: string; // Full LINE Music URL
}

export interface VoiceInfo extends MediaAssetInfo {
	duration: number; // milliseconds
	fileSize?: number;
}

export interface CallInfo {
	type: 'audio' | 'video' | 'live' | 'photoBooth';
	result: 'normal' | 'canceled' | 'rejected';
	duration?: number;
	phoneNumber?: string;
	rawResult?: string;
	scope?: 'single' | 'group';
	groupState?: 'started' | 'ended' | 'invited';
	groupChatId?: string;
}

export interface LinkPreviewInfo {
	url: string;
	title?: string;
	subText?: string;
}

export interface FlexInfo {
	json?: string;
	imageUrl?: string;
	altText?: string;
	indexableText?: string;
}

export interface RichContentInfo {
	markupJson?: string;
	downloadUrl?: string;
	altText?: string;
	specRevision?: number;
	isPublic?: boolean;
	notificationDisabled?: boolean;
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

export interface MessageRelationInfo {
	serverMessageId?: string;
	serviceCode?: string;
	typeCode?: string;
}

export interface GiftInfo {
	orderId?: string;
	productType?: 'sticker' | 'sticon' | 'theme' | 'unknown';
	productId?: string;
	packageId?: string;
}

export interface PaymentTransferInfo {
	paymentType: 'invitation' | 'request' | 'dutchRequest' | 'transfer' | 'unknown';
	priceText?: string;
	requestId?: string;
	transactionId?: string;
	linkUrl?: string;
	notificationText?: string;
	receivableDaysText?: string;
	representativeUserId?: string;
	requestedUserCount?: number;
	templateId?: number;
	payBalancePriceText?: string;
	lightBalancePriceText?: string;
	isBillSplitting?: boolean;
}

export interface E2EEUndecryptedInfo {
	reason?: 'unreadAtRestoreFromMessageBox' | 'verificationHmacFailure' | 'unknown';
	contentHint?: 'text' | 'image' | 'video' | 'audio' | 'other';
	verificationHmacFailure?: boolean;
	contentInfo?: string;
	copyServerMessageId?: string;
	copyKeyMaterial?: string;
}

export interface Message {
	id: number;
	serverId: string;
	type: MessageType;
	attachmentType?: AttachmentType;
	chatId: string;
	fromId: string; // Member ID
	fromName?: string; // Resolved display name
	avatarUrl?: string; // Resolved profile image URL for the sender
	content: string | null;
	timestamp: number;
	isMe: boolean; // Whether sent by the user
	status: 'sent' | 'read' | 'sending' | 'failed';
	relation?: MessageRelationInfo;

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
			| 'deviceContact'
			| 'music'
			| 'flex'
			| 'richContent'
			| 'post'
			| 'voice'
			| 'link'
			| 'groupEvent'
			| 'gift'
			| 'paymentTransfer'
			| 'e2eeUndecrypted'
			| 'other';
		url?: string;
		metadata?: Record<string, unknown>; // e.g., sticker ID
		call?: CallInfo;
		image?: ImageInfo;
		video?: VideoInfo;
		location?: LocationInfo;
		file?: FileInfo;
		contact?: ContactInfo;
		deviceContact?: DeviceContactInfo;
		music?: MusicInfo;
		voice?: VoiceInfo;
		link?: LinkPreviewInfo;
		flex?: FlexInfo;
		richContent?: RichContentInfo;
		post?: PostInfo;
		groupEvent?: GroupEventInfo;
		gift?: GiftInfo;
		paymentTransfer?: PaymentTransferInfo;
		e2eeUndecrypted?: E2EEUndecryptedInfo;
	};
}

export interface SquareThreadChat {
	threadChatId: string;
	baseChatId: string;
	groupId?: string;
	rootMessageServerId?: string;
	lastMessageServerId?: string;
	lastMessageText?: string;
	lastMessageCreatedTime?: number;
	lastMessageFromId?: string;
	lastMessageMetadata?: string;
	unreadMessageCount?: number;
	readOnlyAt?: number;
	expiredAt?: number;
	membershipState?: number;
	membershipRevision?: number;
	firstSyncToken?: string;
	lastSyncToken?: string;
	readUpServerMessageId?: string;
	inputText?: string;
	inputTextMetadata?: string;
	revision?: number;
}

export interface SquareThreadChatRootMessage {
	rootMessageServerId: string;
	threadChatId: string;
	fromId: string;
	content: string | null;
	timestamp: number;
	contentType: number; // Projected to attachement_type in LINE's thread message query
	contentMetadata?: string;
}

export interface SquareThreadChatRootMessageStatus {
	rootMessageServerId: string;
	baseChatId: string;
	threadChatId: string;
	totalMessageCount: number;
	lastMessageCreatedTime: number;
}

export interface GlobalMessageSearchResult {
	id: number;
	chatId: string;
	content: string;
	timestamp: number;
	fromId: string;
	fromName?: string;
	avatarUrl?: string;
}

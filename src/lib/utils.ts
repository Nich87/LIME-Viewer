export const BUBBLE_BASE_STYLE = 'relative rounded-2xl shadow-sm';

/**
 * Get bubble style by sender (self/recipient)
 * @param isMe -whether this is your message
 * @param options -style options
 * @returns Tailwind class string
 */
export function getBubbleStyle(
	isMe: boolean,
	options: {
		withPadding?: boolean;
		flex?: boolean;
		minWidth?: string;
	} = {}
): string {
	const { withPadding = true, flex = false, minWidth = '' } = options;

	const baseClasses = [BUBBLE_BASE_STYLE];

	if (isMe) {
		baseClasses.push('rounded-tr-none bg-[#B8E986] text-black');
	} else {
		baseClasses.push(
			'rounded-tl-none border border-gray-100 bg-white text-black dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100'
		);
	}

	if (withPadding) baseClasses.push('px-4 py-3');
	if (flex) baseClasses.push('flex items-center');
	if (minWidth) baseClasses.push(minWidth);

	return baseClasses.join(' ');
}

/**
 * Get styles for media bubbles (images/videos)
 */
export function getMediaBubbleStyle(isMe: boolean): string {
	const base = 'relative overflow-hidden rounded-2xl shadow-sm';
	return isMe
		? `${base} rounded-tr-none`
		: `${base} rounded-tl-none border border-gray-100 dark:border-slate-600`;
}

/**
 * Format timestamp to time string
 * @param timestamp -Unix timestamp (milliseconds)
 * @returns Formatted time (HH:MM)
 */
export function formatTime(timestamp: number): string {
	const date = new Date(timestamp);
	return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format file size to human readable format
 * @param bytes -number of bytes
 * @returns formatted size (e.g. "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return bytes + ' B';
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
	return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Format milliseconds to play time format
 * @param ms -milliseconds
 * @returns formatted time (e.g. "3:45")
 */
export function formatDuration(ms: number): string {
	const mins = Math.floor(ms / 60000);
	const secs = Math.floor((ms % 60000) / 1000);
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format call time
 * @param durationMs -Call duration (ms)
 * @returns formatted time (e.g. "02:30")
 */
export function formatCallDuration(durationMs: number): string {
	const mins = Math.floor(durationMs / 60000);
	const secs = Math.floor((durationMs % 60000) / 1000);
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate Google Maps URL
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Google Maps URL
 */
export function getMapUrl(lat?: number, lng?: number): string {
	if (lat && lng) {
		return `https://www.google.com/maps?q=${lat},${lng}`;
	}
	return '#';
}

/**
 * Generate text for group events
 * @param locKey -the key of the event type
 * @param actorName -the name of the user who performed the action
 * @param targetName -target user name
 * @returns event text
 */
export function getGroupEventText(locKey: string, actorName?: string, targetName?: string): string {
	const actor = actorName || '誰か';
	const target = targetName || 'メンバー';

	switch (locKey) {
		case 'A_MC':
			return `${actor}が${target}をグループに追加しました。`;
		case 'C_MI':
			return `${actor}が${target}を招待しました。`;
		case 'C_MA':
			return `${actor}がグループに参加しました。`;
		case 'C_ME':
			return `${actor}がグループを退出しました。`;
		case 'C_MK':
			return `${actor}が${target}をグループから削除しました。`;
		default:
			return `グループイベント: ${locKey}`;
	}
}

/**
 * Generate call result text
 * @param isMe -Did you make the call?
 * @param isVideo -Is it a video call?
 * @param result -call result
 * @param durationStr -formatted call duration
 * @returns call result text
 */
export function getCallResultText(
	isMe: boolean,
	isVideo: boolean,
	result: 'normal' | 'canceled' | 'rejected',
	durationStr: string
): string {
	const callType = isVideo ? 'ビデオ' : '音声';

	if (isMe) {
		if (result === 'normal') return `${callType}通話が終了しました(${durationStr})`;
		if (result === 'canceled') return `キャンセル${isVideo ? '(ビデオ)' : ''}`;
		return '応答なし';
	} else {
		if (result === 'normal') return `${callType}通話が終了しました(${durationStr})`;
		if (result === 'canceled') return `不在着信${isVideo ? '(ビデオ)' : ''}`;
		return `キャンセル${isVideo ? '(ビデオ)' : ''}`;
	}
}

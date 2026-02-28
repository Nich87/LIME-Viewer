import { pushState } from '$app/navigation';
import type { Message } from '$lib/schema';

export interface ImageInfo {
	url: string;
	senderName: string;
	timestamp?: number;
}

export interface ImagePreviewState {
	isOpen: boolean;
	currentUrl: string;
	currentSenderName: string;
	currentTimestamp: number | undefined;
	currentIndex: number;
}

export function createImagePreviewManager(getImageMessages: () => Message[]) {
	let isOpen = $state(false);
	let currentUrl = $state('');
	let currentSenderName = $state('');
	let currentTimestamp = $state<number | undefined>(undefined);
	let currentIndex = $state(0);

	function updateStateFromIndex(index: number) {
		const imageMessages = getImageMessages();
		const msg = imageMessages[index];
		if (msg?.attachment?.url) {
			currentUrl = msg.attachment.url;
			currentSenderName = msg.fromName || '';
			currentTimestamp = msg.timestamp;
			currentIndex = index;
		}
	}

	function open(message: Message) {
		if (message.attachment?.type !== 'image' || !message.attachment?.url) return;

		const imageMessages = getImageMessages();
		const idx = imageMessages.findIndex((m) => m.id === message.id);

		currentUrl = message.attachment.url;
		currentSenderName = message.fromName || '';
		currentTimestamp = message.timestamp;
		currentIndex = idx >= 0 ? idx : 0;

		pushState('', { imagePreview: true, view: 'chat' });
		isOpen = true;
	}

	function close() {
		if (history.state?.imagePreview) history.back();
		else isOpen = false;
	}

	function handlePopState(event: PopStateEvent) {
		if (isOpen && !event.state?.imagePreview) isOpen = false;
	}

	function showPrevious() {
		if (currentIndex > 0) updateStateFromIndex(currentIndex - 1);
	}

	function showNext() {
		const imageMessages = getImageMessages();
		if (currentIndex < imageMessages.length - 1) updateStateFromIndex(currentIndex + 1);
	}

	function selectByIndex(index: number) {
		const imageMessages = getImageMessages();
		if (index >= 0 && index < imageMessages.length) updateStateFromIndex(index);
	}

	function hasPrevious(): boolean {
		return currentIndex > 0;
	}

	function hasNext(): boolean {
		const imageMessages = getImageMessages();
		return currentIndex < imageMessages.length - 1;
	}

	function getTotalCount(): number {
		return getImageMessages().length;
	}

	function getAllImageInfos(): ImageInfo[] {
		return getImageMessages().map((m) => ({
			url: m.attachment?.url || '',
			senderName: m.fromName || '',
			timestamp: m.timestamp
		}));
	}

	return {
		get isOpen() {
			return isOpen;
		},
		get currentUrl() {
			return currentUrl;
		},
		get currentSenderName() {
			return currentSenderName;
		},
		get currentTimestamp() {
			return currentTimestamp;
		},
		get currentIndex() {
			return currentIndex;
		},

		open,
		close,
		handlePopState,
		showPrevious,
		showNext,
		selectByIndex,

		hasPrevious,
		hasNext,
		getTotalCount,
		getAllImageInfos
	};
}

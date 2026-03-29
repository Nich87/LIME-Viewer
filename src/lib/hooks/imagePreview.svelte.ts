import type { Message } from '$lib/schema';
import { obsMediaService } from '$lib/services';
import { safePushState } from '$lib/shallowRouting';

export interface PreviewImageInfo {
	url: string;
	senderName: string;
	timestamp?: number;
}

export interface ImagePreviewState {
	isOpen: boolean;
	currentUrl: string;
	isLoading: boolean;
	loadFailed: boolean;
	currentSenderName: string;
	currentTimestamp: number | undefined;
	currentIndex: number;
}

export function createImagePreviewManager(getImageMessages: () => Message[]) {
	let isOpen = $state(false);
	let currentUrl = $state('');
	let isLoading = $state(false);
	let loadFailed = $state(false);
	let currentSenderName = $state('');
	let currentTimestamp = $state<number | undefined>(undefined);
	let currentIndex = $state(0);

	function setCurrentMessageState(message: Message, index: number) {
		currentUrl = message.attachment?.url || obsMediaService.getCachedImageUrl(message) || '';
		isLoading = !currentUrl && obsMediaService.canFetchImage(message);
		loadFailed = !currentUrl && !isLoading;
		currentSenderName = message.fromName || '';
		currentTimestamp = message.timestamp;
		currentIndex = index;
	}

	function resolveImageUrl(message: Message, index: number) {
		if (!obsMediaService.canFetchImage(message)) return;

		void obsMediaService.resolveImageUrl(message).then((url) => {
			if (currentIndex !== index || getImageMessages()[index]?.id !== message.id) return;

			currentUrl = url || '';
			isLoading = false;
			loadFailed = !url;
		});
	}

	function updateStateFromIndex(index: number) {
		const imageMessages = getImageMessages();
		const msg = imageMessages[index];
		if (!msg || msg.attachment?.type !== 'image') return;

		setCurrentMessageState(msg, index);
		resolveImageUrl(msg, index);
	}

	function open(message: Message) {
		if (message.attachment?.type !== 'image') return;

		const imageMessages = getImageMessages();
		const idx = imageMessages.findIndex((m) => m.id === message.id);
		const resolvedIndex = idx >= 0 ? idx : 0;

		setCurrentMessageState(message, resolvedIndex);
		resolveImageUrl(message, resolvedIndex);

		safePushState('', { imagePreview: true, view: 'chat' });
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

	function getAllImageInfos(): PreviewImageInfo[] {
		return getImageMessages().map((m) => ({
			url: m.attachment?.url || obsMediaService.getCachedImageUrl(m) || '',
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
		get isLoading() {
			return isLoading;
		},
		get loadFailed() {
			return loadFailed;
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

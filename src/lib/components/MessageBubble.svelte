<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Message } from '$lib/schema';
	import { MessageType } from '$lib/schema';
	import { formatTime, getGroupEventText } from '$lib/utils';
	import { LINE_MUSIC_EMBED_URL } from '$lib/constants';

	// Bubble sub-components
	import {
		StickerBubble,
		CallBubble,
		LocationBubble,
		FileBubble,
		ContactBubble,
		MusicBubble,
		FlexBubble,
		PostBubble,
		VoiceBubble,
		LinkBubble,
		ImageBubble,
		TextBubble
	} from './bubbles';

	interface Props {
		message: Message;
		isGroup?: boolean;
		onImageClick?: (message: Message) => void;
	}

	let { message, isGroup = false, onImageClick }: Props = $props();

	// Check if this is a group event message
	const isGroupEvent = $derived(message.attachment?.type === 'groupEvent');

	// Check if this is a pure system message (type=17, no special attachment)
	const isSystemMessage = $derived(
		message.type === MessageType.SYSTEM && !isGroupEvent && !message.attachment?.type
	);

	// LINE Music modal state
	let showMusicModal = $state(false);
	let musicTrackId = $state<string | null>(null);

	function openMusicModal(trackId: string) {
		musicTrackId = trackId;
		showMusicModal = true;
	}

	function closeMusicModal() {
		showMusicModal = false;
		musicTrackId = null;
	}

	// Determine which bubble type to render
	const bubbleType = $derived.by(() => {
		const { type: messageType, attachment } = message;
		const attachmentType = attachment?.type;

		if (messageType === MessageType.STICKER && attachmentType === 'sticker') return 'sticker';
		if (messageType === MessageType.CALL && attachment?.call) return 'call';

		const bubbleMap = {
			location: 'location',
			file: 'file',
			contact: 'contact',
			music: 'music',
			flex: 'flex',
			post: 'post',
			voice: 'voice',
			link: 'link',
			image: 'image'
		} as const;

		return attachmentType && bubbleMap[attachmentType as keyof typeof bubbleMap]
			? bubbleMap[attachmentType as keyof typeof bubbleMap]
			: 'text';
	});
</script>

<!-- Group Event (System Message) - Center aligned -->
{#if isGroupEvent && message.attachment?.groupEvent}
	{@const evt = message.attachment.groupEvent}
	<div class="mb-4 flex w-full justify-center">
		<div class="max-w-[80%] rounded-lg bg-[#2b2b2b]/80 px-4 py-2 text-center">
			<span class="text-sm text-gray-300">
				{getGroupEventText(evt.locKey, evt.actorName, evt.targetName)}
			</span>
		</div>
	</div>
{:else if isSystemMessage}
	<!-- System Message (type=17) - Center aligned, hide if empty -->
	{#if message.content}
		<div class="mb-4 flex w-full justify-center">
			<div class="max-w-[80%] rounded-lg bg-[#2b2b2b]/80 px-4 py-2 text-center">
				<span class="text-sm text-gray-300">
					{message.content}
				</span>
			</div>
		</div>
	{/if}
{:else}
	<!-- Regular Message Layout -->
	<div class="mb-4 flex w-full {message.isMe ? 'justify-end' : 'justify-start'}">
		{#if !message.isMe}
			<!-- Avatar (Left) -->
			<div
				class="mr-2 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-300"
			>
				{#if message.fromId}
					<span class="text-xs text-gray-600">{message.fromId.slice(0, 2)}</span>
				{:else}
					<span class="text-xs">?</span>
				{/if}
			</div>
		{/if}

		<div class="flex max-w-[70%] flex-col {message.isMe ? 'items-end' : 'items-start'}">
			<!-- Sender Name (Group only, for others) -->
			{#if isGroup && !message.isMe}
				<span class="mb-1 ml-1 text-xs text-gray-500">{message.fromName || 'Unknown'}</span>
			{/if}

			<div class="flex items-end {message.isMe ? 'flex-row-reverse' : 'flex-row'}">
				<!-- Bubble / Content -->
				{#if bubbleType === 'sticker'}
					<StickerBubble {message} />
				{:else if bubbleType === 'call'}
					<CallBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'location'}
					<LocationBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'file'}
					<FileBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'contact'}
					<ContactBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'music'}
					<MusicBubble {message} isMe={message.isMe} onOpenModal={openMusicModal} />
				{:else if bubbleType === 'flex'}
					<FlexBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'post'}
					<PostBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'voice'}
					<VoiceBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'link'}
					<LinkBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'image'}
					<ImageBubble {message} isMe={message.isMe} {onImageClick} />
				{:else}
					<TextBubble {message} isMe={message.isMe} />
				{/if}

				<!-- Metadata (Time, Read status) -->
				<div
					class="mx-1 mb-1 flex flex-col text-[10px] text-gray-500 {message.isMe
						? 'items-end'
						: 'items-start'}"
				>
					{#if message.isMe}
						<span class="text-[#333]">既読 {message.status === 'read' ? '' : ''}</span>
					{/if}
					<span>{formatTime(message.timestamp)}</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- LINE Music Modal -->
{#if showMusicModal && musicTrackId}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="LINE Music Player"
	>
		<!-- Backdrop click to close -->
		<button
			type="button"
			class="absolute inset-0 cursor-default border-0 bg-transparent"
			onclick={closeMusicModal}
			aria-label="閉じる"
		></button>

		<!-- Modal Content -->
		<div
			class="relative z-10 w-full max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-3 shadow-2xl sm:max-w-130 sm:p-4"
		>
			<!-- Close button -->
			<button
				type="button"
				class="absolute -top-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-gray-800 text-white shadow-lg transition-colors hover:bg-gray-700 sm:-top-3 sm:-right-3"
				onclick={closeMusicModal}
				aria-label="閉じる"
			>
				<Icon icon="heroicons:x-mark-solid" class="h-5 w-5" />
			</button>

			<!-- LINE Music Embed Player -->
			<iframe
				src="{LINE_MUSIC_EMBED_URL}/{musicTrackId}?isPC=false&autoPlay=false&width=100%25&height=154"
				title="LINE Music Player"
				class="h-60 w-full sm:h-70"
				style="border: none;"
				allow="autoplay"
				allowfullscreen
			></iframe>
		</div>
	</div>
{/if}

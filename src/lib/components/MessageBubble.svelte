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
		RichContentBubble,
		PostBubble,
		VoiceBubble,
		LinkBubble,
		ImageBubble,
		VideoBubble,
		PaymentTransferBubble,
		GiftBubble,
		UndecryptedBubble,
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

	// Check if this is a pure system message (e.g. type=17/30, no special attachment)
	const isSystemMessage = $derived(
		(message.type === MessageType.SYSTEM ||
			message.type === MessageType.CHAT_ROOM_BGM_UPDATED ||
			message.type === MessageType.CHAT_ROOM_BGM_DELETED) &&
			!isGroupEvent &&
			!message.attachment?.type
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
		if ((messageType === MessageType.CALL || attachmentType === 'call') && attachment?.call) {
			return 'call';
		}

		const bubbleMap = {
			location: 'location',
			file: 'file',
			contact: 'contact',
			deviceContact: 'contact',
			music: 'music',
			flex: 'flex',
			richContent: 'richContent',
			post: 'post',
			voice: 'voice',
			link: 'link',
			image: 'image',
			video: 'video',
			paymentTransfer: 'paymentTransfer',
			gift: 'gift',
			e2eeUndecrypted: 'e2eeUndecrypted'
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
		<div class="line-system-chip max-w-[80%] px-4 py-2 text-center shadow-sm">
			<span class="text-sm text-white/95">
				{getGroupEventText(evt.locKey, evt.actorName, evt.targetName)}
			</span>
		</div>
	</div>
{:else if isSystemMessage}
	<!-- System Message (type=17) - Center aligned, hide if empty -->
	{#if message.content}
		<div class="mb-4 flex w-full justify-center">
			<div class="line-system-chip max-w-[80%] px-4 py-2 text-center shadow-sm">
				<span class="text-sm text-white/95">
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
				class="mr-2 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dde2ea]"
			>
				{#if message.fromId}
					<span class="text-[11px] font-medium text-[--line-text-subtle]">
						{message.fromId.slice(0, 2)}
					</span>
				{:else}
					<span class="text-[11px] text-[--line-text-subtle]">?</span>
				{/if}
			</div>
		{/if}

		<div class="flex max-w-[70%] flex-col {message.isMe ? 'items-end' : 'items-start'}">
			<!-- Sender Name (Group only, for others) -->
			{#if isGroup && !message.isMe}
				<span class="mb-1 ml-1 text-[11px] font-medium text-[--line-text-subtle]">
					{message.fromName || 'Unknown'}
				</span>
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
				{:else if bubbleType === 'richContent'}
					<RichContentBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'post'}
					<PostBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'voice'}
					<VoiceBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'link'}
					<LinkBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'image'}
					<ImageBubble {message} isMe={message.isMe} {onImageClick} />
				{:else if bubbleType === 'video'}
					<VideoBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'paymentTransfer'}
					<PaymentTransferBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'gift'}
					<GiftBubble {message} isMe={message.isMe} />
				{:else if bubbleType === 'e2eeUndecrypted'}
					<UndecryptedBubble {message} isMe={message.isMe} />
				{:else}
					<TextBubble {message} isMe={message.isMe} />
				{/if}

				<!-- Metadata (Time, Read status) -->
				<div
					class="mx-1 mb-1 flex min-w-[2.4rem] flex-col text-[10px] leading-3 text-[--line-text-soft] {message.isMe
						? 'items-end'
						: 'items-start'}"
				>
					{#if message.isMe}
						<span class="font-medium text-[--line-text-subtle]">既読</span>
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
			class="relative z-10 w-full max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-3 shadow-2xl sm:max-w-lg sm:p-4"
		>
			<!-- Close button -->
			<button
				type="button"
				class="absolute -top-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-[--line-text] text-white shadow-lg transition-colors hover:bg-[--line-text-subtle] sm:-top-3 sm:-right-3"
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

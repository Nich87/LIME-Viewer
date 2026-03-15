<script lang="ts">
	import Icon from '@iconify/svelte';
	import { formatDuration, BUBBLE_BASE_STYLE } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
		onOpenModal: (trackId: string) => void;
	}

	let { message, isMe, onOpenModal }: Props = $props();

	const music = $derived(message.attachment?.music);

	const bubbleClass = $derived(
		`${BUBBLE_BASE_STYLE} cursor-pointer overflow-hidden border-0 p-0 text-left transition-transform hover:scale-[1.02] ` +
			(isMe ? 'bg-[var(--line-bubble-send)]' : 'bg-[var(--line-bubble-receive)]')
	);
</script>

{#if music}
	<button
		type="button"
		class={bubbleClass}
		onclick={() => music.trackId && onOpenModal(music.trackId)}
		disabled={!music.trackId}
	>
		<div class="flex items-center p-3">
			<!-- Album Art / Music Icon -->
			<div
				class="mr-3 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-linear-to-br from-(--line-brand-soft) to-(--line-brand)"
			>
				{#if music.previewUrl}
					<img
						src={music.previewUrl}
						alt="Album art"
						class="h-full w-full object-cover"
						loading="lazy"
					/>
				{:else}
					<Icon icon="heroicons:musical-note-solid" class="h-8 w-8 text-white" />
				{/if}
			</div>
			<div class="flex flex-1 flex-col overflow-hidden">
				<span class="truncate text-sm font-medium text-[--line-text]">{music.title}</span>
				{#if music.artist}
					<span class="truncate text-xs text-[--line-text-subtle]">{music.artist}</span>
				{/if}
				{#if music.duration}
					<span class="text-xs text-[--line-text-soft]">{formatDuration(music.duration)}</span>
				{/if}
			</div>
		</div>
		<div class="flex items-center justify-center bg-[--line-brand] py-2">
			<Icon icon="heroicons:musical-note-solid" class="mr-1 h-4 w-4 text-white" />
			<span class="text-xs font-medium text-white">LINE MUSIC</span>
		</div>
	</button>
{/if}

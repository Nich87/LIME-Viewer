<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getMediaBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const videoUrl = $derived(message.attachment?.url);
	const bubbleClass = $derived(getMediaBubbleStyle(isMe));
</script>

<div class={bubbleClass}>
	{#if videoUrl}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			src={videoUrl}
			controls
			preload="metadata"
			playsinline
			class="max-h-80 w-auto max-w-full object-contain"
		>
			お使いのブラウザは動画再生に対応していません。
		</video>
	{:else}
		<div class="flex h-40 w-56 items-center justify-center bg-[--line-surface-alt]">
			<Icon icon="heroicons:play-circle-solid" class="h-12 w-12 text-[--line-text-faint]" />
		</div>
		<div class="px-3 py-1 text-center text-xs text-[--line-text-soft]">動画 (バックアップなし)</div>
	{/if}
</div>

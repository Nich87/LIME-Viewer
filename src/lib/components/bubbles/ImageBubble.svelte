<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getMediaBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
		onImageClick?: (message: Message) => void;
	}

	let { message, isMe, onImageClick }: Props = $props();

	const imageUrl = $derived(message.attachment?.url);
	const bubbleClass = $derived(getMediaBubbleStyle(isMe));
</script>

<div class={bubbleClass}>
	{#if imageUrl}
		<!-- Actual image from backup -->
		<button
			type="button"
			class="block cursor-pointer border-0 bg-transparent p-0"
			onclick={() => {
				if (onImageClick) {
					onImageClick(message);
				}
			}}
		>
			<img
				src={imageUrl}
				alt="画像"
				class="max-h-80 w-auto max-w-full object-contain"
				loading="lazy"
			/>
		</button>
	{:else}
		<!-- Placeholder when no URL available -->
		<div class="flex h-40 w-56 items-center justify-center bg-gray-100">
			<Icon icon="heroicons:photo-solid" class="h-12 w-12 text-gray-300" />
		</div>
		<div
			class="px-3 py-1 text-center text-xs text-gray-400 dark:text-slate-400 {isMe
				? 'bg-[#B8E986]'
				: 'bg-white dark:bg-slate-700'}"
		>
			画像 (バックアップなし)
		</div>
	{/if}
</div>

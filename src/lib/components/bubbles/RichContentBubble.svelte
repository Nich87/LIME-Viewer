<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getMediaBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const rich = $derived(message.attachment?.richContent);
	const bubbleClass = $derived(getMediaBubbleStyle(isMe));
</script>

{#if rich}
	<div class={bubbleClass}>
		{#if rich.downloadUrl}
			<div class="max-h-80 w-56 overflow-hidden bg-gray-100">
				<img
					src={rich.downloadUrl}
					alt={rich.altText || 'Rich content'}
					class="h-full w-full object-cover"
					loading="lazy"
				/>
			</div>
		{:else}
			<div
				class="flex h-24 w-56 items-center justify-center bg-linear-to-br from-[--line-surface-alt] to-[#e9f2ff]"
			>
				<Icon icon="heroicons:squares-2x2-solid" class="h-10 w-10 text-[--line-brand]" />
			</div>
		{/if}
		<div class="px-3 py-2">
			<span class="block text-xs text-[--line-text-soft]">リッチメッセージ</span>
			{#if rich.altText}
				<span class="mt-1 block text-sm text-[--line-text-subtle]">{rich.altText}</span>
			{/if}
		</div>
	</div>
{/if}

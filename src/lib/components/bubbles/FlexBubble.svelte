<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getMediaBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const flex = $derived(message.attachment?.flex);
	const bubbleClass = $derived(`${getMediaBubbleStyle(isMe)}`);
</script>

{#if flex}
	<div class={bubbleClass}>
		{#if flex.imageUrl}
			<div class="h-40 w-56 bg-gray-100">
				<img
					src={flex.imageUrl}
					alt="Flex content"
					class="h-full w-full object-cover"
					loading="lazy"
				/>
			</div>
		{:else}
			<div
				class="flex h-24 w-56 items-center justify-center bg-linear-to-br from-[--line-surface-alt] to-[#edf7ef]"
			>
				<Icon icon="heroicons:sparkles-solid" class="h-10 w-10 text-[--line-brand]" />
			</div>
		{/if}
		<div class="px-3 py-2">
			<span class="text-xs text-[--line-text-soft]">LINE ギフト / Flex メッセージ</span>
		</div>
	</div>
{/if}

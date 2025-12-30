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
	const bubbleClass = $derived(
		`${getMediaBubbleStyle(isMe)} ${isMe ? 'bg-[#B8E986]' : 'bg-white'}`
	);
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
				class="flex h-24 w-56 items-center justify-center bg-linear-to-br from-pink-100 to-purple-100"
			>
				<Icon icon="heroicons:sparkles-solid" class="h-10 w-10 text-pink-400" />
			</div>
		{/if}
		<div class="px-3 py-2 {isMe ? 'bg-[#B8E986]' : 'bg-white'}">
			<span class="text-xs text-gray-500">LINE ギフト / Flex メッセージ</span>
		</div>
	</div>
{/if}

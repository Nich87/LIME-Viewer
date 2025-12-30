<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getMediaBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const link = $derived(message.attachment?.link);

	const bubbleClass = $derived(
		`${getMediaBubbleStyle(isMe)} ${isMe ? 'bg-[#B8E986]' : 'bg-white'}`
	);
</script>

{#if link}
	<div class={bubbleClass}>
		<div class="px-4 py-2 text-sm">
			<p class="wrap-break-word whitespace-pre-wrap">{message.content}</p>
		</div>
		<a
			href={link.url}
			target="_blank"
			rel="noopener external"
			class="block border-t {isMe ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-gray-50'}"
		>
			<div class="flex items-center px-3 py-2">
				<div class="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-blue-100">
					<Icon icon="heroicons:link-solid" class="h-4 w-4 text-blue-600" />
				</div>
				<span class="truncate text-xs text-blue-600">{link.url}</span>
			</div>
		</a>
	</div>
{/if}

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
	const linkTitle = $derived(link?.title || message.content || link?.url || '');
	const linkSubText = $derived(link?.subText);

	const bubbleClass = $derived(`${getMediaBubbleStyle(isMe)}`);
</script>

{#if link}
	<div class={bubbleClass}>
		<div class="px-4 py-2 text-sm">
			<p class="wrap-break-word whitespace-pre-wrap">{linkTitle}</p>
			{#if linkSubText}
				<p class="mt-1 text-xs text-[--line-text-soft]">{linkSubText}</p>
			{/if}
		</div>
		<a
			href={link.url}
			target="_blank"
			rel="noopener external"
			class="block border-t {isMe
				? 'border-[--line-bubble-send-divider] bg-white/35'
				: 'border-[--line-border] bg-[--line-surface-alt]'}"
		>
			<div class="flex items-center px-3 py-2">
				<div class="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white">
					<Icon icon="heroicons:link-solid" class="h-4 w-4 text-[--line-brand]" />
				</div>
				<span class="truncate text-xs text-[--line-brand]">{link.url}</span>
			</div>
		</a>
	</div>
{/if}

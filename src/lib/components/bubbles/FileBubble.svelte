<script lang="ts">
	import Icon from '@iconify/svelte';
	import { formatFileSize, getBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const file = $derived(message.attachment?.file);
	const bubbleClass = $derived(getBubbleStyle(isMe, { flex: true, minWidth: 'min-w-55' }));
</script>

{#if file}
	<div class={bubbleClass}>
		<!-- File Icon -->
		<div
			class="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[--line-surface-alt]"
		>
			<Icon icon="heroicons:document-text-solid" class="h-6 w-6 text-[--line-brand]" />
		</div>
		<div class="flex flex-1 flex-col overflow-hidden">
			<span class="truncate text-sm font-medium">{file.name}</span>
			<span class="text-xs text-[--line-text-soft]">{formatFileSize(file.size)}</span>
		</div>
	</div>
{/if}

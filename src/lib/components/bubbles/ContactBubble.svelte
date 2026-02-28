<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const contact = $derived(message.attachment?.contact);
	const bubbleClass = $derived(getBubbleStyle(isMe, { flex: true, minWidth: 'min-w-50' }));
</script>

{#if contact}
	<div class={bubbleClass}>
		<!-- Avatar -->
		<div
			class="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500 text-white"
		>
			<Icon icon="heroicons:user-solid" class="h-6 w-6" />
		</div>
		<div class="flex flex-col">
			<span class="text-sm font-medium">連絡先の共有</span>
			<span class="text-sm text-gray-700 dark:text-slate-200">{contact.displayName}</span>
		</div>
	</div>
{/if}

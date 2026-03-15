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
	const deviceContact = $derived(message.attachment?.deviceContact);
	const bubbleClass = $derived(getBubbleStyle(isMe, { flex: true, minWidth: 'min-w-50' }));
	const displayName = $derived(contact?.displayName || deviceContact?.displayName || 'Unknown');
	const contactLabel = $derived(deviceContact ? '端末の連絡先' : '連絡先の共有');
</script>

{#if contact || deviceContact}
	<div class={bubbleClass}>
		<!-- Avatar -->
		<div
			class="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[--line-brand] text-white"
		>
			<Icon icon="heroicons:user-solid" class="h-6 w-6" />
		</div>
		<div class="flex flex-col">
			<span class="text-sm font-medium">{contactLabel}</span>
			<span class="text-sm text-[--line-text-subtle]">{displayName}</span>
		</div>
	</div>
{/if}

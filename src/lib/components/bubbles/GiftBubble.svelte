<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const gift = $derived(message.attachment?.gift);
	const detail = $derived.by(() => {
		if (gift?.productType === 'sticker') return 'スタンプギフト';
		if (gift?.productType === 'sticon') return '絵文字ギフト';
		if (gift?.productType === 'theme') return '着せかえギフト';
		return gift?.productId || message.content || 'LINEギフト';
	});
	const bubbleClass = $derived(getBubbleStyle(isMe, { flex: true, minWidth: 'min-w-50' }));
</script>

{#if gift}
	<div class={bubbleClass}>
		<div
			class="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff6b57] text-white"
		>
			<Icon icon="heroicons:gift-solid" class="h-6 w-6" />
		</div>
		<div class="flex min-w-0 flex-col">
			<span class="text-sm font-medium">LINEギフト</span>
			<span class="text-sm wrap-break-word text-[--line-text-subtle]">{detail}</span>
		</div>
	</div>
{/if}

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const payment = $derived(message.attachment?.paymentTransfer);
	const paymentLabel = $derived.by(() => {
		switch (payment?.paymentType) {
			case 'invitation':
				return '送金招待';
			case 'request':
				return '送金依頼';
			case 'dutchRequest':
				return '割り勘リクエスト';
			case 'transfer':
				return '送金';
			default:
				return '送金・送金依頼';
		}
	});
	const primaryText = $derived(
		payment?.priceText || payment?.notificationText || message.content || '送金・送金依頼'
	);
	const secondaryText = $derived(
		payment?.payBalancePriceText || payment?.lightBalancePriceText || payment?.linkUrl
	);
	const bubbleClass = $derived(getBubbleStyle(isMe, { flex: true, minWidth: 'min-w-52' }));
</script>

{#if payment}
	<div class={bubbleClass}>
		<div
			class="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[--line-brand] text-white"
		>
			<Icon icon="heroicons:banknotes-solid" class="h-6 w-6" />
		</div>
		<div class="flex min-w-0 flex-col">
			<span class="text-sm font-medium">{paymentLabel}</span>
			<span class="text-sm wrap-break-word text-[--line-text-subtle]">{primaryText}</span>
			{#if secondaryText}
				<span class="truncate text-xs text-[--line-text-soft]">{secondaryText}</span>
			{/if}
		</div>
	</div>
{/if}

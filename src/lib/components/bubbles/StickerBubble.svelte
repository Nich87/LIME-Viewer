<script lang="ts">
	import { LINE_STICKER_CDN } from '$lib/constants';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
	}

	let { message }: Props = $props();

	const stickerId = $derived(message.attachment?.metadata?.stickerId);
</script>

{#if stickerId}
	<div class="p-2">
		<img
			src={`${LINE_STICKER_CDN}/${stickerId}/android/sticker.png`}
			alt="Sticker"
			class="h-auto w-32 object-contain"
			loading="lazy"
			onerror={() => {
				console.error('Failed to load sticker:', stickerId);
			}}
		/>
	</div>
{:else}
	<div
		class="flex h-24 w-24 items-center justify-center rounded-2xl border border-[--line-border] bg-[--line-surface-alt]"
	>
		<span class="text-center text-xs text-[--line-text-faint]">Sticker<br />(No ID)</span>
	</div>
{/if}

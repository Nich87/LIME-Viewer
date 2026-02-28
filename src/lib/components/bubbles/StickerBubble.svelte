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
		class="flex h-24 w-24 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 dark:border-slate-600 dark:bg-slate-700"
	>
		<span class="text-xs text-gray-400 dark:text-slate-400">Sticker<br />(No ID)</span>
	</div>
{/if}

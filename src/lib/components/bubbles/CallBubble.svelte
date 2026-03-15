<script lang="ts">
	import Icon from '@iconify/svelte';
	import { formatCallDuration, getCallResultText, getBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const call = $derived(message.attachment?.call);
	const isVideo = $derived(call?.type === 'video');
	const durationStr = $derived(formatCallDuration(call?.duration || 0));
	const callText = $derived(call ? getCallResultText(isMe, isVideo, call.result, durationStr) : '');

	const bubbleClass = $derived(getBubbleStyle(isMe, { flex: true, minWidth: 'min-w-50' }));
</script>

{#if call}
	<div class={bubbleClass}>
		<!-- Icon -->
		<div class="mr-3 shrink-0 {isMe ? 'text-[--line-text]' : 'text-[--line-brand]'}">
			{#if isVideo}
				<Icon icon="heroicons:video-camera-solid" class="h-6 w-6" />
			{:else}
				<Icon icon="heroicons:phone-solid" class="h-6 w-6" />
			{/if}
		</div>

		<div class="flex flex-col">
			<span class="text-sm font-bold tracking-wide">{callText}</span>
		</div>
	</div>
{/if}

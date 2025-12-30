<script lang="ts">
	import Icon from '@iconify/svelte';
	import { formatCallDuration, getCallResultText, BUBBLE_BASE_STYLE } from '$lib/utils';
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

	const bubbleClass = $derived(
		`${BUBBLE_BASE_STYLE} flex min-w-50 items-center px-4 py-3 ` +
			(isMe
				? 'rounded-tr-none bg-[#B8E986] text-black'
				: 'rounded-tl-none border border-gray-700 bg-[#2b2b2b] text-white')
	);
</script>

{#if call}
	<div class={bubbleClass}>
		<!-- Icon -->
		<div class="mr-3 shrink-0 {isMe ? 'text-black' : 'text-white'}">
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

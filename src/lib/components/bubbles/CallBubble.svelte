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
	const isVideo = $derived(
		call?.type === 'video' || call?.type === 'live' || call?.type === 'photoBooth'
	);
	const durationStr = $derived(formatCallDuration(call?.duration || 0));
	const callText = $derived.by(() => {
		if (!call) return '';
		if (call.scope !== 'group') return getCallResultText(isMe, isVideo, call.result, durationStr);

		const label =
			call.type === 'live'
				? 'グループライブ'
				: call.type === 'photoBooth'
					? 'グループフォトブース'
					: isVideo
						? 'グループビデオ通話'
						: 'グループ音声通話';

		if (call.groupState === 'invited') return `${label}への招待`;
		if (call.groupState === 'started') return `${label}が開始されました`;
		if (call.groupState === 'ended') {
			return call.duration ? `${label}が終了しました(${durationStr})` : `${label}が終了しました`;
		}
		if (call.result === 'canceled') return `${label}に参加しませんでした`;
		if (call.result === 'rejected') return `${label}に応答がありませんでした`;
		return call.duration ? `${label}が終了しました(${durationStr})` : `${label}`;
	});

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

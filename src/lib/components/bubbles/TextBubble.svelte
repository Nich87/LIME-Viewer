<script lang="ts">
	import type { Message } from '$lib/schema';
	import { bubbleAssetService } from '$lib/services';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();
	const bubbleUrl = $derived(bubbleAssetService.getBubbleUrl(isMe ? 'send' : 'receive'));

	const bubbleClass = $derived(
		`line-text-bubble min-w-0 max-w-full ${isMe ? 'line-text-bubble--send' : 'line-text-bubble--receive'} line-text-bubble--asset`
	);
	const bubbleStyle = $derived(bubbleUrl ? `border-image-source: url("${bubbleUrl}")` : undefined);
</script>

<div class={bubbleClass} style={bubbleStyle}>
	<div class="line-text-bubble__inner min-w-0 text-sm leading-[1.45]">
		<p class="[overflow-wrap:anywhere] wrap-break-word [word-break:break-word] whitespace-pre-wrap">
			{message.content || 'Contents unsupported'}
		</p>
	</div>
</div>

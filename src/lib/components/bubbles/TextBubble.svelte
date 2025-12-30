<script lang="ts">
	import type { Message } from '$lib/schema';
	import { getBubbleStyle } from '$lib/utils';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const bubbleClass = $derived(`${getBubbleStyle(isMe, { withPadding: false })} px-4 py-2 text-sm`);
</script>

<div class={bubbleClass}>
	<p class="wrap-break-word whitespace-pre-wrap">
		{message.content || 'Contents unsupported'}
	</p>
</div>

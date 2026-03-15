<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const encrypted = $derived(message.attachment?.e2eeUndecrypted);
	const detail = $derived.by(() => {
		if (encrypted?.reason === 'verificationHmacFailure') {
			return '検証に失敗したため復号できません';
		}
		if (encrypted?.reason === 'unreadAtRestoreFromMessageBox') {
			return '復元元のメッセージボックスでは未読のため復号できません';
		}
		return 'このバックアップでは復号できません';
	});
	const bubbleClass = $derived(getBubbleStyle(isMe, { flex: true, minWidth: 'min-w-50' }));
</script>

{#if encrypted}
	<div class={bubbleClass}>
		<div
			class="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[--line-text-subtle] text-white"
		>
			<Icon icon="heroicons:lock-closed-solid" class="h-6 w-6" />
		</div>
		<div class="flex flex-col">
			<span class="text-sm font-medium">暗号化メッセージ</span>
			<span class="text-sm text-[--line-text-subtle]">{detail}</span>
		</div>
	</div>
{/if}

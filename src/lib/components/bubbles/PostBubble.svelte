<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const post = $derived(message.attachment?.post);
	const isAlbum = $derived(post?.type === 'album');
	const bubbleClass = $derived(getBubbleStyle(isMe, { flex: true, minWidth: 'min-w-55' }));
</script>

{#if post}
	<div class={bubbleClass}>
		<!-- Icon based on type -->
		<div
			class="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] {isAlbum
				? 'bg-[#e8f2ff]'
				: 'bg-[#fff6d8]'}"
		>
			{#if isAlbum}
				<Icon icon="heroicons:photo-solid" class="h-6 w-6 text-[#4387bc]" />
			{:else}
				<Icon icon="heroicons:newspaper-solid" class="h-6 w-6 text-[#c08c16]" />
			{/if}
		</div>
		<div class="flex flex-col overflow-hidden">
			<span class="text-sm font-medium">
				{isAlbum ? 'アルバム' : 'ノート'}に投稿しました
			</span>
			{#if post.albumName}
				<span class="truncate text-xs text-[--line-text-subtle]">{post.albumName}</span>
			{/if}
			{#if post.text}
				<span class="truncate text-xs text-[--line-text-subtle]">{post.text}</span>
			{/if}
		</div>
	</div>
{/if}

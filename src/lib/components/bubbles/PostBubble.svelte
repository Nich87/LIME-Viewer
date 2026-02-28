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
			class="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg {isAlbum
				? 'bg-blue-100'
				: 'bg-yellow-100'}"
		>
			{#if isAlbum}
				<Icon icon="heroicons:photo-solid" class="h-6 w-6 text-blue-600" />
			{:else}
				<Icon icon="heroicons:newspaper-solid" class="h-6 w-6 text-yellow-600" />
			{/if}
		</div>
		<div class="flex flex-col overflow-hidden">
			<span class="text-sm font-medium">
				{isAlbum ? 'アルバム' : 'ノート'}に投稿しました
			</span>
			{#if post.albumName}
				<span class="truncate text-xs text-gray-600 dark:text-slate-300">{post.albumName}</span>
			{/if}
			{#if post.text}
				<span class="truncate text-xs text-gray-600 dark:text-slate-300">{post.text}</span>
			{/if}
		</div>
	</div>
{/if}

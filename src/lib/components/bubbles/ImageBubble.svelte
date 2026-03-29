<script lang="ts">
	import Icon from '@iconify/svelte';
	import { obsMediaService } from '$lib/services';
	import { observeOnce } from '$lib/services/viewportObserver';
	import { getMediaBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
		onImageClick?: (message: Message) => void;
	}

	let { message, isMe, onImageClick }: Props = $props();

	const bubbleClass = $derived(getMediaBubbleStyle(isMe));

	// Fast path: image already has a backup URL — no effects or observers needed
	const backupUrl = $derived(message.attachment?.url);

	// OBS resolution state (only used when no backup URL)
	let obsUrl = $state<string | undefined>();
	let isLoading = $state(false);
	let loadFailed = $state(false);
	let bubbleElement = $state<HTMLDivElement | undefined>();

	// Final URL: prefer backup, then OBS resolved
	const imageUrl = $derived(backupUrl || obsUrl);

	// Single effect that handles OBS resolution (skipped entirely for backup images)
	$effect(() => {
		// Fast path: backup URL exists, skip all OBS logic
		if (backupUrl) {
			obsUrl = undefined;
			isLoading = false;
			loadFailed = false;
			return;
		}

		const currentMessage = message;
		const element = bubbleElement;

		// Check OBS cache synchronously
		const cached = obsMediaService.getCachedImageUrl(currentMessage);
		if (cached) {
			obsUrl = cached;
			isLoading = false;
			loadFailed = false;
			return;
		}

		// No element yet or can't resolve via OBS → show placeholder
		if (!element || !obsMediaService.canFetchImage(currentMessage)) {
			obsUrl = undefined;
			isLoading = false;
			loadFailed = Boolean(currentMessage.attachment?.image?.objectId);
			return;
		}

		// Defer OBS fetch until element enters viewport (+300px margin)
		let cancelled = false;
		obsUrl = undefined;
		isLoading = false;
		loadFailed = false;

		const unobserve = observeOnce(element, () => {
			if (cancelled) return;
			isLoading = true;

			void obsMediaService.resolveImageUrl(currentMessage).then((url) => {
				if (cancelled) return;
				obsUrl = url;
				isLoading = false;
				loadFailed = !url;
			});
		});

		return () => {
			cancelled = true;
			unobserve();
			obsMediaService.cancelLoad(currentMessage);
		};
	});
</script>

<div bind:this={bubbleElement} class={bubbleClass}>
	{#if imageUrl}
		<!-- Actual image from backup -->
		<button
			type="button"
			class="block cursor-pointer border-0 bg-transparent p-0"
			onclick={() => {
				if (onImageClick) {
					onImageClick(message);
				}
			}}
		>
			<img
				src={imageUrl}
				alt="画像"
				class="max-h-80 w-auto max-w-full object-contain"
				loading="lazy"
			/>
		</button>
	{:else}
		<!-- Placeholder when no URL available -->
		<div class="flex h-40 w-56 items-center justify-center bg-[--line-surface-alt]">
			<Icon
				icon={isLoading ? 'mdi:loading' : 'heroicons:photo-solid'}
				class={`h-12 w-12 text-[--line-text-faint] ${isLoading ? 'animate-spin' : ''}`}
			/>
		</div>
		<div class="px-3 py-1 text-center text-xs text-[--line-text-soft]">
			{isLoading
				? '画像を取得中...'
				: loadFailed
					? '画像を取得できません'
					: '画像 (バックアップなし)'}
		</div>
	{/if}
</div>

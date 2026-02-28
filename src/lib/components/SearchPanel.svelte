<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Icon from '@iconify/svelte';
	import type { Message } from '$lib/schema';

	interface Props {
		messages: Message[];
		onSearchResult: (messageId: number | null) => void;
		onClose: () => void;
		onOpenCalendar: () => void;
	}

	let { messages, onSearchResult, onClose, onOpenCalendar }: Props = $props();

	// Search state
	let searchQuery = $state('');
	let searchResults: Message[] = $state([]);
	let selectedResultId: number | null = $state(null);
	let isSearching = $state(false);
	let activeSearchToken = 0;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Visual viewport offset for mobile keyboard
	let viewportOffset = $state(0);
	let searchBarRef: HTMLElement | undefined = $state();

	// Handle visual viewport changes (keyboard open/close)
	function handleViewportResize() {
		if (window.visualViewport) viewportOffset = window.visualViewport.offsetTop;
	}

	onMount(() => {
		// Focus the input when search opens
		const input = searchBarRef?.querySelector('input');
		if (input) input.focus();

		// Listen to visual viewport changes for mobile keyboard handling
		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', handleViewportResize);
			window.visualViewport.addEventListener('scroll', handleViewportResize);
		}
	});

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
		if (window.visualViewport) {
			window.visualViewport.removeEventListener('resize', handleViewportResize);
			window.visualViewport.removeEventListener('scroll', handleViewportResize);
		}
	});

	// Debounced search - waits 300ms after user stops typing
	function debouncedSearch() {
		if (debounceTimer) clearTimeout(debounceTimer);

		const query = searchQuery.trim();
		if (!query) {
			activeSearchToken += 1;
			searchResults = [];
			selectedResultId = null;
			isSearching = false;
			onSearchResult(null);
			return;
		}

		isSearching = true;
		const searchToken = ++activeSearchToken;
		debounceTimer = setTimeout(() => {
			performSearch(query, searchToken);
		}, 300);
	}

	// Search functionality with chunked processing to prevent UI freeze
	function performSearch(query: string, searchToken: number) {
		const lowerQuery = query.toLowerCase();
		const results: Message[] = [];
		const chunkSize = 1000;
		let index = 0;

		function processChunk() {
			if (searchToken !== activeSearchToken) return;

			const end = Math.min(index + chunkSize, messages.length);

			for (let i = index; i < end; i++) {
				const msg = messages[i];
				if (msg.content && msg.content.toLowerCase().includes(lowerQuery)) {
					results.push(msg);
				}
			}

			index = end;

			if (index < messages.length) {
				// Continue with next chunk in next frame
				requestAnimationFrame(processChunk);
			} else {
				if (searchToken !== activeSearchToken) return;

				// Search complete
				searchResults = results.sort((a, b) => b.timestamp - a.timestamp);
				selectedResultId = null;
				isSearching = false;
				onSearchResult(null);
			}
		}

		processChunk();
	}

	function formatResultDate(timestamp: number): string {
		if (!timestamp) return '';
		const date = new Date(timestamp);
		const now = new Date();
		const sameYear = date.getFullYear() === now.getFullYear();

		if (sameYear) return `${date.getMonth() + 1}/${date.getDate()}`;
		return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
	}

	function getSenderName(message: Message): string {
		if (message.isMe) return '自分';
		return message.fromName || message.fromId || '不明';
	}

	function getAvatarText(message: Message): string {
		return getSenderName(message).slice(0, 1).toUpperCase();
	}

	function escapeRegExp(value: string): string {
		return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function getPreviewText(message: Message): string {
		return message.content?.trim() || '';
	}

	function buildPreviewParts(
		message: Message,
		query: string
	): Array<{ text: string; matched: boolean }> {
		const previewText = getPreviewText(message);
		if (!previewText) return [{ text: '(本文なし)', matched: false }];

		const trimmedQuery = query.trim();
		if (!trimmedQuery) return [{ text: previewText.slice(0, 60), matched: false }];

		const lowerText = previewText.toLowerCase();
		const lowerQuery = trimmedQuery.toLowerCase();
		const matchIndex = lowerText.indexOf(lowerQuery);

		const windowStart = matchIndex >= 0 ? Math.max(matchIndex - 12, 0) : 0;
		const windowEnd =
			matchIndex >= 0
				? Math.min(matchIndex + trimmedQuery.length + 24, previewText.length)
				: Math.min(previewText.length, 60);

		const clippedText = previewText.slice(windowStart, windowEnd);
		const parts: Array<{ text: string; matched: boolean }> = [];
		if (windowStart > 0) parts.push({ text: '…', matched: false });

		const escapedQuery = escapeRegExp(trimmedQuery);
		const regex = new RegExp(`(${escapedQuery})`, 'gi');
		const matchedParts = clippedText.split(regex).filter((part) => part.length > 0);
		for (const part of matchedParts) {
			parts.push({ text: part, matched: part.toLowerCase() === lowerQuery });
		}

		if (windowEnd < previewText.length) parts.push({ text: '…', matched: false });
		return parts;
	}

	function selectSearchResult(messageId: number) {
		selectedResultId = messageId;
		onSearchResult(messageId);
	}

	function clearSearch() {
		if (debounceTimer) clearTimeout(debounceTimer);
		activeSearchToken += 1;
		searchQuery = '';
		searchResults = [];
		selectedResultId = null;
		isSearching = false;
		onSearchResult(null);
	}

	$effect(() => {
		debouncedSearch();
	});
</script>

<!-- Search Bar Overlay - Fixed position with visual viewport adjustment -->
<div
	bind:this={searchBarRef}
	class="fixed right-0 left-0 z-120 flex h-14 items-center gap-2 bg-[#7CC5E6] px-3 shadow-sm"
	style="top: {viewportOffset}px;"
>
	<button
		onclick={onClose}
		class="rounded-full p-1.5 text-white transition-colors hover:bg-white/20"
	>
		<Icon icon="mdi:chevron-left" class="h-6 w-6" />
	</button>

	<div class="relative flex-1">
		<input
			type="text"
			placeholder="検索"
			bind:value={searchQuery}
			class="w-full rounded-lg bg-white/90 py-2 pr-9 pl-9 text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none"
		/>
		<Icon
			icon="mdi:magnify"
			class="absolute top-1/2 left-2.5 h-5 w-5 -translate-y-1/2 text-gray-400"
		/>
		{#if searchQuery}
			<button onclick={clearSearch} class="absolute top-1/2 right-2.5 -translate-y-1/2">
				<Icon icon="mdi:close-circle" class="h-5 w-5 text-gray-400 hover:text-gray-600" />
			</button>
		{/if}
	</div>

	<button
		onclick={onOpenCalendar}
		class="rounded-full p-1.5 text-white transition-colors hover:bg-white/20"
		aria-label="カレンダーで日付を選択"
	>
		<Icon icon="mdi:calendar" class="h-6 w-6" />
	</button>
</div>

<!-- Suggestion Panel -->
<div
	class="fixed right-0 bottom-0 left-0 z-110 flex flex-col bg-[#A9DDEB]"
	style="top: calc({viewportOffset}px + 56px);"
>
	{#if !searchQuery.trim()}
		<div class="flex h-full items-center justify-center px-6 text-center text-sm text-[#4B97AD]">
			キーワードを入力すると候補が表示されます
		</div>
	{:else if isSearching}
		<div class="flex h-full items-center justify-center gap-2 text-sm text-[#4B97AD]">
			<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
			<span>検索中...</span>
		</div>
	{:else if searchResults.length === 0}
		<div class="flex h-full items-center justify-center px-6 text-center text-sm text-[#4B97AD]">
			検索結果がありません
		</div>
	{:else}
		<div class="shrink-0 border-b border-[#8EC5D6] bg-[#B6E5F0] px-4 pt-2">
			<div
				class="inline-block border-b-2 border-[#F1709A] px-1 pb-1 text-sm font-semibold text-[#2D8FA5]"
			>
				メッセージ
			</div>
		</div>

		<div
			class="shrink-0 border-b border-[#8EC5D6] bg-[#B6E5F0] px-4 py-2 text-sm font-semibold text-[#2D8FA5]"
		>
			メッセージ {searchResults.length}
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto">
			{#each searchResults as result (result.id)}
				<button
					class={`flex w-full items-start gap-3 border-b border-[#93C8D9]/70 px-4 py-3 text-left transition-colors hover:bg-white/30 ${
						selectedResultId === result.id ? 'bg-white/35' : ''
					}`}
					onclick={() => selectSearchResult(result.id)}
				>
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7DBFD5] text-sm font-semibold text-white"
					>
						{getAvatarText(result)}
					</div>

					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-3">
							<p class="truncate text-sm font-semibold text-[#2C8FA5]">
								{getSenderName(result)}
							</p>
							<span class="shrink-0 text-xs text-[#5AA2B5]">
								{formatResultDate(result.timestamp)}
							</span>
						</div>

						<p class="mt-1 truncate text-sm text-[#3D95A7]">
							{#each buildPreviewParts(result, searchQuery) as part, i (i)}
								<span class={part.matched ? 'font-semibold text-[#F1709A]' : ''}>
									{part.text}
								</span>
							{/each}
						</p>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>

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
	let currentResultIndex = $state(0);
	let isSearching = $state(false);
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
			searchResults = [];
			currentResultIndex = 0;
			isSearching = false;
			onSearchResult(null);
			return;
		}

		isSearching = true;
		debounceTimer = setTimeout(() => {
			performSearch(query);
		}, 300);
	}

	// Search functionality with chunked processing to prevent UI freeze
	function performSearch(query: string) {
		const lowerQuery = query.toLowerCase();
		const results: Message[] = [];
		const chunkSize = 1000;
		let index = 0;

		function processChunk() {
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
				// Search complete
				searchResults = results;
				currentResultIndex = 0;
				isSearching = false;

				if (results.length > 0) onSearchResult(results[0].id);
				else onSearchResult(null);
			}
		}

		processChunk();
	}

	function navigateResult(direction: 'prev' | 'next') {
		if (searchResults.length === 0) return;

		if (direction === 'next') currentResultIndex = (currentResultIndex + 1) % searchResults.length;
		else
			currentResultIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;

		onSearchResult(searchResults[currentResultIndex].id);
	}

	function clearSearch() {
		if (debounceTimer) clearTimeout(debounceTimer);
		searchQuery = '';
		searchResults = [];
		currentResultIndex = 0;
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
	class="fixed right-0 left-0 z-100 flex h-14 items-center gap-2 bg-[#7CC5E6] px-3 shadow-sm"
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

<!-- Search Results Counter & Navigation -->
{#if isSearching}
	<div
		class="fixed right-0 left-0 z-100 border-b border-gray-200 bg-white/95 px-4 py-2 text-sm text-gray-500 backdrop-blur-sm"
		style="top: calc({viewportOffset}px + 3.5rem);"
	>
		<div class="flex items-center gap-2">
			<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
			<span>検索中...</span>
		</div>
	</div>
{:else if searchQuery && searchResults.length > 0}
	<div
		class="fixed right-0 left-0 z-100 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-2 text-sm backdrop-blur-sm"
		style="top: calc({viewportOffset}px + 3.5rem);"
	>
		<span class="text-gray-600">
			{currentResultIndex + 1} / {searchResults.length} 件
		</span>
		<div class="flex gap-1">
			<button
				onclick={() => navigateResult('prev')}
				class="rounded p-1 hover:bg-gray-200"
				disabled={searchResults.length <= 1}
			>
				<Icon icon="mdi:chevron-up" class="h-5 w-5" />
			</button>
			<button
				onclick={() => navigateResult('next')}
				class="rounded p-1 hover:bg-gray-200"
				disabled={searchResults.length <= 1}
			>
				<Icon icon="mdi:chevron-down" class="h-5 w-5" />
			</button>
		</div>
	</div>
{:else if searchQuery && searchResults.length === 0}
	<div
		class="fixed right-0 left-0 z-100 border-b border-gray-200 bg-white/95 px-4 py-2 text-sm text-gray-500 backdrop-blur-sm"
		style="top: calc({viewportOffset}px + 3.5rem);"
	>
		検索結果がありません
	</div>
{/if}

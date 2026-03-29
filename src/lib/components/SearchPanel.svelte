<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Icon from '@iconify/svelte';
	import type { Message } from '$lib/schema';
	import Avatar from './Avatar.svelte';

	interface Props {
		messages: Message[];
		onSearchResult: (
			messageId: number | null,
			context?: { resultIds: number[]; currentIndex: number } | null
		) => void;
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
			onSearchResult(null, null);
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
				onSearchResult(null, null);
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
		const resultIds = searchResults.map((result) => result.id);
		const currentIndex = resultIds.findIndex((id) => id === messageId);
		onSearchResult(messageId, { resultIds, currentIndex: Math.max(currentIndex, 0) });
		onClose();
	}

	function clearSearch() {
		if (debounceTimer) clearTimeout(debounceTimer);
		activeSearchToken += 1;
		searchQuery = '';
		searchResults = [];
		selectedResultId = null;
		isSearching = false;
		onSearchResult(null, null);
	}

	$effect(() => {
		debouncedSearch();
	});
</script>

<div
	class="absolute inset-0 z-[120] overflow-hidden"
	style="background-color: var(--line-surface);"
>
	<div
		class="relative flex h-full flex-col"
		style="background-color: var(--line-surface); padding-top: {viewportOffset}px;"
	>
		<div
			bind:this={searchBarRef}
			class="flex h-14 shrink-0 items-center gap-2 border-b border-[--line-border] bg-[--line-surface] px-3"
		>
			<button onclick={onClose} class="line-icon-button flex h-9 w-9 items-center justify-center">
				<Icon icon="mdi:chevron-left" class="h-6 w-6" />
			</button>

			<div class="relative flex-1">
				<input
					type="text"
					placeholder="検索"
					bind:value={searchQuery}
					class="line-search-pill h-9.5 w-full py-2 pr-9 pl-9 text-sm text-[--line-text] placeholder-[--line-text-faint] focus:outline-none"
				/>
				<Icon
					icon="mdi:magnify"
					class="absolute top-1/2 left-2.5 h-5 w-5 -translate-y-1/2 text-[--line-search-icon]"
				/>
				{#if searchQuery}
					<button onclick={clearSearch} class="absolute top-1/2 right-2.5 -translate-y-1/2">
						<Icon
							icon="mdi:close-circle"
							class="h-5 w-5 text-[--line-text-faint] hover:text-[--line-text-subtle]"
						/>
					</button>
				{/if}
			</div>

			<button
				onclick={onOpenCalendar}
				class="line-chip-button flex h-9 items-center gap-1 px-3 text-sm font-medium"
				aria-label="カレンダーで日付を選択"
			>
				<Icon icon="mdi:calendar-month-outline" class="h-4 w-4" />
				日付
			</button>
		</div>

		<div class="min-h-0 flex-1 bg-[--line-surface]">
			{#if !searchQuery.trim()}
				<div
					class="flex h-full items-center justify-center bg-[--line-surface] px-6 text-center text-sm text-[--line-text-soft]"
				>
					キーワードを入力すると候補が表示されます
				</div>
			{:else if isSearching}
				<div
					class="flex h-full items-center justify-center gap-2 bg-[--line-surface] text-sm text-[--line-text-soft]"
				>
					<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
					<span>検索中...</span>
				</div>
			{:else if searchResults.length === 0}
				<div
					class="flex h-full items-center justify-center bg-[--line-surface] px-6 text-center text-sm text-[--line-text-soft]"
				>
					検索結果がありません
				</div>
			{:else}
				<div class="shrink-0 border-b border-[--line-border] bg-[--line-surface] px-4 pt-2">
					<div
						class="inline-block border-b-2 border-[--line-text] px-1 pb-1 text-sm font-semibold text-[--line-text]"
					>
						メッセージ
					</div>
				</div>

				<div
					class="shrink-0 border-b border-[--line-border] bg-[--line-surface] px-4 py-2 text-sm font-semibold text-[--line-text-subtle]"
				>
					メッセージ {searchResults.length}
				</div>

				<div class="h-full min-h-0 overflow-y-auto bg-[--line-surface]">
					{#each searchResults as result (result.id)}
						<button
							class={`flex w-full items-start gap-3 border-b border-[--line-border] bg-[--line-surface] px-4 py-3 text-left transition-colors hover:bg-[--line-surface-press] ${
								selectedResultId === result.id ? 'bg-[--line-selection]' : ''
							}`}
							onclick={() => selectSearchResult(result.id)}
						>
							<Avatar
								name={getSenderName(result)}
								src={result.avatarUrl}
								class="h-10 w-10 shrink-0"
							/>

							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between gap-3">
									<p class="truncate text-sm font-semibold text-[--line-text]">
										{getSenderName(result)}
									</p>
									<span class="shrink-0 text-xs text-[--line-text-faint]">
										{formatResultDate(result.timestamp)}
									</span>
								</div>

								<p class="mt-1 truncate text-sm text-[--line-text-subtle]">
									{#each buildPreviewParts(result, searchQuery) as part, i (i)}
										<span class={part.matched ? 'font-semibold text-[--line-brand]' : ''}>
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
	</div>
</div>

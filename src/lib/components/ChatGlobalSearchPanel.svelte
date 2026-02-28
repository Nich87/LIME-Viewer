<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import type { ChatRoom, GlobalMessageSearchResult } from '$lib/schema';
	import { databaseService } from '$lib/services';

	interface Props {
		chats: ChatRoom[];
		onSelectChat: (id: string) => void;
		onSelectMessage?: (chatId: string, messageId: number) => void;
		onClose: () => void;
	}

	type SearchCategory = 'all' | 'friends' | 'groups' | 'official';

	let { chats, onSelectChat, onSelectMessage, onClose }: Props = $props();

	const SEARCH_HISTORY_KEY = 'chatListGlobalSearchHistory';
	const SEARCH_AUTO_SAVE_KEY = 'chatListGlobalSearchAutoSave';
	const MAX_HISTORY_COUNT = 20;

	const categories: Array<{ id: SearchCategory; label: string; icon: string }> = [
		{ id: 'all', label: 'すべて', icon: 'mdi:view-grid-outline' },
		{ id: 'friends', label: '友だち', icon: 'mdi:account-outline' },
		{ id: 'groups', label: 'グループ', icon: 'mdi:account-group-outline' },
		{ id: 'official', label: '公式', icon: 'mdi:shield-account-outline' }
	];

	let searchInputRef: HTMLInputElement | undefined = $state();
	let searchQuery = $state('');
	let selectedCategory: SearchCategory = $state('all');
	let recentSearches = $state<string[]>([]);
	let autoSaveHistory = $state(true);
	let storageReady = $state(false);
	let messageSearchResults = $state<GlobalMessageSearchResult[]>([]);
	let searchingMessages = $state(false);
	let activeMessageSearchToken = 0;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		recentSearches = getInitialHistory();
		autoSaveHistory = getInitialAutoSave();
		storageReady = true;
		searchInputRef?.focus();
	});

	onDestroy(() => {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
	});

	function getInitialHistory(): string[] {
		if (!browser) return [];
		try {
			const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
			if (!raw) return [];
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) return [];
			return parsed.filter((item): item is string => typeof item === 'string').slice(0, 50);
		} catch {
			return [];
		}
	}

	function getInitialAutoSave(): boolean {
		if (!browser) return true;
		const raw = localStorage.getItem(SEARCH_AUTO_SAVE_KEY);
		return raw !== 'false';
	}

	function persistHistory(history: string[]): void {
		if (!browser || !storageReady) return;
		localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
	}

	function persistAutoSave(value: boolean): void {
		if (!browser || !storageReady) return;
		localStorage.setItem(SEARCH_AUTO_SAVE_KEY, String(value));
	}

	$effect(() => {
		if (!browser || !storageReady) return;
		localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(recentSearches));
	});

	$effect(() => {
		if (!browser || !storageReady) return;
		localStorage.setItem(SEARCH_AUTO_SAVE_KEY, String(autoSaveHistory));
	});

	function normalizeQuery(value: string): string {
		return value.trim().replace(/\s+/g, ' ');
	}

	function matchesCategory(chat: ChatRoom, category: SearchCategory): boolean {
		if (category === 'all') return true;
		if (category === 'groups') return chat.isGroup;
		if (category === 'friends') return !chat.isGroup;
		// Official account classification is not available in DB schema yet.
		return true;
	}

	function formatTime(timestamp: number): string {
		if (!timestamp) return '';
		const date = new Date(timestamp);
		const nowMs = Date.now();
		const today = new Date(nowMs);
		const isToday = date.toDateString() === today.toDateString();
		const yesterday = new Date(nowMs - 86400000);
		const isYesterday = date.toDateString() === yesterday.toDateString();

		if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		if (isYesterday) return '昨日';
		return `${date.getMonth() + 1}/${date.getDate()}`;
	}

	function addSearchHistory(value: string): void {
		const normalized = normalizeQuery(value);
		if (!normalized || !autoSaveHistory) return;

		const lowerNormalized = normalized.toLowerCase();
		const deduped = recentSearches.filter((item) => item.toLowerCase() !== lowerNormalized);
		const nextHistory = [normalized, ...deduped].slice(0, MAX_HISTORY_COUNT);
		recentSearches = nextHistory;
		persistHistory(nextHistory);
	}

	function handleSelectChat(chatId: string): void {
		addSearchHistory(searchQuery);
		onSelectChat(chatId);
		onClose();
	}

	function handleSelectMessageResult(result: GlobalMessageSearchResult): void {
		addSearchHistory(searchQuery);
		if (onSelectMessage) {
			onSelectMessage(result.chatId, result.id);
		} else {
			onSelectChat(result.chatId);
		}
		onClose();
	}

	function handleSubmit(event: SubmitEvent): void {
		event.preventDefault();
		const normalized = normalizeQuery(searchQuery);
		if (!normalized) return;
		addSearchHistory(normalized);

		if (filteredMessageSearchResults.length > 0) {
			const topMessageResult = filteredMessageSearchResults[0];
			if (onSelectMessage) {
				onSelectMessage(topMessageResult.chatId, topMessageResult.id);
			} else {
				onSelectChat(topMessageResult.chatId);
			}
			onClose();
			return;
		}

		if (searchResults.length > 0) {
			onSelectChat(searchResults[0].id);
			onClose();
		}
	}

	function handleSelectRecentSearch(query: string): void {
		searchQuery = query;
		addSearchHistory(query);
		searchInputRef?.focus();
	}

	function removeRecentSearch(query: string): void {
		const nextHistory = recentSearches.filter((item) => item !== query);
		recentSearches = nextHistory;
		persistHistory(nextHistory);
	}

	function clearSearchHistory(): void {
		recentSearches = [];
		persistHistory([]);
	}

	function toggleAutoSaveHistory(): void {
		autoSaveHistory = !autoSaveHistory;
		persistAutoSave(autoSaveHistory);
	}

	function clearSearchQuery(): void {
		searchQuery = '';
		searchInputRef?.focus();
	}

	function formatResultDate(timestamp: number): string {
		if (!timestamp) return '';
		const date = new Date(timestamp);
		const now = new Date();
		const sameYear = date.getFullYear() === now.getFullYear();
		if (sameYear) return `${date.getMonth() + 1}/${date.getDate()}`;
		return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
	}

	function getSenderName(result: GlobalMessageSearchResult): string {
		if (!result.fromId) return '自分';
		return result.fromName || result.fromId;
	}

	function getChatName(chatId: string): string {
		return chatsById.get(chatId)?.name || 'Unknown';
	}

	function getMessagePreview(content: string): string {
		const trimmed = content.trim();
		if (!trimmed) return '(本文なし)';
		return trimmed;
	}

	function escapeRegExp(value: string): string {
		return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function buildHighlightParts(
		text: string,
		query: string
	): Array<{ text: string; matched: boolean }> {
		if (!text) return [];
		const trimmedQuery = query.trim();
		if (!trimmedQuery) return [{ text, matched: false }];

		const escapedQuery = escapeRegExp(trimmedQuery);
		const regex = new RegExp(`(${escapedQuery})`, 'gi');
		const loweredQuery = trimmedQuery.toLowerCase();

		return text
			.split(regex)
			.filter((part) => part.length > 0)
			.map((part) => ({
				text: part,
				matched: part.toLowerCase() === loweredQuery
			}));
	}

	let normalizedQuery = $derived(normalizeQuery(searchQuery));
	let chatsById = $derived(new Map(chats.map((chat) => [chat.id, chat])));

	let searchResults = $derived.by(() => {
		if (!normalizedQuery) return [];
		const lowerQuery = normalizedQuery.toLowerCase();

		return chats
			.filter((chat) => {
				if (!matchesCategory(chat, selectedCategory)) return false;
				const name = chat.name.toLowerCase();
				const lastMessage = (chat.lastMessage ?? '').toLowerCase();
				return name.includes(lowerQuery) || lastMessage.includes(lowerQuery);
			})
			.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
	});

	let filteredMessageSearchResults = $derived.by(() =>
		messageSearchResults.filter((result) => {
			const chat = chatsById.get(result.chatId);
			if (!chat) return false;
			return matchesCategory(chat, selectedCategory);
		})
	);

	let totalSearchResultsCount = $derived(
		searchResults.length + filteredMessageSearchResults.length
	);

	let visibleRecentSearches = $derived.by(() => {
		if (selectedCategory === 'all') return recentSearches;
		return recentSearches.filter((query) => {
			const lowerQuery = query.toLowerCase();
			return chats.some((chat) => {
				if (!matchesCategory(chat, selectedCategory)) return false;
				return (
					chat.name.toLowerCase().includes(lowerQuery) ||
					(chat.lastMessage ?? '').toLowerCase().includes(lowerQuery)
				);
			});
		});
	});

	$effect(() => {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}

		const query = normalizedQuery;
		if (!query) {
			activeMessageSearchToken += 1;
			searchingMessages = false;
			messageSearchResults = [];
			return;
		}

		searchingMessages = true;
		const token = ++activeMessageSearchToken;
		debounceTimer = setTimeout(async () => {
			try {
				const results = await databaseService.searchGlobalMessages(query, 120);
				if (token !== activeMessageSearchToken) return;
				messageSearchResults = results;
			} catch (error) {
				if (token !== activeMessageSearchToken) return;
				console.error('Global message search failed:', error);
				messageSearchResults = [];
			} finally {
				if (token === activeMessageSearchToken) {
					searchingMessages = false;
				}
			}
		}, 250);
	});
</script>

<div
	class="absolute inset-0 z-50 flex flex-col bg-[#F4F6F8] dark:bg-slate-900"
	role="dialog"
	aria-modal="true"
	aria-label="トーク全体検索"
>
	<form
		class="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900"
		onsubmit={handleSubmit}
	>
		<button
			type="button"
			onclick={onClose}
			class="rounded-full p-1 text-gray-700 transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
			aria-label="検索を閉じる"
		>
			<Icon icon="mdi:chevron-left" class="h-6 w-6" />
		</button>

		<div class="relative flex-1">
			<input
				bind:this={searchInputRef}
				type="text"
				placeholder="検索"
				bind:value={searchQuery}
				class="w-full rounded-full bg-gray-100 py-2 pr-9 pl-9 text-sm text-gray-800 placeholder-gray-400 focus:outline-none dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
			/>
			<Icon
				icon="mdi:magnify"
				class="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-500"
			/>
			{#if searchQuery}
				<button
					type="button"
					class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
					onclick={clearSearchQuery}
					aria-label="検索キーワードをクリア"
				>
					<Icon icon="mdi:close" class="h-4 w-4" />
				</button>
			{/if}
		</div>
	</form>

	<div
		class="border-b border-gray-200 bg-white px-4 pt-4 pb-3 dark:border-slate-700 dark:bg-slate-900"
	>
		<p class="mb-3 text-sm font-semibold text-gray-800 dark:text-slate-100">カテゴリーで検索</p>
		<div class="grid grid-cols-4 gap-3">
			{#each categories as category (category.id)}
				<button
					type="button"
					onclick={() => (selectedCategory = category.id)}
					class="flex flex-col items-center gap-1.5"
					aria-pressed={selectedCategory === category.id}
				>
					<span
						class="flex h-10 w-10 items-center justify-center rounded-full border transition-colors {selectedCategory ===
						category.id
							? 'border-[#2DA9D0] bg-[#E2F4FA] text-[#2DA9D0] dark:border-cyan-400 dark:bg-cyan-950 dark:text-cyan-300'
							: 'border-gray-300 bg-white text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'}"
					>
						<Icon icon={category.icon} class="h-5 w-5" />
					</span>
					<span
						class="text-[11px] font-medium {selectedCategory === category.id
							? 'text-[#2DA9D0] dark:text-cyan-300'
							: 'text-gray-600 dark:text-slate-300'}"
					>
						{category.label}
					</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto bg-white dark:bg-slate-900">
		{#if normalizedQuery}
			<div
				class="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-slate-700 dark:text-slate-400"
			>
				検索結果 {totalSearchResultsCount} 件
			</div>

			{#if searchingMessages}
				<div class="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">メッセージを検索中...</div>
			{/if}

			{#if !searchingMessages && totalSearchResultsCount === 0}
				<div class="px-6 py-10 text-center text-sm text-gray-400 dark:text-slate-500">
					検索結果がありません
				</div>
			{/if}

			{#if filteredMessageSearchResults.length > 0}
				<div
					class="border-b border-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 dark:border-slate-700 dark:text-slate-300"
				>
					メッセージ
				</div>

				{#each filteredMessageSearchResults as result (result.id)}
					<button
						type="button"
						class="w-full border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
						onclick={() => handleSelectMessageResult(result)}
					>
						<div class="mb-1 flex items-start justify-between gap-2">
							<p class="min-w-0 truncate text-sm font-semibold text-gray-800 dark:text-slate-100">
								{getChatName(result.chatId)}
							</p>
							<span class="shrink-0 text-xs text-gray-400 dark:text-slate-500"
								>{formatResultDate(result.timestamp)}</span
							>
						</div>
						<p class="truncate text-xs text-gray-500 dark:text-slate-400">
							{getSenderName(result)}
						</p>
						<p class="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-slate-300">
							{#each buildHighlightParts(getMessagePreview(result.content), normalizedQuery) as part, i (i)}
								<span class={part.matched ? 'font-semibold text-[#F1709A]' : ''}>{part.text}</span>
							{/each}
						</p>
					</button>
				{/each}
			{/if}

			{#if searchResults.length > 0}
				<div
					class="border-b border-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 dark:border-slate-700 dark:text-slate-300"
				>
					トーク
				</div>

				{#each searchResults as chat (chat.id)}
					<button
						type="button"
						class="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
						onclick={() => handleSelectChat(chat.id)}
					>
						<div
							class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-300 text-sm font-bold text-gray-600 dark:bg-slate-600 dark:text-slate-100"
						>
							{#if chat.avatarUrl}
								<img src={chat.avatarUrl} alt={chat.name} class="h-full w-full object-cover" />
							{:else}
								{chat.name.slice(0, 1)}
							{/if}
						</div>

						<div class="min-w-0 flex-1">
							<div class="mb-0.5 flex items-baseline justify-between gap-2">
								<p class="truncate text-sm font-semibold text-gray-800 dark:text-slate-100">
									{#each buildHighlightParts(chat.name, normalizedQuery) as part, i (i)}
										<span class={part.matched ? 'text-[#F1709A]' : ''}>{part.text}</span>
									{/each}
								</p>
								<span class="shrink-0 text-xs text-gray-400 dark:text-slate-500"
									>{formatTime(chat.lastMessageTime)}</span
								>
							</div>
							<p class="truncate text-sm text-gray-500 dark:text-slate-400">
								{#each buildHighlightParts(chat.lastMessage || '(メッセージなし)', normalizedQuery) as part, i (i)}
									<span class={part.matched ? 'font-semibold text-[#F1709A]' : ''}>
										{part.text}
									</span>
								{/each}
							</p>
						</div>
					</button>
				{/each}
			{/if}
		{:else}
			<div
				class="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 dark:border-slate-700 dark:text-slate-100"
			>
				最近の検索
			</div>

			{#if visibleRecentSearches.length === 0}
				<div class="px-6 py-10 text-center text-sm text-gray-400 dark:text-slate-500">
					最近の検索はありません
				</div>
			{:else}
				{#each visibleRecentSearches as query (query)}
					<div class="flex items-center border-b border-gray-100 px-4 py-2.5 dark:border-slate-700">
						<button
							type="button"
							class="flex min-w-0 flex-1 items-center gap-2 text-left"
							onclick={() => handleSelectRecentSearch(query)}
						>
							<span
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-300"
							>
								<Icon icon="mdi:magnify" class="h-4 w-4" />
							</span>
							<span class="truncate text-sm text-gray-700 dark:text-slate-200">{query}</span>
						</button>
						<button
							type="button"
							class="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
							onclick={() => removeRecentSearch(query)}
							aria-label="検索履歴を削除"
						>
							<Icon icon="mdi:close" class="h-4 w-4" />
						</button>
					</div>
				{/each}
			{/if}
		{/if}
	</div>

	<div
		class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"
	>
		<button
			type="button"
			class="font-medium transition-colors {autoSaveHistory
				? 'text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:hover:text-slate-100'
				: 'text-[#2DA9D0] hover:text-[#2384A3] dark:text-cyan-300 dark:hover:text-cyan-200'}"
			onclick={toggleAutoSaveHistory}
		>
			{autoSaveHistory ? '自動保存をオフにする' : '自動保存をオンにする'}
		</button>
		<button
			type="button"
			class="font-medium transition-colors disabled:cursor-not-allowed disabled:text-gray-300 dark:disabled:text-slate-600 {visibleRecentSearches.length >
			0
				? 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
				: ''}"
			onclick={clearSearchHistory}
			disabled={visibleRecentSearches.length === 0}
		>
			すべて削除
		</button>
	</div>
</div>

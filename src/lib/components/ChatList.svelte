<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '@iconify/svelte';
	import type { ChatRoom } from '$lib/schema';
	import ExportAllModal from './modals/ExportAllModal.svelte';
	import ChatGlobalSearchPanel from './ChatGlobalSearchPanel.svelte';

	interface Props {
		chats?: ChatRoom[];
		selectedChatId?: string | null;
		onselect?: (id: string, options?: { messageId?: number }) => void;
		onReset?: () => void;
		fullWidth?: boolean;
	}

	let { chats = [], selectedChatId = null, onselect, onReset, fullWidth = false }: Props = $props();

	let showExportModal = $state(false);
	let showGlobalSearch = $state(false);

	function getInitialTab(): 'all' | 'friends' | 'groups' | 'official' {
		if (browser) {
			const saved = localStorage.getItem('chatListActiveTab');
			if (saved && ['all', 'friends', 'groups', 'official'].includes(saved)) {
				return saved as 'all' | 'friends' | 'groups' | 'official';
			}
		}
		return 'all';
	}

	let activeTab: 'all' | 'friends' | 'groups' | 'official' = $state(getInitialTab());

	const tabs = [
		{ id: 'all', label: 'すべて' },
		{ id: 'friends', label: '友だち' },
		{ id: 'groups', label: 'グループ' },
		{ id: 'official', label: '公式' }
	] as const;

	$effect(() => {
		if (browser) {
			localStorage.setItem('chatListActiveTab', activeTab);
		}
	});

	function handleTabScroll(event: WheelEvent) {
		event.preventDefault();
		const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
		if (event.deltaY > 0 || event.deltaX > 0) {
			const nextIndex = Math.min(currentIndex + 1, tabs.length - 1);
			activeTab = tabs[nextIndex].id;
		} else if (event.deltaY < 0 || event.deltaX < 0) {
			const prevIndex = Math.max(currentIndex - 1, 0);
			activeTab = tabs[prevIndex].id;
		}
	}

	let touchStartX = 0;
	let touchStartY = 0;
	const SWIPE_THRESHOLD = 50;

	function handleTouchStart(event: TouchEvent) {
		if (showGlobalSearch) return;
		touchStartX = event.touches[0].clientX;
		touchStartY = event.touches[0].clientY;
	}

	function handleTouchEnd(event: TouchEvent) {
		if (showGlobalSearch) return;
		const touchEndX = event.changedTouches[0].clientX;
		const touchEndY = event.changedTouches[0].clientY;
		const deltaX = touchEndX - touchStartX;
		const deltaY = touchEndY - touchStartY;

		if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
			const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
			if (deltaX < 0) {
				const nextIndex = Math.min(currentIndex + 1, tabs.length - 1);
				activeTab = tabs[nextIndex].id;
			} else {
				const prevIndex = Math.max(currentIndex - 1, 0);
				activeTab = tabs[prevIndex].id;
			}
		}
	}

	function selectChat(id: string, options?: { messageId?: number }) {
		onselect?.(id, options);
	}

	function handleSelectMessage(chatId: string, messageId: number) {
		selectChat(chatId, { messageId });
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

	let filteredChats = $derived(
		chats.filter((chat) => {
			if (activeTab === 'all') return true;
			if (activeTab === 'groups') return chat.isGroup;
			if (activeTab === 'friends') return !chat.isGroup;
			return true;
		})
	);
</script>

<div
	class="relative isolate flex h-full flex-col border-[--line-border] bg-[--line-surface]"
	class:border-r={!fullWidth}
	class:w-[22rem]={!fullWidth}
	class:w-full={fullWidth}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	role="region"
	aria-label="トーク一覧"
>
	<div class="shrink-0 bg-[--line-surface]">
		<div class="flex items-start justify-between px-4 pt-4 pb-2">
			<div class="min-w-0">
				<p class="text-[11px] font-semibold tracking-[0.18em] text-[--line-brand] uppercase">
					LIME Viewer
				</p>
				<h1 class="mt-1 text-[1.65rem] leading-none font-bold tracking-tight text-[--line-text]">
					トーク
				</h1>
			</div>

			<div class="ml-3 flex items-center gap-1">
				<button
					type="button"
					class="line-icon-button flex h-9 w-9 items-center justify-center"
					onclick={() => (showExportModal = true)}
					title="全トーク履歴をエクスポート"
					aria-label="全トーク履歴をエクスポート"
				>
					<Icon icon="mdi:download-outline" class="h-5 w-5" />
				</button>
				{#if onReset}
					<button
						type="button"
						class="line-icon-button flex h-9 w-9 items-center justify-center"
						onclick={onReset}
						title="データをリセット"
						aria-label="データをリセット"
					>
						<Icon icon="mdi:restart" class="h-5 w-5" />
					</button>
				{/if}
			</div>
		</div>

		<div class="px-4 pb-3">
			<button
				type="button"
				onclick={() => (showGlobalSearch = true)}
				class="line-search-pill flex h-9.5 w-full items-center gap-2 px-3 text-left text-sm"
				aria-label="トーク全体検索を開く"
			>
				<Icon icon="mdi:magnify" class="h-4.5 w-4.5 shrink-0 text-[--line-search-icon]" />
				<span class="truncate">検索</span>
			</button>
		</div>

		<div class="px-2" onwheel={handleTabScroll}>
			<div class="flex min-w-full items-center">
				{#each tabs as tab (tab.id)}
					<button
						type="button"
						class="flex-1 border-b-2 px-2 pt-2 pb-3 text-sm font-semibold transition-colors {activeTab ===
						tab.id
							? 'border-[--line-text] text-[--line-text]'
							: 'border-transparent text-[--line-text-soft] hover:text-[--line-text]'}"
						onclick={() => (activeTab = tab.id)}
					>
						{tab.label}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto bg-[--line-surface] px-2 pb-3">
		{#if filteredChats.length === 0}
			<div class="flex h-full flex-col items-center justify-center px-6 text-center">
				<div
					class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[--line-surface-alt] text-[--line-text-faint]"
				>
					<Icon icon="mdi:chat-outline" class="h-7 w-7" />
				</div>
				<p class="text-sm font-medium text-[--line-text-subtle]">表示できるトークがありません</p>
			</div>
		{:else}
			{#each filteredChats as chat (chat.id)}
				<button
					type="button"
					class="line-list-row {selectedChatId === chat.id
						? 'is-active'
						: ''} flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left"
					onclick={() => selectChat(chat.id)}
				>
					<div
						class="flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#d9dde4] text-sm font-semibold text-[--line-text-subtle]"
					>
						{#if chat.avatarUrl}
							<img src={chat.avatarUrl} alt={chat.name} class="h-full w-full object-cover" />
						{:else}
							{chat.name.slice(0, 1)}
						{/if}
					</div>

					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-3">
							<h3 class="truncate text-[15px] leading-5 font-semibold text-[--line-text]">
								{chat.name}
								{#if (chat.memberCount ?? 0) > 0}
									<span class="ml-1 text-[12px] font-medium text-[--line-text-soft]">
										({chat.memberCount})
									</span>
								{/if}
							</h3>
							<span class="shrink-0 pt-0.5 text-[11px] text-[--line-text-faint]">
								{formatTime(chat.lastMessageTime)}
							</span>
						</div>

						<p class="mt-1 truncate text-[13px] leading-5 text-[--line-text-subtle]">
							{chat.lastMessage || 'メッセージはありません'}
						</p>
					</div>
				</button>
			{/each}
		{/if}
	</div>

	{#if showGlobalSearch}
		<ChatGlobalSearchPanel
			{chats}
			onSelectChat={selectChat}
			onSelectMessage={handleSelectMessage}
			onClose={() => (showGlobalSearch = false)}
		/>
	{/if}
</div>

{#if showExportModal}
	<ExportAllModal {chats} onClose={() => (showExportModal = false)} />
{/if}

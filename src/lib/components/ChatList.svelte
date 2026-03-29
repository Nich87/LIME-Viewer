<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '@iconify/svelte';
	import type { ChatRoom } from '$lib/schema';
	import Avatar from './Avatar.svelte';
	import ExportAllModal from './modals/ExportAllModal.svelte';
	import ChatGlobalSearchPanel from './ChatGlobalSearchPanel.svelte';

	type ChatTab = 'all' | 'friends' | 'groups' | 'official' | 'openchat';

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

	function getInitialTab(): ChatTab {
		if (browser) {
			const saved = localStorage.getItem('chatListActiveTab');
			if (saved && ['all', 'friends', 'groups', 'official', 'openchat'].includes(saved)) {
				return saved as ChatTab;
			}
		}
		return 'all';
	}

	let activeTab: ChatTab = $state(getInitialTab());

	const tabs = [
		{ id: 'all', label: 'すべて' },
		{ id: 'friends', label: '友だち' },
		{ id: 'groups', label: 'グループ' },
		{ id: 'official', label: '公式アカウント' },
		{ id: 'openchat', label: 'オープンチャット' }
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

		if (isToday) {
			return date.toLocaleTimeString('ja-JP', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
		}
		return `${date.getMonth() + 1}/${date.getDate()}`;
	}

	function formatUnreadCount(count: number): string {
		if (count > 999) return '999+';
		return `${count}`;
	}

	function matchesTab(chat: ChatRoom, tab: ChatTab = activeTab): boolean {
		if (tab === 'all') return true;
		if (tab === 'groups') return chat.isGroup;
		if (tab === 'friends') return !chat.isGroup;
		if (tab === 'official') return false;
		if (tab === 'openchat') return false;
		return true;
	}

	function shouldShowTabIndicator(tab: ChatTab): boolean {
		if (tab === 'official' || tab === 'openchat') return false;
		return chats.some((chat) => matchesTab(chat, tab) && chat.unreadCount > 0);
	}

	const totalUnreadCount = $derived(chats.reduce((sum, chat) => sum + chat.unreadCount, 0));

	let filteredChats = $derived(chats.filter((chat) => matchesTab(chat)));
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
	<div class="shrink-0 border-b border-[rgba(17,17,17,0.05)] bg-[--line-surface]">
		<div class="px-4 pt-[max(12px,env(safe-area-inset-top))] pb-1">
			<div class="flex items-center justify-between">
				<h1 class="text-[1.9rem] leading-none font-bold tracking-[-0.03em] text-[--line-text]">
					トーク
				</h1>

				<div class="ml-4 flex items-center gap-0.5 text-[--line-text]">
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
		</div>

		<div class="flex items-center gap-2 px-4 pt-2 pb-2.5">
			<button
				type="button"
				onclick={() => (showGlobalSearch = true)}
				class="line-mobile-search flex h-9.5 min-w-0 flex-1 items-center gap-2.5 px-3.5 text-left text-[13px]"
				aria-label="トーク全体検索を開く"
			>
				<Icon icon="mdi:magnify" class="h-4.5 w-4.5 shrink-0 text-[--line-search-icon]" />
				<span class="truncate text-[--line-text-faint]">検索</span>
			</button>
			<button
				type="button"
				class="line-icon-button flex h-9.5 w-9.5 shrink-0 items-center justify-center"
				onclick={() => (showGlobalSearch = true)}
				aria-label="検索オプション"
			>
				<Icon icon="mdi:qrcode-scan" class="h-4.5 w-4.5 text-[--line-text-soft]" />
			</button>
		</div>

		<div class="line-tabs-scroll overflow-x-auto px-3" onwheel={handleTabScroll}>
			<div class="flex min-w-max items-end gap-5">
				{#each tabs as tab (tab.id)}
					<button
						type="button"
						class="line-mobile-tab flex shrink-0 items-center gap-1 border-b-[3px] px-0.5 pt-2 pb-2.5 text-[13px] font-semibold transition-colors {activeTab ===
						tab.id
							? 'border-[--line-text] text-[--line-text]'
							: 'border-transparent text-[--line-text-soft] hover:text-[--line-text]'}"
						onclick={() => (activeTab = tab.id)}
					>
						{tab.label}
						{#if shouldShowTabIndicator(tab.id)}
							<span class="line-mobile-tab-dot"></span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div
		class="min-h-0 flex-1 overflow-y-auto bg-[--line-surface] {fullWidth
			? 'pb-[calc(76px+env(safe-area-inset-bottom))]'
			: ''}"
	>
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
						: ''} flex w-full items-center gap-3 border-b border-[rgba(17,17,17,0.04)] px-4 py-3 text-left last:border-b-0"
					onclick={() => selectChat(chat.id)}
				>
					<Avatar name={chat.name} src={chat.avatarUrl} class="h-13 w-13 shrink-0 bg-[#d9dde4]" />

					<div class="min-w-0 flex-1">
						<div class="flex items-start gap-3">
							<div class="min-w-0 flex-1 pt-0.5">
								<div class="flex items-center gap-1.5">
									<h3 class="truncate text-[15px] leading-5 font-semibold text-[--line-text]">
										{chat.name}
										{#if (chat.memberCount ?? 0) > 0}
											<span class="ml-0.5 text-[13px] font-semibold text-[--line-text-soft]">
												({chat.memberCount})
											</span>
										{/if}
									</h3>
									{#if chat.notificationDisabled}
										<Icon
											icon="mdi:volume-off"
											class="h-3.5 w-3.5 shrink-0 text-[--line-text-faint]"
										/>
									{/if}
								</div>
								<p class="mt-0.5 truncate text-[12.5px] leading-5 text-[--line-text-subtle]">
									{chat.lastMessage || 'メッセージはありません'}
								</p>
							</div>

							<div class="flex shrink-0 flex-col items-end gap-1 pt-0.5">
								<span class="text-[11px] text-[--line-text-faint]">
									{formatTime(chat.lastMessageTime)}
								</span>
								{#if chat.unreadCount > 0}
									<span class="line-unread-badge">
										{formatUnreadCount(chat.unreadCount)}
									</span>
								{/if}
							</div>
						</div>
					</div>
				</button>
			{/each}
		{/if}
	</div>

	{#if fullWidth}
		<nav
			class="line-bottom-nav absolute right-0 bottom-0 left-0 z-20 flex items-end justify-around"
			aria-label="メインナビゲーション"
		>
			<button
				type="button"
				class="line-bottom-nav-item flex min-w-[5.5rem] flex-col items-center justify-center gap-1 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] text-[10px] text-[--line-text-soft]"
			>
				<span class="relative flex h-6 w-6 items-center justify-center">
					<Icon icon="mdi:home-outline" class="h-5.5 w-5.5" />
				</span>
				<span>ホーム</span>
			</button>
			<button
				type="button"
				class="line-bottom-nav-item is-active flex min-w-[5.5rem] flex-col items-center justify-center gap-1 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] text-[10px]"
				aria-current="page"
			>
				<span class="relative flex h-6 w-6 items-center justify-center">
					<Icon icon="mdi:chat" class="h-5.5 w-5.5" />
					{#if totalUnreadCount > 0}
						<span class="line-bottom-nav-badge">
							{formatUnreadCount(totalUnreadCount)}
						</span>
					{/if}
				</span>
				<span>トーク</span>
			</button>
		</nav>
	{/if}

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

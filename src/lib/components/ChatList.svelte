<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '@iconify/svelte';
	import type { ChatRoom } from '$lib/schema';
	import ExportAllModal from './modals/ExportAllModal.svelte';

	interface Props {
		chats?: ChatRoom[];
		selectedChatId?: string | null;
		onselect?: (id: string) => void;
		onReset?: () => void;
		fullWidth?: boolean;
	}

	let { chats = [], selectedChatId = null, onselect, onReset, fullWidth = false }: Props = $props();

	// Export modal state
	let showExportModal = $state(false);

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

	const tabs = ['all', 'friends', 'groups', 'official'] as const;

	$effect(() => {
		if (browser) {
			localStorage.setItem('chatListActiveTab', activeTab);
		}
	});

	function handleTabScroll(event: WheelEvent) {
		event.preventDefault();
		const currentIndex = tabs.indexOf(activeTab);
		if (event.deltaY > 0 || event.deltaX > 0) {
			const nextIndex = Math.min(currentIndex + 1, tabs.length - 1);
			activeTab = tabs[nextIndex];
		} else if (event.deltaY < 0 || event.deltaX < 0) {
			const prevIndex = Math.max(currentIndex - 1, 0);
			activeTab = tabs[prevIndex];
		}
	}

	let touchStartX = 0;
	let touchStartY = 0;
	const SWIPE_THRESHOLD = 50;

	function handleTouchStart(event: TouchEvent) {
		touchStartX = event.touches[0].clientX;
		touchStartY = event.touches[0].clientY;
	}

	function handleTouchEnd(event: TouchEvent) {
		const touchEndX = event.changedTouches[0].clientX;
		const touchEndY = event.changedTouches[0].clientY;
		const deltaX = touchEndX - touchStartX;
		const deltaY = touchEndY - touchStartY;

		if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
			const currentIndex = tabs.indexOf(activeTab);
			if (deltaX < 0) {
				const nextIndex = Math.min(currentIndex + 1, tabs.length - 1);
				activeTab = tabs[nextIndex];
			} else {
				const prevIndex = Math.max(currentIndex - 1, 0);
				activeTab = tabs[prevIndex];
			}
		}
	}

	function selectChat(id: string) {
		onselect?.(id);
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
	class="flex h-full flex-col border-r border-gray-200 bg-[#E8F4F8]"
	class:w-80={!fullWidth}
	class:w-full={fullWidth}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	role="region"
	aria-label="トーク一覧"
>
	<!-- Fixed Header -->
	<div class="shrink-0">
		<!-- Header / Search -->
		<div class="flex items-center justify-between bg-[#7CC5E6] p-4 text-white">
			<h1 class="text-xl font-bold">トーク</h1>
			<div class="flex items-center gap-2">
				<button
					onclick={() => (showExportModal = true)}
					class="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 text-sm transition-colors hover:bg-white/30"
					title="全トーク履歴をエクスポート"
				>
					<Icon icon="mdi:download" class="h-4 w-4" />
					<span class="hidden sm:inline">エクスポート</span>
				</button>
				{#if onReset}
					<button
						onclick={onReset}
						class="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 text-sm transition-colors hover:bg-white/30"
						title="データをリセット"
					>
						<Icon icon="mdi:delete-outline" class="h-4 w-4" />
						<span class="hidden sm:inline">リセット</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Tabs -->
		<div class="flex border-b border-gray-300 bg-white" onwheel={handleTabScroll}>
			{#each tabs as tab (tab)}
				<button
					class="flex-1 py-3 text-sm font-medium transition-colors {activeTab === tab
						? 'border-b-2 border-blue-500 text-blue-500'
						: 'text-gray-500 hover:text-gray-700'}"
					onclick={() => (activeTab = tab)}
				>
					{tab === 'all'
						? 'すべて'
						: tab === 'friends'
							? '友だち'
							: tab === 'groups'
								? 'グループ'
								: '公式'}
				</button>
			{/each}
		</div>
	</div>

	<!-- Chat List -->
	<div class="min-h-0 flex-1 overflow-y-auto">
		{#each filteredChats as chat (chat.id)}
			<button
				class="flex w-full items-center p-3 transition-colors hover:bg-blue-50 {selectedChatId ===
				chat.id
					? 'bg-blue-100'
					: ''}"
				onclick={() => selectChat(chat.id)}
			>
				<!-- Avatar Placeholder -->
				<div
					class="mr-3 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-300 font-bold text-gray-600"
				>
					{#if chat.avatarUrl}
						<img src={chat.avatarUrl} alt={chat.name} class="h-full w-full object-cover" />
					{:else}
						{chat.name.slice(0, 1)}
					{/if}
				</div>

				<div class="min-w-0 flex-1 text-left">
					<div class="mb-1 flex items-baseline justify-between">
						<h3 class="truncate text-sm font-bold text-gray-800">
							{chat.name}
							{#if (chat.memberCount ?? 0) > 0}
								<span class="text-normal text-xs text-gray-500">({chat.memberCount})</span>
							{/if}
						</h3>
						<span class="ml-1 shrink-0 text-xs text-gray-500"
							>{formatTime(chat.lastMessageTime)}</span
						>
					</div>
					<p class="truncate text-sm text-gray-500">{chat.lastMessage}</p>
				</div>
			</button>
		{/each}
	</div>
</div>

<!-- Export All Modal -->
{#if showExportModal}
	<ExportAllModal {chats} onClose={() => (showExportModal = false)} />
{/if}

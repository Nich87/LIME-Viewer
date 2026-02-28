<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate, pushState, replaceState } from '$app/navigation';
	import ChatList from '$lib/components/ChatList.svelte';
	import ChatDetail from '$lib/components/ChatDetail.svelte';
	import SplashScreen from '$lib/components/SplashScreen.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import type { ChatRoom, Message } from '$lib/schema';
	import { databaseService, contactsService, mediaService } from '$lib/services';

	let chats: ChatRoom[] = $state([]);
	let messages: Message[] = $state([]);
	let selectedChatId: string | null = $state(null);
	let pendingHighlightMessageId: number | null = $state(null);
	let loadingMessages = $state(false);

	let isMobile = $state(false);
	let showSplash = $state(false);
	let appReady = $state(false);

	let isDataLoaded = $state(false);

	let isRestoring = $state(false);
	let initializedHistoryState = false;

	afterNavigate(() => {
		if (initializedHistoryState) return;
		initializedHistoryState = true;
		if (!history.state?.view) {
			replaceState('', { view: 'list' });
		}
	});

	async function initializeFromStorage() {
		if (!databaseService.isInitialized()) {
			const hasStoredData = await databaseService.hasStoredData();
			if (hasStoredData) {
				isRestoring = true;
				try {
					const dbLoaded = await databaseService.loadFromStorage();
					if (dbLoaded) {
						try {
							await contactsService.loadFromStorage();
						} catch (contactsError) {
							console.warn('Failed to restore contacts from storage:', contactsError);
						}
						try {
							await mediaService.loadFromStorage();
						} catch (mediaError) {
							console.warn('Failed to restore media from storage:', mediaError);
						}

						isDataLoaded = true;
						if (isMobile) {
							showSplash = true;
						} else {
							appReady = true;
						}
						loadChats();
					} else {
						appReady = true;
					}
				} catch (e) {
					console.error('Failed to restore database from storage:', e);
					appReady = true;
				} finally {
					isRestoring = false;
				}
			} else {
				appReady = true;
			}
		} else {
			isDataLoaded = true;
			if (isMobile) {
				showSplash = true;
			} else {
				appReady = true;
			}
			loadChats();
		}
	}

	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);

		const handlePopState = (event: PopStateEvent) => {
			if (event.state?.view === 'chat') {
				return;
			}

			if (event.state?.view === 'list' || !event.state) {
				selectedChatId = null;
				messages = [];
			}
		};
		window.addEventListener('popstate', handlePopState);

		initializeFromStorage();

		return () => {
			window.removeEventListener('resize', checkMobile);
			window.removeEventListener('popstate', handlePopState);
		};
	});

	async function loadChats() {
		try {
			chats = await databaseService.getChats();
		} catch (err) {
			console.error('Failed to load chat list', err);
		}
	}

	function handleUploadComplete() {
		isDataLoaded = true;
		if (isMobile) {
			showSplash = true;
		}
		loadChats();
	}

	function handleSplashComplete() {
		showSplash = false;
		appReady = true;
	}

	async function handleChatSelect(chatId: string, options?: { messageId?: number }) {
		const highlightMessageId = options?.messageId ?? null;
		const isSameChat = selectedChatId === chatId;
		if (isSameChat && !highlightMessageId) return;

		if (highlightMessageId) {
			pendingHighlightMessageId = highlightMessageId;
			if (isSameChat && messages.some((message) => message.id === highlightMessageId)) {
				return;
			}
		} else {
			pendingHighlightMessageId = null;
		}

		selectedChatId = chatId;
		messages = [];
		loadingMessages = true;

		if (isMobile && !isSameChat) {
			pushState('', { view: 'chat', chatId });
		}

		try {
			await mediaService.preloadChatMedia(chatId);
			const loadedMessages = highlightMessageId
				? await databaseService.getAllMessages(chatId)
				: await databaseService.getMessages(chatId, 100);
			messages = loadedMessages;
		} catch (e) {
			console.error(e);
		} finally {
			loadingMessages = false;
		}
	}

	function handleExternalHighlightHandled() {
		pendingHighlightMessageId = null;
	}

	function handleBack() {
		if (isMobile && history.state?.view === 'chat') {
			history.back();
		} else {
			selectedChatId = null;
			messages = [];
			pendingHighlightMessageId = null;
		}
	}

	async function handleReset() {
		await databaseService.clearAllData();
		isDataLoaded = false;
		chats = [];
		messages = [];
		selectedChatId = null;
		pendingHighlightMessageId = null;
	}

	let selectedChat = $derived(chats.find((c) => c.id === selectedChatId));
</script>

<!-- Loading Screen during restoration -->
{#if isRestoring}
	<div
		class="flex min-h-screen items-center justify-center bg-linear-to-br from-green-50 to-green-100 dark:from-slate-900 dark:to-slate-800"
	>
		<div class="text-center">
			<div
				class="mb-4 inline-flex h-16 w-16 animate-spin items-center justify-center rounded-full border-4 border-green-200 border-t-green-600 dark:border-slate-700 dark:border-t-cyan-400"
			></div>
			<p class="text-gray-600 dark:text-slate-300">データを復元中...</p>
		</div>
	</div>
{:else if !isDataLoaded}
	<FileUpload onComplete={handleUploadComplete} />
{:else}
	{#if showSplash}
		<SplashScreen onComplete={handleSplashComplete} duration={1800} />
	{/if}

	{#if appReady}
		<div
			class="flex h-full w-full overflow-hidden bg-white font-sans text-gray-800 dark:bg-slate-900 dark:text-slate-100"
		>
			{#if isMobile}
				{#if selectedChat}
					<div class="h-full w-full overflow-hidden">
						<ChatDetail
							chat={selectedChat}
							{messages}
							loading={loadingMessages}
							externalHighlightMessageId={pendingHighlightMessageId}
							onExternalHighlightHandled={handleExternalHighlightHandled}
							onBack={handleBack}
						/>
					</div>
				{:else}
					<div class="h-full w-full overflow-hidden">
						<ChatList
							{chats}
							{selectedChatId}
							onselect={handleChatSelect}
							onReset={handleReset}
							fullWidth={true}
						/>
					</div>
				{/if}
			{:else}
				<div class="h-full shrink-0 overflow-hidden">
					<ChatList {chats} {selectedChatId} onselect={handleChatSelect} onReset={handleReset} />
				</div>

				<div class="relative h-full min-w-0 flex-1">
					{#if selectedChat}
						<ChatDetail
							chat={selectedChat}
							{messages}
							loading={loadingMessages}
							externalHighlightMessageId={pendingHighlightMessageId}
							onExternalHighlightHandled={handleExternalHighlightHandled}
						/>
					{:else}
						<div
							class="flex h-full flex-col items-center justify-center bg-gray-50 text-gray-400 dark:bg-slate-800 dark:text-slate-400"
						>
							<div class="mb-4 text-6xl">💬</div>
							<p>チャットを選択してください</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
{/if}

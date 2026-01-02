<script lang="ts">
	import Icon from '@iconify/svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { ChatRoom, Message } from '$lib/schema';
	import {
		exportAllChatsAsText,
		exportAllChatsAsCSV,
		downloadFile,
		generateAllExportFilename,
		type ExportOptions
	} from '$lib/services/export';
	import { databaseService } from '$lib/services';

	interface Props {
		chats: ChatRoom[];
		onClose: () => void;
	}

	let { chats, onClose }: Props = $props();
	let exporting = $state(false);
	let exportSuccess = $state(false);
	let progress = $state(0);
	let currentChatName = $state('');

	// Export options
	let includeMid = $state(false);
	let stickerAsCdnUrl = $state(false);

	function getExportOptions(): ExportOptions {
		return {
			includeMid,
			stickerAsCdnUrl
		};
	}

	// Cache for messages
	const messagesCache = new SvelteMap<string, Message[]>();

	async function loadAllMessages(): Promise<void> {
		messagesCache.clear();
		progress = 0;

		for (let i = 0; i < chats.length; i++) {
			const chat = chats[i];
			currentChatName = chat.name;

			// Load messages with a high limit to get all
			const messages = await databaseService.getMessages(chat.id, 100000, 0);
			messagesCache.set(chat.id, messages);

			progress = Math.round(((i + 1) / chats.length) * 100);
		}
	}

	function getMessagesFromCache(chatId: string): Message[] {
		return messagesCache.get(chatId) || [];
	}

	async function handleExportText() {
		exporting = true;
		try {
			await loadAllMessages();
			currentChatName = 'エクスポート中...';

			const content = exportAllChatsAsText(chats, getMessagesFromCache, '自分', getExportOptions());
			const filename = generateAllExportFilename('txt');
			downloadFile(content, filename, 'text/plain');

			exportSuccess = true;
			setTimeout(() => {
				onClose();
			}, 1000);
		} catch (error) {
			console.error('Export failed:', error);
		} finally {
			exporting = false;
		}
	}

	async function handleExportCSV() {
		exporting = true;
		try {
			await loadAllMessages();
			currentChatName = 'エクスポート中...';

			const content = exportAllChatsAsCSV(chats, getMessagesFromCache, '自分', getExportOptions());
			const filename = generateAllExportFilename('csv');
			downloadFile(content, filename, 'text/csv');

			exportSuccess = true;
			setTimeout(() => {
				onClose();
			}, 1000);
		} catch (error) {
			console.error('Export failed:', error);
		} finally {
			exporting = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !exporting) {
			onClose();
		}
	}

	// Calculate total message count (estimated)
	const totalChats = $derived(chats.length);
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal Backdrop -->
<div
	class="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
	role="dialog"
	aria-modal="true"
	aria-label="全トーク履歴をエクスポート"
>
	<!-- Backdrop click to close -->
	{#if !exporting}
		<button
			type="button"
			class="absolute inset-0 cursor-default border-0 bg-transparent"
			onclick={onClose}
			aria-label="閉じる"
		></button>
	{/if}

	<!-- Modal Content -->
	<div
		class="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
			<h3 class="text-lg font-bold text-gray-800">全トーク履歴をエクスポート</h3>
			{#if !exporting}
				<button
					type="button"
					class="rounded-full p-1 transition-colors hover:bg-gray-100"
					onclick={onClose}
					aria-label="閉じる"
				>
					<Icon icon="mdi:close" class="h-6 w-6 text-gray-500" />
				</button>
			{/if}
		</div>

		<!-- Content -->
		<div class="p-4">
			<div class="mb-4 rounded-lg bg-gray-50 p-3">
				<div class="flex items-center gap-2 text-sm text-gray-600">
					<Icon icon="mdi:chat-multiple" class="h-5 w-5" />
					<span class="font-medium">全{totalChats}件のトーク</span>
				</div>
				<p class="mt-1 text-xs text-gray-500">すべてのトーク履歴を一括でエクスポートします</p>
			</div>

			{#if !exporting}
				<!-- Export Options -->
				<div class="mb-4 space-y-2">
					<p class="text-sm font-medium text-gray-700">エクスポートオプション</p>
					<label class="flex cursor-pointer items-center gap-2">
						<input
							type="checkbox"
							bind:checked={includeMid}
							class="h-4 w-4 rounded border-gray-300 text-[#06C755] focus:ring-[#06C755]"
						/>
						<span class="text-sm text-gray-600">MID（メンバーID）を含める</span>
					</label>
					<label class="flex cursor-pointer items-center gap-2">
						<input
							type="checkbox"
							bind:checked={stickerAsCdnUrl}
							class="h-4 w-4 rounded border-gray-300 text-[#06C755] focus:ring-[#06C755]"
						/>
						<span class="text-sm text-gray-600">スタンプをCDN URLに置換</span>
					</label>
				</div>

				<p class="mb-4 text-sm text-gray-600">エクスポート形式を選択してください</p>

				<div class="space-y-3">
					<!-- Text Export Button -->
					<button
						type="button"
						class="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-[#06C755] hover:bg-green-50"
						onclick={handleExportText}
					>
						<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#06C755]/10">
							<Icon icon="mdi:file-document-outline" class="h-6 w-6 text-[#06C755]" />
						</div>
						<div class="flex-1">
							<div class="font-medium text-gray-800">テキスト形式 (.txt)</div>
							<div class="text-xs text-gray-500">LINE公式エクスポート形式</div>
						</div>
						<Icon icon="mdi:download" class="h-5 w-5 text-gray-400" />
					</button>

					<!-- CSV Export Button -->
					<button
						type="button"
						class="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-[#06C755] hover:bg-green-50"
						onclick={handleExportCSV}
					>
						<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
							<Icon icon="mdi:file-delimited-outline" class="h-6 w-6 text-blue-500" />
						</div>
						<div class="flex-1">
							<div class="font-medium text-gray-800">CSV形式 (.csv)</div>
							<div class="text-xs text-gray-500">Excel・スプレッドシート向け</div>
						</div>
						<Icon icon="mdi:download" class="h-5 w-5 text-gray-400" />
					</button>
				</div>
			{:else}
				<!-- Progress -->
				<div class="space-y-3">
					<div class="text-center text-sm text-gray-600">メッセージを読み込み中...</div>
					<div class="h-2 overflow-hidden rounded-full bg-gray-200">
						<div
							class="h-full bg-[#06C755] transition-all duration-300"
							style="width: {progress}%"
						></div>
					</div>
					<div class="flex justify-between text-xs text-gray-500">
						<span class="max-w-48 truncate">{currentChatName}</span>
						<span>{progress}%</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		{#if !exporting}
			<div class="border-t border-gray-200 px-4 py-3">
				<button
					type="button"
					class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
					onclick={onClose}
				>
					キャンセル
				</button>
			</div>
		{/if}

		<!-- Export Success Toast -->
		{#if exportSuccess}
			<div
				class="absolute bottom-20 left-1/2 -translate-x-1/2 transform rounded-full bg-gray-800 px-4 py-2 text-sm text-white shadow-lg"
			>
				<div class="flex items-center gap-2">
					<Icon icon="mdi:check" class="h-4 w-4" />
					エクスポートしました
				</div>
			</div>
		{/if}
	</div>
</div>

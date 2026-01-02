<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { ChatRoom, Message } from '$lib/schema';
	import {
		exportAsText,
		exportAsCSV,
		downloadFile,
		generateExportFilename
	} from '$lib/services/export';

	interface Props {
		chat: ChatRoom;
		messages: Message[];
		onClose: () => void;
	}

	let { chat, messages, onClose }: Props = $props();
	let exporting = $state(false);
	let exportSuccess = $state(false);

	async function handleExportText() {
		exporting = true;
		try {
			const content = exportAsText(chat, messages);
			const filename = generateExportFilename(chat.name, 'txt');
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
			const content = exportAsCSV(chat, messages);
			const filename = generateExportFilename(chat.name, 'csv');
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
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal Backdrop -->
<div
	class="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
	role="dialog"
	aria-modal="true"
	aria-label="トーク履歴をエクスポート"
>
	<!-- Backdrop click to close -->
	<button
		type="button"
		class="absolute inset-0 cursor-default border-0 bg-transparent"
		onclick={onClose}
		aria-label="閉じる"
	></button>

	<!-- Modal Content -->
	<div
		class="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
			<h3 class="text-lg font-bold text-gray-800">トーク履歴をエクスポート</h3>
			<button
				type="button"
				class="rounded-full p-1 transition-colors hover:bg-gray-100"
				onclick={onClose}
				aria-label="閉じる"
			>
				<Icon icon="mdi:close" class="h-6 w-6 text-gray-500" />
			</button>
		</div>

		<!-- Content -->
		<div class="p-4">
			<div class="mb-4 rounded-lg bg-gray-50 p-3">
				<div class="flex items-center gap-2 text-sm text-gray-600">
					<Icon icon="mdi:chat" class="h-5 w-5" />
					<span class="font-medium">{chat.name}</span>
				</div>
				<p class="mt-1 text-xs text-gray-500">{messages.length}件のメッセージ</p>
			</div>

			<p class="mb-4 text-sm text-gray-600">エクスポート形式を選択してください</p>

			<div class="space-y-3">
				<!-- Text Export Button -->
				<button
					type="button"
					class="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-[#06C755] hover:bg-green-50"
					onclick={handleExportText}
					disabled={exporting}
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
					disabled={exporting}
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
		</div>

		<!-- Footer -->
		<div class="border-t border-gray-200 px-4 py-3">
			<button
				type="button"
				class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
				onclick={onClose}
			>
				キャンセル
			</button>
		</div>

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

		<!-- Loading Overlay -->
		{#if exporting}
			<div class="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
				<div class="flex flex-col items-center gap-2">
					<span class="loading loading-spinner loading-md text-[#06C755]"></span>
					<span class="text-sm text-gray-600">エクスポート中...</span>
				</div>
			</div>
		{/if}
	</div>
</div>

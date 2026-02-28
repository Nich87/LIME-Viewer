<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Message } from '$lib/schema';

	interface Props {
		messages: Message[];
		onClose: () => void;
	}

	let { messages, onClose }: Props = $props();
	let copied = $state(false);

	// Format messages for display and copy
	const formattedText = $derived(
		messages
			.map((m) => {
				if (messages.length === 1) {
					return m.content || '';
				}
				const name = m.isMe ? '自分' : m.fromName || '相手';
				const time = new Date(m.timestamp).toLocaleTimeString([], {
					hour: '2-digit',
					minute: '2-digit'
				});
				const content = m.content || '（メディアメッセージ）';
				return `[${time}] ${name}: ${content}`;
			})
			.join('\n')
	);

	async function copySelection() {
		const selection = window.getSelection();
		if (selection && selection.toString().trim()) {
			try {
				await navigator.clipboard.writeText(selection.toString());
				copied = true;
				setTimeout(() => {
					copied = false;
					onClose();
				}, 1000);
			} catch {
				console.error('コピーに失敗しました');
			}
		}
	}

	async function copyAll() {
		try {
			await navigator.clipboard.writeText(formattedText);
			copied = true;
			setTimeout(() => {
				copied = false;
				onClose();
			}, 1000);
		} catch {
			console.error('コピーに失敗しました');
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
	aria-label="コピー"
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
		class="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700"
		>
			<h3 class="text-lg font-bold text-gray-800 dark:text-slate-100">
				コピー {messages.length > 1 ? `(${messages.length}件)` : ''}
			</h3>
			<button
				type="button"
				class="rounded-full p-1 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
				onclick={onClose}
				aria-label="閉じる"
			>
				<Icon icon="mdi:close" class="h-6 w-6 text-gray-500 dark:text-slate-300" />
			</button>
		</div>

		<!-- Instructions -->
		<div class="bg-gray-50 px-4 py-2 dark:bg-slate-800">
			<p class="text-sm text-gray-600 dark:text-slate-300">
				テキストを選択して部分コピー、またはすべてコピー
			</p>
		</div>

		<!-- Text Content Area -->
		<div class="flex-1 overflow-auto p-4">
			<div
				class="min-h-24 rounded-lg bg-gray-100 p-4 text-base leading-relaxed wrap-break-word whitespace-pre-wrap text-gray-800 select-text dark:bg-slate-800 dark:text-slate-100"
			>
				{formattedText || '（テキストがありません）'}
			</div>
		</div>

		<!-- Actions -->
		<div class="flex gap-2 border-t border-gray-200 p-4 dark:border-slate-700">
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#06C755] px-4 py-3 font-medium text-white transition-colors hover:bg-[#05b34d]"
				onclick={copyAll}
			>
				<Icon icon="mdi:content-copy" class="h-5 w-5" />
				すべてコピー
			</button>
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
				onclick={copySelection}
			>
				<Icon icon="mdi:content-cut" class="h-5 w-5" />
				選択部分をコピー
			</button>
		</div>

		<!-- Copy Success Toast -->
		{#if copied}
			<div
				class="absolute bottom-20 left-1/2 -translate-x-1/2 transform rounded-full bg-gray-800 px-4 py-2 text-sm text-white shadow-lg"
			>
				<div class="flex items-center gap-2">
					<Icon icon="mdi:check" class="h-4 w-4" />
					コピーしました
				</div>
			</div>
		{/if}
	</div>
</div>

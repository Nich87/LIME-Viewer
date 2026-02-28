<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { toPng } from 'html-to-image';

	interface Props {
		targetElement: HTMLElement;
		onClose: () => void;
	}

	let { targetElement, onClose }: Props = $props();

	let processing = $state(false);
	let previewUrl = $state<string | null>(null);
	let useRandomName = $state(false);
	let customFileName = $state('screenshot');
	let error = $state<string | null>(null);

	onMount(() => {
		generatePreview();
	});

	async function generatePreview() {
		processing = true;
		error = null;

		try {
			// Wait for layout to stabilize
			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => requestAnimationFrame(resolve));

			// Use html-to-image for better flexbox support
			// targetElement is already a styled container created by ChatDetail
			const dataUrl = await toPng(targetElement, {
				backgroundColor: document.documentElement.classList.contains('dark')
					? '#1e293b'
					: '#96C2CF',
				pixelRatio: 2
			});

			previewUrl = dataUrl;
		} catch (e) {
			console.error('Screenshot generation failed:', e);
			error = 'スクリーンショットの生成に失敗しました';
		} finally {
			processing = false;
		}
	}

	function generateRandomName(): string {
		const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
		let result = '';
		for (let i = 0; i < 12; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}

	async function downloadScreenshot() {
		if (!previewUrl) return;

		const fileName = useRandomName ? generateRandomName() : customFileName || 'screenshot';

		const link = document.createElement('a');
		link.href = previewUrl;
		link.download = `${fileName}.png`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		onClose();
	}

	async function copyToClipboard() {
		if (!previewUrl) return;

		try {
			const response = await fetch(previewUrl);
			const blob = await response.blob();
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
			onClose();
		} catch (e) {
			console.error('Failed to copy to clipboard:', e);
			error = 'クリップボードへのコピーに失敗しました';
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
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
	role="dialog"
	aria-modal="true"
	aria-label="スクリーンショット"
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
		class="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700"
		>
			<h3 class="text-lg font-bold text-gray-800 dark:text-slate-100">スクリーンショット</h3>
			<button
				type="button"
				class="rounded-full p-1 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
				onclick={onClose}
				aria-label="閉じる"
			>
				<Icon icon="mdi:close" class="h-6 w-6 text-gray-500 dark:text-slate-300" />
			</button>
		</div>

		<!-- Preview Area -->
		<div class="flex-1 overflow-auto bg-gray-100 p-4 dark:bg-slate-800">
			{#if processing}
				<div class="flex h-48 items-center justify-center">
					<div class="flex flex-col items-center gap-3">
						<div
							class="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-[#06C755]"
						></div>
						<span class="text-sm text-gray-600 dark:text-slate-300">生成中...</span>
					</div>
				</div>
			{:else if error}
				<div class="flex h-48 items-center justify-center">
					<div class="flex flex-col items-center gap-3 text-red-500">
						<Icon icon="mdi:alert-circle" class="h-10 w-10" />
						<span class="text-sm">{error}</span>
						<button
							type="button"
							class="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
							onclick={generatePreview}
						>
							再試行
						</button>
					</div>
				</div>
			{:else if previewUrl}
				<div class="flex justify-center">
					<img
						src={previewUrl}
						alt="スクリーンショットプレビュー"
						class="max-w-full rounded-lg border border-gray-300 shadow-md dark:border-slate-600"
					/>
				</div>
			{/if}
		</div>

		<!-- Options -->
		<div class="border-t border-gray-200 p-4 dark:border-slate-700">
			<!-- Random Name Option -->
			<div class="mb-4">
				<label class="flex cursor-pointer items-center gap-3">
					<input
						type="checkbox"
						class="h-5 w-5 rounded border-gray-300 text-[#06C755] focus:ring-[#06C755]"
						bind:checked={useRandomName}
					/>
					<span class="text-sm text-gray-700 dark:text-slate-200">ランダムなファイル名を使用</span>
				</label>
			</div>

			<!-- Custom File Name -->
			{#if !useRandomName}
				<div class="mb-4">
					<label class="block text-sm text-gray-600 dark:text-slate-300">
						ファイル名
						<input
							type="text"
							class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:border-[#06C755] focus:ring-1 focus:ring-[#06C755] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
							bind:value={customFileName}
							placeholder="screenshot"
						/>
					</label>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex gap-2">
				<button
					type="button"
					class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-200 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-300 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
					onclick={copyToClipboard}
					disabled={processing || !previewUrl}
				>
					<Icon icon="mdi:content-copy" class="h-5 w-5" />
					コピー
				</button>
				<button
					type="button"
					class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#06C755] px-4 py-3 font-medium text-white transition-colors hover:bg-[#05b34d] disabled:opacity-50"
					onclick={downloadScreenshot}
					disabled={processing || !previewUrl}
				>
					<Icon icon="mdi:download" class="h-5 w-5" />
					保存
				</button>
			</div>
		</div>
	</div>
</div>

<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		visible: boolean;
		onCopy: () => void;
		onScreenshot: () => void;
		onClose: () => void;
		selectedCount?: number;
	}

	let { visible, onCopy, onScreenshot, onClose, selectedCount = 1 }: Props = $props();
</script>

{#if visible}
	<!-- Bottom Action Bar -->
	<div
		class="fixed inset-x-0 bottom-0 z-50 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
		style="padding-bottom: env(safe-area-inset-bottom);"
	>
		<!-- Selection Info -->
		<div class="flex items-center justify-between border-b border-[--line-border] px-4 py-2">
			<span class="text-sm text-[--line-text-subtle]">範囲が選択されました。</span>
			<button
				type="button"
				class="line-icon-button flex h-8 w-8 items-center justify-center text-[--line-text-soft]"
				onclick={onClose}
				aria-label="選択解除"
			>
				<Icon icon="mdi:close" class="h-5 w-5" />
			</button>
		</div>

		<!-- Action Buttons -->
		<div class="grid grid-cols-2 gap-3 p-3">
			<!-- コピー -->
			<button
				type="button"
				class="flex min-w-0 items-center justify-center gap-2 rounded-[14px] border border-[--line-border-strong] bg-white px-4 py-3 font-medium text-[--line-text-subtle] transition-colors hover:bg-[--line-surface-press]"
				onclick={onCopy}
			>
				<Icon icon="mdi:content-copy" class="h-5 w-5" />
				<span class="truncate">コピー</span>
			</button>

			<!-- スクショ -->
			<button
				type="button"
				class="flex min-w-0 items-center justify-center gap-2 rounded-[14px] px-4 py-3 font-medium shadow-[0_6px_16px_rgba(6,199,85,0.22)] transition-opacity hover:opacity-90"
				style="background-color: var(--line-brand); color: #ffffff;"
				onclick={onScreenshot}
			>
				<Icon icon="mdi:cellphone-screenshot" class="h-5 w-5" />
				<span class="truncate">スクショ ({selectedCount})</span>
			</button>
		</div>
	</div>
{/if}

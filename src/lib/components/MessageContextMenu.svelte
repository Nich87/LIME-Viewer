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
	<div class="fixed inset-x-0 bottom-0 z-50 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
		<!-- Selection Info -->
		<div class="flex items-center justify-between border-b border-gray-200 px-4 py-2">
			<span class="text-sm text-gray-600">範囲が選択されました。</span>
			<button
				type="button"
				class="rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100"
				onclick={onClose}
				aria-label="選択解除"
			>
				<Icon icon="mdi:close" class="h-5 w-5" />
			</button>
		</div>

		<!-- Action Buttons -->
		<div class="flex gap-3 p-3">
			<!-- コピー -->
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
				onclick={onCopy}
			>
				<Icon icon="mdi:content-copy" class="h-5 w-5" />
				コピー
			</button>

			<!-- スクショ -->
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#00B4C5] px-4 py-3 font-medium text-white transition-colors hover:bg-[#009DAD]"
				onclick={onScreenshot}
			>
				<Icon icon="mdi:cellphone-screenshot" class="h-5 w-5" />
				スクショ ({selectedCount})
			</button>
		</div>
	</div>
{/if}

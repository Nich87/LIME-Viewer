<!--
	ImagePreview: Full-screen image preview with swipe, zoom, keyboard navigation, and gallery support.
	Disables swipe during zoom and switches to drag for panning to prevent accidental navigation.
-->
<script lang="ts">
	import Icon from '@iconify/svelte';
	import { SWIPE_THRESHOLD } from '$lib/constants';

	interface ImageInfo {
		url: string;
		senderName?: string;
		timestamp?: number;
	}

	interface Props {
		imageUrl: string;
		senderName?: string;
		timestamp?: number;
		onClose: () => void;
		onPrevious?: () => void;
		onNext?: () => void;
		hasPrevious?: boolean;
		hasNext?: boolean;
		currentIndex?: number;
		totalCount?: number;
		allImages?: ImageInfo[];
		onSelectImage?: (index: number) => void;
	}

	let {
		imageUrl,
		senderName = '',
		timestamp,
		onClose,
		onPrevious,
		onNext,
		hasPrevious = false,
		hasNext = false,
		currentIndex = 0,
		totalCount = 0,
		allImages = [],
		onSelectImage
	}: Props = $props();

	// Gallery modal allows direct jumping from the image list
	let showGallery = $state(false);

	// Format date/time with Japanese AM/PM notation
	function formatDateTime(ts: number): string {
		const date = new Date(ts);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = date.getHours();
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const period = hours >= 12 ? '午後' : '午前';
		const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;

		return `${year}.${month}.${day} ${period}${displayHour}:${minutes}`;
	}

	// Fetch blob and use as download link
	async function downloadImage() {
		try {
			const response = await fetch(imageUrl);
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `image_${Date.now()}.jpg`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch {
			// If fetch fails, open in new tab
			window.open(imageUrl, '_blank');
		}
	}

	// Use Web Share API to invoke OS share dialog
	async function shareImage() {
		try {
			const response = await fetch(imageUrl);
			const blob = await response.blob();
			const file = new File([blob], `image_${Date.now()}.jpg`, { type: 'image/jpeg' });

			await navigator.share({
				files: [file],
				title: 'LINE画像',
				text: senderName ? `${senderName}からの画像` : '画像'
			});
		} catch (err) {
			// Ignore user cancel (AbortError)
			if (err instanceof Error && err.name !== 'AbortError') console.error('Share failed:', err);
		}
	}

	// Track swipe distance and navigate when threshold exceeded
	let touchStartX = $state(0);
	let touchStartY = $state(0);
	let touchEndX = $state(0);
	let isSwiping = $state(false);

	function handleTouchStart(event: TouchEvent) {
		// Disable swipe when zoomed - prioritize panning
		if (scale > 1) return;
		touchStartX = event.touches[0].clientX;
		touchStartY = event.touches[0].clientY;
		touchEndX = touchStartX;
		isSwiping = true;
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isSwiping || scale > 1) return;
		touchEndX = event.touches[0].clientX;

		// If horizontal movement is dominant, prevent scroll and prioritize swipe
		const deltaX = Math.abs(touchEndX - touchStartX);
		const deltaY = Math.abs(event.touches[0].clientY - touchStartY);
		if (deltaX > deltaY && deltaX > 10) event.preventDefault();
	}

	function handleTouchEnd() {
		if (!isSwiping || scale > 1) return;
		isSwiping = false;

		const deltaX = touchEndX - touchStartX;

		// Navigate when exceeding threshold to prevent accidental taps
		if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
			if (deltaX > 0 && hasPrevious && onPrevious) {
				// Swipe right -> previous image
				onPrevious();
			} else if (deltaX < 0 && hasNext && onNext) {
				// Swipe left -> next image
				onNext();
			}
		}
	}

	// Toggle gallery view
	function toggleGallery() {
		showGallery = !showGallery;
	}

	// Select image from gallery
	function selectFromGallery(index: number) {
		if (onSelectImage) onSelectImage(index);
		showGallery = false;
	}

	// Keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'Escape':
				onClose();
				break;
			case 'ArrowLeft':
				if (hasPrevious && onPrevious) onPrevious();
				break;
			case 'ArrowRight':
				if (hasNext && onNext) onNext();
				break;
		}
	}

	// Zoom functionality: pinch/wheel up to 3x (scale=1 is normal size)
	let scale = $state(1);
	let translateX = $state(0);
	let translateY = $state(0);
	let isDragging = $state(false);
	let startX = $state(0);
	let startY = $state(0);

	// Determine zoom in/out from wheel direction
	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		const delta = event.deltaY > 0 ? -0.1 : 0.1;
		scale = Math.min(Math.max(0.5, scale + delta), 3);
	}

	// Pan with drag only when zoomed, using pointer capture for tracking outside element
	function handlePointerDown(event: PointerEvent) {
		if (scale > 1) {
			isDragging = true;
			startX = event.clientX - translateX;
			startY = event.clientY - translateY;
			(event.target as HTMLElement).setPointerCapture(event.pointerId);
		}
	}

	function handlePointerMove(event: PointerEvent) {
		if (isDragging) {
			translateX = event.clientX - startX;
			translateY = event.clientY - startY;
		}
	}

	function handlePointerUp() {
		isDragging = false;
	}

	function resetZoom() {
		scale = 1;
		translateX = 0;
		translateY = 0;
	}

	// Double tap/click to toggle between 2x and normal size
	function toggleZoom() {
		if (scale === 1) {
			scale = 2;
		} else {
			resetZoom();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Full screen overlay -->
<div
	class="fixed inset-0 z-50 flex flex-col bg-black"
	role="dialog"
	aria-modal="true"
	aria-label="画像プレビュー"
>
	<!-- Header -->
	<div
		class="absolute top-0 right-0 left-0 z-20 flex items-center justify-between bg-linear-to-b from-black/70 to-transparent px-4 py-3"
	>
		<div class="flex items-center">
			<button
				type="button"
				class="mr-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-white transition-colors hover:bg-white/20"
				onclick={onClose}
				aria-label="閉じる"
			>
				<Icon icon="mdi:chevron-left" class="h-7 w-7" />
			</button>
			<div class="flex flex-col">
				{#if senderName}
					<span class="text-base font-medium text-white">{senderName}</span>
				{/if}
				{#if timestamp}
					<span class="text-sm text-gray-300">{formatDateTime(timestamp)}</span>
				{/if}
			</div>
		</div>

		<!-- Header actions -->
		<div class="flex items-center space-x-2">
			{#if totalCount > 1}
				<span class="mr-2 text-sm text-white">{currentIndex + 1} / {totalCount}</span>
			{/if}
			{#if allImages.length > 1}
				<button
					type="button"
					class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-white transition-colors hover:bg-white/20"
					onclick={toggleGallery}
					aria-label="グリッド表示"
				>
					<Icon icon="mdi:grid" class="h-5 w-5" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Image container -->
	<div
		class="relative flex flex-1 items-center justify-center overflow-hidden"
		onwheel={handleWheel}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		ontouchcancel={handleTouchEnd}
		role="group"
		aria-label="画像プレビュー操作エリア"
	>
		<!-- Navigation buttons -->
		{#if hasPrevious && onPrevious}
			<button
				type="button"
				class="absolute left-4 z-10 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-0 bg-black/50 text-white transition-colors hover:bg-black/70"
				onclick={onPrevious}
				aria-label="前の画像"
			>
				<Icon icon="mdi:chevron-left" class="h-8 w-8" />
			</button>
		{/if}

		{#if hasNext && onNext}
			<button
				type="button"
				class="absolute right-4 z-10 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-0 bg-black/50 text-white transition-colors hover:bg-black/70"
				onclick={onNext}
				aria-label="次の画像"
			>
				<Icon icon="mdi:chevron-right" class="h-8 w-8" />
			</button>
		{/if}

		<!-- Image -->
		<img
			src={imageUrl}
			alt="プレビュー"
			class="max-h-full max-w-full object-contain transition-transform duration-100 {isDragging
				? 'cursor-grabbing'
				: scale > 1
					? 'cursor-grab'
					: 'cursor-zoom-in'}"
			style="transform: scale({scale}) translate({translateX / scale}px, {translateY / scale}px);"
			onload={resetZoom}
			ondblclick={toggleZoom}
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
			draggable="false"
		/>
	</div>

	<!-- Footer actions -->
	<div
		class="absolute right-0 bottom-0 left-0 z-20 flex items-center justify-center gap-16 bg-linear-to-t from-black/70 to-transparent px-4 py-6"
	>
		<button
			type="button"
			class="flex cursor-pointer flex-col items-center border-0 bg-transparent text-white transition-opacity hover:opacity-80"
			onclick={shareImage}
			aria-label="共有"
		>
			<Icon icon="mdi:share-variant-outline" class="h-6 w-6" />
		</button>

		<button
			type="button"
			class="flex cursor-pointer flex-col items-center border-0 bg-transparent text-white transition-opacity hover:opacity-80"
			onclick={downloadImage}
			aria-label="ダウンロード"
		>
			<Icon icon="mdi:download-outline" class="h-6 w-6" />
		</button>
	</div>
</div>

<!-- Gallery Modal -->
{#if showGallery}
	<div
		class="fixed inset-0 z-60 flex flex-col bg-black/95"
		role="dialog"
		aria-modal="true"
		aria-label="画像一覧"
	>
		<!-- Gallery Header -->
		<div class="flex h-14 shrink-0 items-center justify-between px-4">
			<button
				type="button"
				class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-white transition-colors hover:bg-white/20"
				onclick={toggleGallery}
				aria-label="閉じる"
			>
				<Icon icon="mdi:close" class="h-6 w-6" />
			</button>
			<span class="text-white">画像一覧 ({allImages.length}枚)</span>
			<div class="w-10"></div>
		</div>

		<!-- Gallery Grid -->
		<div class="flex-1 overflow-y-auto p-2">
			<div class="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
				{#each allImages as img, i (i)}
					<button
						type="button"
						class="relative aspect-square cursor-pointer overflow-hidden border-0 bg-gray-800 p-0 {i ===
						currentIndex
							? 'ring-2 ring-[#06C755]'
							: ''}"
						onclick={() => selectFromGallery(i)}
					>
						<img
							src={img.url}
							alt="画像 {i + 1}"
							class="h-full w-full object-cover"
							loading="lazy"
						/>
						{#if i === currentIndex}
							<div class="absolute inset-0 bg-[#06C755]/20"></div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

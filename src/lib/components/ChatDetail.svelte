<script lang="ts">
	import { tick, onMount, onDestroy } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import Icon from '@iconify/svelte';
	import type { ChatRoom, Message } from '$lib/schema';
	import { createImagePreviewManager } from '$lib/hooks';
	import MessageBubble from './MessageBubble.svelte';
	import ImagePreview from './ImagePreview.svelte';
	import SearchPanel from './SearchPanel.svelte';
	import CalendarModal from './CalendarModal.svelte';
	import MessageContextMenu from './MessageContextMenu.svelte';
	import PartialCopyModal from './PartialCopyModal.svelte';
	import ScreenshotModal from './ScreenshotModal.svelte';

	interface Props {
		chat: ChatRoom;
		messages?: Message[];
		loading?: boolean;
		onBack?: () => void;
	}

	let { chat, messages = [], loading = false, onBack }: Props = $props();

	const imageMessages = $derived(
		messages.filter((m) => m.attachment?.type === 'image' && m.attachment?.url)
	);

	const imagePreview = createImagePreviewManager(() => imageMessages);

	onMount(() => {
		window.addEventListener('popstate', imagePreview.handlePopState);
	});

	onDestroy(() => {
		window.removeEventListener('popstate', imagePreview.handlePopState);
	});

	let viewport: HTMLElement | undefined = $state();
	let shouldScrollBottom = $state(true);

	// Search state
	let showSearch = $state(false);
	let showCalendar = $state(false);
	let highlightedMessageId: number | null = $state(null);
	let messageElements: Map<number, HTMLElement> = $state(new Map());
	let dateSeparatorElements: Map<number, HTMLElement> = $state(new Map()); // Key: message index

	// Message selection state
	let selectedMessageIds = new SvelteSet<number>();
	let selectionMode = $state(false);
	let showPartialCopyModal = $state(false);
	let showScreenshotModal = $state(false);
	let screenshotTarget: HTMLElement | null = $state(null);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;

	// Helper for date separators
	function getDateString(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleDateString([], {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			weekday: 'short'
		});
	}

	// Reset scroll position on chat change
	$effect(() => {
		const _currentChat = chat; // Track as dependency
		void _currentChat;
		shouldScrollBottom = true;
		showSearch = false;
		showCalendar = false;
		highlightedMessageId = null;
		clearSelection();
	});

	// Auto scroll control
	$effect(() => {
		const _currentMessages = messages; // Track as dependency
		void _currentMessages;
		if (shouldScrollBottom && viewport) {
			tick().then(() => {
				if (viewport) viewport.scrollTop = viewport.scrollHeight;
				shouldScrollBottom = false;
			});
		}
	});

	// Register message element for scrolling using Svelte action
	function registerMessageRef(element: HTMLElement, id: number) {
		messageElements.set(id, element);
		return {
			destroy() {
				messageElements.delete(id);
			}
		};
	}

	// Register date separator element using Svelte action
	function registerDateSeparatorRef(element: HTMLElement, index: number) {
		dateSeparatorElements.set(index, element);
		return {
			destroy() {
				dateSeparatorElements.delete(index);
			}
		};
	}

	// Scroll to a specific message
	function scrollToMessage(messageId: number) {
		highlightedMessageId = messageId;
		tick().then(() => {
			const element = messageElements.get(messageId);
			if (element && viewport) {
				element.scrollIntoView({ behavior: 'smooth', block: 'center' });
				// Remove highlight after animation
				setTimeout(() => {
					highlightedMessageId = null;
				}, 2000);
			}
		});
	}

	// Handle search result selection
	function handleSearchResult(messageId: number | null) {
		if (messageId) scrollToMessage(messageId);
	}

	// Handle date selection from calendar
	function handleDateSelect(date: Date) {
		const targetDateStr = date.toDateString();
		// Find the first message on the selected date
		const targetMessage = messages.find((msg) => {
			const msgDate = new Date(msg.timestamp);
			return msgDate.toDateString() === targetDateStr;
		});

		if (targetMessage) scrollToMessage(targetMessage.id);
	}

	function openSearch() {
		showSearch = true;
	}

	function closeSearch() {
		showSearch = false;
		highlightedMessageId = null;
	}

	function openCalendar() {
		showCalendar = true;
	}

	function closeCalendar() {
		showCalendar = false;
	}

	// Message selection functions
	function clearSelection() {
		selectedMessageIds.clear();
		selectionMode = false;
	}

	// Check if previous/next message is also selected (for continuous background)
	function isPrevMessageSelected(index: number): boolean {
		if (index <= 0) return false;
		return selectedMessageIds.has(messages[index - 1].id);
	}

	function isNextMessageSelected(index: number): boolean {
		if (index >= messages.length - 1) return false;
		return selectedMessageIds.has(messages[index + 1].id);
	}

	function getSelectionClasses(index: number, isSelected: boolean): string {
		if (!isSelected) return '';

		const prevSelected = isPrevMessageSelected(index);
		const nextSelected = isNextMessageSelected(index);

		let classes = 'bg-sky-300/50 -mx-4 px-4';

		if (prevSelected && nextSelected) {
			// Middle of selection - no rounding, overlap margins
			classes += ' -my-0.5 py-0.5';
		} else if (prevSelected) {
			// Last in selection - round bottom
			classes += ' rounded-b-2xl -mt-0.5 pt-0.5 pb-2';
		} else if (nextSelected) {
			// First in selection - round top
			classes += ' rounded-t-2xl pt-2 -mb-0.5 pb-0.5';
		} else {
			// Single selection - round all
			classes += ' rounded-2xl py-2';
		}

		return classes;
	}

	function toggleMessageSelection(messageId: number) {
		if (selectedMessageIds.has(messageId)) {
			selectedMessageIds.delete(messageId);
		} else {
			// Check if adding this message would break continuity
			if (selectedMessageIds.size > 0) {
				const sortedMessages = messages
					.filter((m) => selectedMessageIds.has(m.id) || m.id === messageId)
					.map((m) => m.id);
				const messageIndices = sortedMessages.map((id) => messages.findIndex((m) => m.id === id));

				// Check if indices are continuous
				const sortedIndices = [...messageIndices].sort((a, b) => a - b);
				let isContinuous = true;
				for (let i = 1; i < sortedIndices.length; i++) {
					if (sortedIndices[i] - sortedIndices[i - 1] !== 1) {
						isContinuous = false;
						break;
					}
				}

				if (!isContinuous) {
					// Don't allow non-continuous selection
					return;
				}
			}
			selectedMessageIds.add(messageId);
		}

		if (selectedMessageIds.size === 0) {
			selectionMode = false;
		}
	}

	function handleMessagePointerDown(event: PointerEvent, messageId: number) {
		if (selectionMode) return;

		longPressTimer = setTimeout(() => {
			selectionMode = true;
			selectedMessageIds.clear();
			selectedMessageIds.add(messageId);
		}, 500);
	}

	function handleMessagePointerUp() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function handleMessagePointerLeave() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function handleMessageClick(event: MouseEvent, messageId: number) {
		if (selectionMode) {
			event.preventDefault();
			event.stopPropagation();
			toggleMessageSelection(messageId);
		}
	}

	// Get selected messages in order
	function getSelectedMessages(): Message[] {
		return messages.filter((m) => selectedMessageIds.has(m.id));
	}

	// Open copy modal with preview
	function handleCopyWithPreview() {
		showPartialCopyModal = true;
	}

	// Open screenshot modal
	function handleScreenshot() {
		// Get actual message elements from the viewport
		tick().then(() => {
			const selectedMsgs = getSelectedMessages();
			if (selectedMsgs.length === 0) return;

			// Find the first and last selected message indices
			const firstIndex = messages.findIndex((m) => selectedMsgs[0].id === m.id);
			const lastIndex = messages.findIndex(
				(m) => selectedMsgs[selectedMsgs.length - 1].id === m.id
			);

			// Get all elements between first and last selected message, including date separators
			const selectedElements: HTMLElement[] = [];
			for (let i = firstIndex; i <= lastIndex; i++) {
				// Check if there's a date separator before this message
				const dateSeparator = dateSeparatorElements.get(i);
				if (dateSeparator) {
					selectedElements.push(dateSeparator);
				}

				const element = messageElements.get(messages[i].id);
				if (element) {
					selectedElements.push(element);
				}
			}

			if (selectedElements.length > 0 && viewport) {
				// Create a wrapper that includes all selected message elements
				createScreenshotFromElements(selectedElements);
			}
		});
	}

	// Create screenshot from actual DOM elements
	function createScreenshotFromElements(elements: HTMLElement[]) {
		// Create a container that clones the actual message elements
		// Use fixed positioning within viewport but behind everything (z-index: -9999)
		const container = document.createElement('div');
		container.style.cssText = `
			position: fixed;
			left: 0;
			top: 0;
			z-index: -9999;
			pointer-events: none;
			width: ${viewport?.clientWidth || 400}px;
			background-color: #96C2CF;
			padding: 16px;
		`;

		// Clone each element and copy computed styles
		for (const element of elements) {
			const clone = element.cloneNode(true) as HTMLElement;

			// Copy computed styles from original to clone (skip the wrapper's background)
			copyComputedStyles(element, clone, true);

			// Remove selection highlight classes
			clone.classList.remove(
				'bg-sky-300/50',
				'-mx-4',
				'px-4',
				'-my-0.5',
				'py-0.5',
				'rounded-b-2xl',
				'-mt-0.5',
				'pt-0.5',
				'pb-2',
				'rounded-t-2xl',
				'pt-2',
				'-mb-0.5',
				'rounded-2xl',
				'py-2',
				'bg-yellow-200',
				'bg-opacity-50',
				'ring-2',
				'ring-yellow-400'
			);

			// Clear the wrapper's background but keep proper spacing for messages
			clone.style.backgroundColor = 'transparent';
			clone.style.background = 'none';
			clone.style.marginLeft = '0';
			clone.style.marginRight = '0';
			clone.style.marginTop = '0';
			clone.style.marginBottom = '16px'; // Keep spacing between messages (mb-4)
			clone.style.padding = '0';
			clone.style.border = 'none';
			clone.style.boxShadow = 'none';
			clone.style.borderRadius = '0';

			container.appendChild(clone);
		}

		// Remove margin from last element
		if (container.lastElementChild instanceof HTMLElement) {
			container.lastElementChild.style.marginBottom = '0';
		}

		document.body.appendChild(container);
		screenshotTarget = container;
		showScreenshotModal = true;
	}

	// Recursively copy computed styles from source to target
	function copyComputedStyles(source: HTMLElement, target: HTMLElement, isRoot = false) {
		const computedStyle = getComputedStyle(source);

		// For root element (message wrapper), we need to preserve the layout
		// but skip selection-related styles
		const stylesToCopy = isRoot
			? [
					'display',
					'flexDirection',
					'alignItems',
					'justifyContent',
					'gap',
					'width',
					'maxWidth',
					'marginBottom' // Keep margin for spacing between messages
				]
			: [
					'color',
					'backgroundColor',
					'background',
					'borderRadius',
					'borderWidth',
					'borderStyle',
					'borderColor',
					'padding',
					'paddingTop',
					'paddingRight',
					'paddingBottom',
					'paddingLeft',
					'margin',
					'marginTop',
					'marginRight',
					'marginBottom',
					'marginLeft',
					'fontSize',
					'fontFamily',
					'fontWeight',
					'lineHeight',
					'textAlign',
					'display',
					'flexDirection',
					'alignItems',
					'justifyContent',
					'gap',
					'width',
					'maxWidth',
					'minWidth',
					'height',
					'maxHeight',
					'minHeight',
					'boxShadow',
					'opacity',
					'overflow',
					'whiteSpace',
					'wordBreak'
				];

		for (const prop of stylesToCopy) {
			const value = computedStyle.getPropertyValue(prop);
			if (value) {
				// Convert oklch to rgba if needed
				const sanitizedValue = value.includes('oklch') ? convertOklchToRgba(value) : value;
				target.style.setProperty(prop, sanitizedValue);
			}
		}

		// Process children recursively (not root anymore)
		const sourceChildren = source.children;
		const targetChildren = target.children;
		for (let i = 0; i < sourceChildren.length && i < targetChildren.length; i++) {
			const sourceChild = sourceChildren[i];
			const targetChild = targetChildren[i];
			if (sourceChild instanceof HTMLElement && targetChild instanceof HTMLElement) {
				copyComputedStyles(sourceChild, targetChild, false);
			}
		}
	}

	// Convert oklch color to rgba
	function convertOklchToRgba(value: string): string {
		const match = value.match(
			/oklch\(\s*([0-9.]+)(%?)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+)(%?))?\s*\)/i
		);
		if (!match) return value;

		const [, lRaw, lPct, cRaw, hRaw, aRaw, aPct] = match;
		const L = lPct ? parseFloat(lRaw) / 100 : parseFloat(lRaw);
		const C = parseFloat(cRaw);
		const hDeg = parseFloat(hRaw);
		const alphaRaw = aRaw ? parseFloat(aRaw) : 1;
		const alpha = aPct ? alphaRaw / 100 : alphaRaw;
		const hRad = (hDeg * Math.PI) / 180;

		const a = Math.cos(hRad) * C;
		const b = Math.sin(hRad) * C;

		const l_ = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
		const m_ = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
		const s_ = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);

		let r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
		let g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
		let bVal = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;

		const clamp = (x: number) => Math.min(1, Math.max(0, x));
		const toSrgb = (x: number) =>
			x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;

		r = clamp(toSrgb(r));
		g = clamp(toSrgb(g));
		bVal = clamp(toSrgb(bVal));

		return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(bVal * 255)}, ${clamp(alpha)})`;
	}

	function closePartialCopyModal() {
		showPartialCopyModal = false;
		clearSelection();
	}

	function closeScreenshotModal() {
		showScreenshotModal = false;
		// Clean up dynamically created container
		if (screenshotTarget && screenshotTarget.parentElement === document.body) {
			document.body.removeChild(screenshotTarget);
		}
		screenshotTarget = null;
		clearSelection();
	}
</script>

<div class="flex h-full flex-col bg-[#96C2CF]">
	<!-- Header (always shown, search panel is an overlay) -->
	<div
		class="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between bg-[#7CC5E6] px-4 shadow-sm"
	>
		<div class="flex items-center text-white">
			{#if onBack}
				<button
					class="mr-3 rounded p-1 transition-colors hover:bg-white/20"
					onclick={onBack}
					aria-label="戻る"
				>
					<Icon icon="mdi:chevron-left" class="h-6 w-6" />
				</button>
			{/if}
			<h2 class="text-lg font-bold">{chat.name}</h2>
			{#if chat.memberCount}
				<span class="ml-2 text-sm opacity-90">({chat.memberCount})</span>
			{/if}
		</div>
		<div class="flex space-x-4 text-white">
			<button aria-label="検索" onclick={openSearch}>
				<Icon icon="mdi:magnify" class="h-5 w-5" />
			</button>
			<button aria-label="メニュー">
				<Icon icon="mdi:menu" class="h-5 w-5" />
			</button>
		</div>
	</div>

	<!-- Message Area -->
	<div
		bind:this={viewport}
		class="bg-opacity-50 relative flex-1 overflow-y-auto p-4"
		class:pb-28={selectionMode}
	>
		{#if loading}
			<div class="flex justify-center p-4">
				<span class="loading loading-spinner text-info"></span>
			</div>
		{/if}

		{#each messages as msg, i (msg.id)}
			<!-- Date Separator -->
			{#if i === 0 || getDateString(messages[i].timestamp) !== getDateString(messages[i - 1].timestamp)}
				<div class="my-4 flex justify-center" use:registerDateSeparatorRef={i}>
					<span class="bg-opacity-20 rounded-full bg-black px-3 py-1 text-xs text-white">
						{getDateString(msg.timestamp)}
					</span>
				</div>
			{/if}

			<div
				use:registerMessageRef={msg.id}
				class="relative cursor-pointer transition-all duration-200 {getSelectionClasses(
					i,
					selectedMessageIds.has(msg.id)
				)}"
				class:bg-yellow-200={highlightedMessageId === msg.id}
				class:bg-opacity-50={highlightedMessageId === msg.id}
				class:rounded-lg={highlightedMessageId === msg.id}
				class:ring-2={highlightedMessageId === msg.id}
				class:ring-yellow-400={highlightedMessageId === msg.id}
				role="button"
				tabindex="0"
				onpointerdown={(e) => handleMessagePointerDown(e, msg.id)}
				onpointerup={handleMessagePointerUp}
				onpointerleave={handleMessagePointerLeave}
				onclick={(e) => handleMessageClick(e, msg.id)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						if (selectionMode) {
							toggleMessageSelection(msg.id);
						}
					}
				}}
			>
				<MessageBubble message={msg} isGroup={chat.isGroup} onImageClick={imagePreview.open} />
			</div>
		{/each}
	</div>

	<!-- Input Area (Read Only) -->
	<div class="border-t border-gray-200 bg-white p-3">
		<div class="w-full rounded bg-gray-100 p-2 text-center text-sm text-gray-500">
			これは読み取り専用のアーカイブです
		</div>
	</div>
</div>

<!-- Image Preview Modal -->
{#if imagePreview.isOpen}
	<ImagePreview
		imageUrl={imagePreview.currentUrl}
		senderName={imagePreview.currentSenderName}
		timestamp={imagePreview.currentTimestamp}
		onClose={imagePreview.close}
		onPrevious={imagePreview.showPrevious}
		onNext={imagePreview.showNext}
		hasPrevious={imagePreview.hasPrevious()}
		hasNext={imagePreview.hasNext()}
		currentIndex={imagePreview.currentIndex}
		totalCount={imagePreview.getTotalCount()}
		allImages={imagePreview.getAllImageInfos()}
		onSelectImage={imagePreview.selectByIndex}
	/>
{/if}

<!-- Calendar Modal -->
{#if showCalendar}
	<CalendarModal {messages} onSelectDate={handleDateSelect} onClose={closeCalendar} />
{/if}

<!-- Search Panel Overlay (rendered outside main layout to avoid scroll issues) -->
{#if showSearch}
	<SearchPanel
		{messages}
		onSearchResult={handleSearchResult}
		onClose={closeSearch}
		onOpenCalendar={openCalendar}
	/>
{/if}

<!-- Message Context Menu -->
<MessageContextMenu
	visible={selectionMode && selectedMessageIds.size > 0 && !showPartialCopyModal}
	onCopy={handleCopyWithPreview}
	onScreenshot={handleScreenshot}
	onClose={clearSelection}
	selectedCount={selectedMessageIds.size}
/>

<!-- Copy Modal -->
{#if showPartialCopyModal && selectedMessageIds.size > 0}
	<PartialCopyModal messages={getSelectedMessages()} onClose={closePartialCopyModal} />
{/if}

<!-- Screenshot Modal -->
{#if showScreenshotModal && screenshotTarget}
	<ScreenshotModal targetElement={screenshotTarget} onClose={closeScreenshotModal} />
{/if}

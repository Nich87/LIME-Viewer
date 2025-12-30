<script lang="ts">
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import Icon from '@iconify/svelte';
	import type { Message } from '$lib/schema';

	interface Props {
		messages: Message[];
		onSelectDate: (date: Date) => void;
		onClose: () => void;
	}

	let { messages, onSelectDate, onClose }: Props = $props();

	let selectedDate: Date | null = $state(null);
	let currentMonth = new SvelteDate();

	// Get unique dates that have messages
	const messageDates = $derived.by(() => {
		const dates = new SvelteSet<string>();
		messages.forEach((msg) => {
			const date = new Date(msg.timestamp);
			dates.add(date.toDateString());
		});
		return dates;
	});

	function getDaysInMonth(date: Date): (Date | null)[] {
		const year = date.getFullYear();
		const month = date.getMonth();

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		const days: (Date | null)[] = [];

		// Add empty slots for days before the first day of month
		for (let i = 0; i < firstDay.getDay(); i++) {
			days.push(null);
		}

		// Add all days of the month
		for (let i = 1; i <= lastDay.getDate(); i++) {
			days.push(new Date(year, month, i));
		}

		return days;
	}

	function changeMonth(delta: number) {
		currentMonth.setMonth(currentMonth.getMonth() + delta);
	}

	function selectDate(date: Date) {
		selectedDate = date;
		onSelectDate(date);
		onClose();
	}

	function hasMessagesOnDate(date: Date): boolean {
		return messageDates.has(date.toDateString());
	}

	function formatMonthYear(date: Date): string {
		return `${date.getFullYear()}年${date.getMonth() + 1}月`;
	}

	const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
</script>

<!-- Backdrop -->
<button class="fixed inset-0 z-40 bg-black/30" onclick={onClose} aria-label="カレンダーを閉じる"
></button>

<!-- Calendar Modal - Bottom Sheet Style -->
<div class="animate-slide-up fixed right-0 bottom-0 left-0 z-50">
	<div class="rounded-t-3xl bg-[#8B7355] px-4 pt-4 pb-6 text-white shadow-2xl">
		<!-- Header -->
		<div class="mb-4 flex items-center justify-between">
			<span class="text-xl font-medium">{formatMonthYear(currentMonth)}</span>
			<button
				onclick={onClose}
				class="rounded-full p-1 transition-colors hover:bg-white/20"
				aria-label="閉じる"
			>
				<Icon icon="mdi:close" class="h-6 w-6" />
			</button>
		</div>

		<!-- Month Navigation -->
		<div class="mb-4 flex items-center justify-between">
			<button
				onclick={() => changeMonth(-1)}
				class="rounded-full p-2 transition-colors hover:bg-white/20"
			>
				<Icon icon="mdi:chevron-left" class="h-6 w-6" />
			</button>
			<div class="flex-1"></div>
			<button
				onclick={() => changeMonth(1)}
				class="rounded-full p-2 transition-colors hover:bg-white/20"
			>
				<Icon icon="mdi:chevron-right" class="h-6 w-6" />
			</button>
		</div>

		<!-- Weekday Headers -->
		<div class="mb-2 grid grid-cols-7 gap-1">
			{#each weekDays as day, i (day)}
				<div
					class="py-2 text-center text-sm font-medium"
					class:text-red-300={i === 0}
					class:text-blue-300={i === 6}
				>
					{day}
				</div>
			{/each}
		</div>

		<!-- Calendar Days -->
		<div class="grid grid-cols-7 gap-1">
			{#each getDaysInMonth(currentMonth) as day, i (i)}
				{#if day}
					{@const hasMessages = hasMessagesOnDate(day)}
					{@const isToday = day.toDateString() === new Date().toDateString()}
					{@const isSelected = selectedDate?.toDateString() === day.toDateString()}
					<button
						onclick={() => hasMessages && selectDate(day)}
						class="relative flex aspect-square items-center justify-center text-base transition-all"
						class:cursor-not-allowed={!hasMessages}
						disabled={!hasMessages}
					>
						{#if isToday}
							<span class="absolute inset-1 rounded-full bg-red-500"></span>
							<span class="relative z-10 font-bold">{day.getDate()}</span>
						{:else if isSelected}
							<span class="absolute inset-1 rounded-full bg-[#7CC5E6]"></span>
							<span class="relative z-10 font-bold">{day.getDate()}</span>
						{:else}
							<span class={!hasMessages ? 'text-white/40' : ''}>{day.getDate()}</span>
						{/if}
					</button>
				{:else}
					<div class="aspect-square"></div>
				{/if}
			{/each}
		</div>
	</div>
</div>

<style>
	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.animate-slide-up {
		animation: slide-up 0.3s ease-out;
	}
</style>

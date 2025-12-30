<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	interface Props {
		onComplete?: () => void;
		duration?: number;
	}

	let { onComplete, duration = 2000 }: Props = $props();

	let visible = $state(true);
	let fadeOut = $state(false);

	onMount(() => {
		const timer = setTimeout(() => {
			fadeOut = true;
			setTimeout(() => {
				visible = false;
				onComplete?.();
			}, 300);
		}, duration);

		return () => clearTimeout(timer);
	});
</script>

{#if visible}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#00B900] transition-opacity duration-300"
		class:opacity-0={fadeOut}
	>
		<!-- LINE Logo -->
		<div class="mb-8 flex flex-col items-center">
			<div class="mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-lg">
				<Icon icon="simple-icons:line" class="h-16 w-16 text-[#00B900]" />
			</div>
			<h1 class="text-3xl font-bold tracking-wider text-white">LIME</h1>
		</div>

		<!-- Loading indicator -->
		<div class="absolute bottom-20">
			<div class="flex space-x-2">
				<div
					class="h-2 w-2 animate-bounce rounded-full bg-white"
					style="animation-delay: 0ms;"
				></div>
				<div
					class="h-2 w-2 animate-bounce rounded-full bg-white"
					style="animation-delay: 150ms;"
				></div>
				<div
					class="h-2 w-2 animate-bounce rounded-full bg-white"
					style="animation-delay: 300ms;"
				></div>
			</div>
		</div>

		<p class="absolute bottom-8 text-sm text-white/80">LIME Viewer</p>
	</div>
{/if}

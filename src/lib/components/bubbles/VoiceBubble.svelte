<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const voice = $derived(message.attachment?.voice);
	const voiceUrl = $derived(message.attachment?.url);
	const durationSec = $derived(Math.floor((voice?.duration || 0) / 1000));
	const bubbleClass = $derived(getBubbleStyle(isMe, { flex: true, minWidth: 'min-w-40' }));

	// Audio playback state
	let audioElement: HTMLAudioElement | null = $state(null);
	let isPlaying = $state(false);

	function togglePlayback() {
		if (!audioElement) return;

		if (isPlaying) {
			audioElement.pause();
			isPlaying = false;
		} else {
			audioElement.play();
			isPlaying = true;

			audioElement.onended = () => {
				isPlaying = false;
			};
		}
	}
</script>

{#if voice}
	<div class={bubbleClass}>
		{#if voiceUrl}
			<!-- Hidden audio element for playback -->
			<audio bind:this={audioElement} src={voiceUrl} preload="metadata"></audio>
		{/if}
		<!-- Play/Pause Button -->
		<button
			type="button"
			class="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full {isMe
				? 'bg-green-600'
				: 'bg-gray-200'} {voiceUrl
				? 'cursor-pointer hover:opacity-80'
				: 'cursor-default opacity-50'}"
			onclick={() => voiceUrl && togglePlayback()}
			disabled={!voiceUrl}
		>
			{#if isPlaying}
				<Icon
					icon="heroicons:pause-solid"
					class="h-5 w-5 {isMe ? 'text-white' : 'text-gray-600'}"
				/>
			{:else}
				<Icon icon="heroicons:play-solid" class="h-5 w-5 {isMe ? 'text-white' : 'text-gray-600'}" />
			{/if}
		</button>
		<!-- Waveform visualization (simplified) -->
		<div class="flex flex-1 items-center gap-0.5">
			{#each Array.from({ length: 12 }, (_, idx) => idx) as i (i)}
				<div
					class="w-1 rounded-full {isMe ? 'bg-green-700' : 'bg-gray-400'}"
					style="height: {4 + Math.sin(i * 0.8) * 8 + 4}px"
				></div>
			{/each}
		</div>
		<!-- Duration -->
		<span class="ml-2 text-xs text-gray-600">{durationSec}秒</span>
	</div>
{/if}

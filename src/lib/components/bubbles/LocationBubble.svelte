<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getMapUrl, getMediaBubbleStyle } from '$lib/utils';
	import type { Message } from '$lib/schema';

	interface Props {
		message: Message;
		isMe: boolean;
	}

	let { message, isMe }: Props = $props();

	const location = $derived(message.attachment?.location);
	const mapUrl = $derived(getMapUrl(location?.latitude, location?.longitude));
	const hasCoordinates = $derived(!!location?.latitude && !!location?.longitude);

	const bubbleClass = $derived(`${getMediaBubbleStyle(isMe)}`);
</script>

{#if location}
	<div class={bubbleClass}>
		<!-- Map Preview -->
		<div class="relative h-32 w-56 bg-gray-200">
			{#if hasCoordinates}
				<a
					href={mapUrl}
					target="_blank"
					rel="noopener external"
					class="block h-full w-full"
					aria-label="Google Mapで位置情報を開く"
				>
					<div
						class="flex h-full w-full items-center justify-center bg-linear-to-br from-green-100 to-blue-100"
					>
						<Icon icon="heroicons:map-pin-solid" class="h-10 w-10 text-red-500" />
					</div>
				</a>
			{:else}
				<div class="flex h-full w-full items-center justify-center">
					<span class="text-xs text-[--line-text-faint]">位置情報</span>
				</div>
			{/if}
		</div>
		<!-- Address Info -->
		<div class="px-3 py-2">
			{#if location.name}
				<p class="text-sm font-medium text-[--line-text]">{location.name}</p>
			{/if}
			{#if location.address}
				<p class="line-clamp-2 text-xs text-[--line-text-subtle]">{location.address}</p>
			{/if}
			{#if hasCoordinates}
				<a
					href={mapUrl}
					target="_blank"
					rel="noopener external"
					class="mt-1 inline-flex items-center text-xs text-[--line-brand] hover:underline"
				>
					<Icon icon="heroicons:arrow-top-right-on-square-mini" class="mr-1 h-3 w-3" />
					Google Mapで開く
				</a>
			{/if}
		</div>
	</div>
{/if}

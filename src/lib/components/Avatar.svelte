<script lang="ts">
	interface Props {
		name?: string;
		src?: string;
		class?: string;
		fallbackClass?: string;
		decorative?: boolean;
	}

	let {
		name = '',
		src,
		class: className = '',
		fallbackClass = '',
		decorative = true
	}: Props = $props();

	let imageFailed = $state(false);

	$effect(() => {
		const currentSrc = src;
		void currentSrc;
		imageFailed = false;
	});

	function getFallbackText(value: string): string {
		const trimmed = value.trim();
		return (trimmed || '?').slice(0, 1).toUpperCase();
	}
</script>

<div
	class={`flex items-center justify-center overflow-hidden rounded-full bg-[#dde2ea] text-sm font-semibold text-[--line-text-subtle] ${className}`}
	aria-hidden={decorative}
>
	{#if src && !imageFailed}
		<img
			{src}
			alt={decorative ? '' : `${name}のアイコン`}
			class="h-full w-full object-cover"
			loading="lazy"
			decoding="async"
			referrerpolicy="no-referrer"
			onerror={() => (imageFailed = true)}
		/>
	{:else}
		<span class={`select-none ${fallbackClass}`}>{getFallbackText(name)}</span>
	{/if}
</div>

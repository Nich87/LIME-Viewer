import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			srcDir: 'src',
			registerType: 'autoUpdate',
			injectRegister: false,
			manifest: false, // Using custom site.webmanifest
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,wasm}'],
				maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
				navigateFallback: '/',
				navigateFallbackDenylist: [/^\/api/]
			},
			devOptions: {
				enabled: false
			}
		})
	],
	optimizeDeps: {
		// @iconify/svelte exports .svelte entrypoints that must be handled by vite-plugin-svelte,
		// not by esbuild pre-bundling.
		exclude: [
			'@iconify/svelte',
			'@iconify/svelte/dist/functions.js',
			'@iconify/svelte/dist/Icon.svelte',
			'@iconify/svelte/dist/OfflineIcon.svelte'
		]
	},
	server: {
		host: true,
		allowedHosts: ['localhost', '.trycloudflare.com']
	}
});

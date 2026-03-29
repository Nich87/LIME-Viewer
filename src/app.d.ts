// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			view?: 'list' | 'chat';
			chatId?: string;
			imagePreview?: boolean;
		}
		// interface Platform {}
	}
}

export {};

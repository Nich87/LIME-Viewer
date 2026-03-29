import { pushState, replaceState } from '$app/navigation';

type PendingStateUpdate = {
	mode: 'push' | 'replace';
	url: string | URL;
	state: App.PageState;
};

let shallowRoutingReady = false;
const pendingStateUpdates: PendingStateUpdate[] = [];

function flushPendingStateUpdates() {
	if (!shallowRoutingReady) return;

	while (pendingStateUpdates.length > 0) {
		const update = pendingStateUpdates.shift();
		if (!update) return;

		if (update.mode === 'replace') {
			replaceState(update.url, update.state);
		} else {
			pushState(update.url, update.state);
		}
	}
}

export function markShallowRoutingReady() {
	if (shallowRoutingReady) return;

	shallowRoutingReady = true;
	flushPendingStateUpdates();
}

export function safePushState(url: string | URL, state: App.PageState) {
	if (!shallowRoutingReady) {
		pendingStateUpdates.push({ mode: 'push', url, state });
		return;
	}

	pushState(url, state);
}

export function safeReplaceState(url: string | URL, state: App.PageState) {
	if (!shallowRoutingReady) {
		pendingStateUpdates.push({ mode: 'replace', url, state });
		return;
	}

	replaceState(url, state);
}

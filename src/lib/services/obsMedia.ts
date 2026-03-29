import type { Message } from '$lib/schema';

const OBS_PROXY_BASE_URL = '/api/obs/';
const HKDF_INFO = new TextEncoder().encode('FileEncryption');
const OBS_SESSION_DISABLE_STATUSES = new Set([401]);
const MAX_CONCURRENT_OBS_LOADS = 3;
const MAX_QUEUE_SIZE = 10;

class ObsMediaFetchError extends Error {
	constructor(
		message: string,
		public readonly status?: number,
		public readonly suppressFollowUpLogs = false
	) {
		super(message);
		this.name = 'ObsMediaFetchError';
	}
}

function base64ToBytes(value: string): Uint8Array {
	const binary = atob(value);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function constantTimeEquals(left: Uint8Array, right: Uint8Array): boolean {
	if (left.length !== right.length) return false;

	let diff = 0;
	for (let i = 0; i < left.length; i += 1) {
		diff |= left[i] ^ right[i];
	}

	return diff === 0;
}

function detectImageMimeType(bytes: Uint8Array): string | undefined {
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return 'image/jpeg';
	}

	if (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	) {
		return 'image/png';
	}

	if (
		bytes.length >= 6 &&
		bytes[0] === 0x47 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x38
	) {
		return 'image/gif';
	}

	if (
		bytes.length >= 12 &&
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return 'image/webp';
	}

	return undefined;
}

function buildTalkMeta(messageId: string): string {
	const messageBytes = new TextEncoder().encode(messageId);
	const thrift = new Uint8Array(3 + 4 + messageBytes.length + 9);

	thrift[0] = 0x0b;
	thrift[1] = 0x00;
	thrift[2] = 0x04;
	thrift[3] = 0x00;
	thrift[4] = 0x00;
	thrift[5] = 0x00;
	thrift[6] = messageBytes.length;
	thrift.set(messageBytes, 7);

	const tailOffset = 7 + messageBytes.length;
	thrift.set([0x0f, 0x00, 0x1b, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00], tailOffset);

	return bytesToBase64(
		new TextEncoder().encode(JSON.stringify({ message: bytesToBase64(thrift) }))
	);
}

function normalizeObsAccessToken(rawValue?: string | null): string | undefined {
	if (!rawValue) return undefined;

	// LINE backups may append metadata after the token using either "^^" or ASCII RS (0x1E).
	const textSeparatorIndex = rawValue.indexOf('^^');
	const recordSeparatorIndex = rawValue.indexOf(String.fromCharCode(0x1e));
	const separatorIndex = [textSeparatorIndex, recordSeparatorIndex]
		.filter((index) => index >= 0)
		.reduce((smallest, index) => Math.min(smallest, index), Number.POSITIVE_INFINITY);
	const token = (
		separatorIndex === Number.POSITIVE_INFINITY ? rawValue : rawValue.slice(0, separatorIndex)
	).trim();

	return token || undefined;
}

async function deriveMediaKeys(keyMaterial: Uint8Array): Promise<{
	encKey: Uint8Array;
	macKey: Uint8Array;
	counter: Uint8Array;
}> {
	const hkdfKey = await crypto.subtle.importKey('raw', toArrayBuffer(keyMaterial), 'HKDF', false, [
		'deriveBits'
	]);
	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'HKDF',
			hash: 'SHA-256',
			salt: new Uint8Array(0),
			info: HKDF_INFO
		},
		hkdfKey,
		76 * 8
	);
	const derived = new Uint8Array(derivedBits);

	const counter = new Uint8Array(16);
	counter.set(derived.slice(64, 76), 0);

	return {
		encKey: derived.slice(0, 32),
		macKey: derived.slice(32, 64),
		counter
	};
}

async function decryptObsImagePayload(
	encryptedData: Uint8Array,
	keyMaterialB64: string
): Promise<Uint8Array> {
	if (encryptedData.length < 32) {
		throw new Error('Encrypted image payload is too short');
	}

	const payload = encryptedData.slice(0, encryptedData.length - 32);
	const expectedMac = encryptedData.slice(encryptedData.length - 32);
	const keyMaterial = base64ToBytes(keyMaterialB64);
	const { encKey, macKey, counter } = await deriveMediaKeys(keyMaterial);

	const hmacKey = await crypto.subtle.importKey(
		'raw',
		toArrayBuffer(macKey),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const actualMac = new Uint8Array(
		await crypto.subtle.sign('HMAC', hmacKey, toArrayBuffer(payload))
	);
	if (!constantTimeEquals(actualMac, expectedMac)) {
		throw new Error('Image payload HMAC verification failed');
	}

	const aesKey = await crypto.subtle.importKey(
		'raw',
		toArrayBuffer(encKey),
		{ name: 'AES-CTR' },
		false,
		['decrypt']
	);
	const decrypted = await crypto.subtle.decrypt(
		{ name: 'AES-CTR', counter: toArrayBuffer(counter), length: 32 },
		aesKey,
		toArrayBuffer(payload)
	);

	return new Uint8Array(decrypted);
}

class ObsMediaService {
	private obsToken: string | undefined;
	private obsFetchDisabledReason: string | undefined;
	private imageUrlCache = new Map<string, string>();
	private pendingImageLoads = new Map<string, Promise<string | undefined>>();
	private failedImageLoads = new Set<string>();
	private activeLoadCount = 0;
	private loadQueue: Array<{
		cacheKey: string;
		resolve: (value: string | undefined) => void;
		run: () => void;
	}> = [];
	private activeAbortControllers = new Map<string, AbortController>();

	private drainQueuedLoads(): void {
		while (this.loadQueue.length > 0) {
			const queued = this.loadQueue.shift();
			queued?.resolve(undefined);
		}
	}

	private startNextQueuedLoad(): void {
		if (this.obsFetchDisabledReason) {
			this.drainQueuedLoads();
			return;
		}

		if (this.activeLoadCount >= MAX_CONCURRENT_OBS_LOADS) return;

		const queued = this.loadQueue.shift();
		queued?.run();
	}

	private enqueueLoad(
		cacheKey: string,
		task: (signal: AbortSignal) => Promise<string | undefined>
	): Promise<string | undefined> {
		if (this.obsFetchDisabledReason) return Promise.resolve(undefined);

		// Prevent unbounded queue growth
		if (this.loadQueue.length >= MAX_QUEUE_SIZE) {
			const dropped = this.loadQueue.shift();
			dropped?.resolve(undefined);
		}

		return new Promise((resolve, reject) => {
			const run = () => {
				if (this.obsFetchDisabledReason) {
					resolve(undefined);
					return;
				}

				const controller = new AbortController();
				this.activeAbortControllers.set(cacheKey, controller);
				this.activeLoadCount += 1;

				void task(controller.signal)
					.then(resolve, (err) => {
						if (err instanceof DOMException && err.name === 'AbortError') {
							resolve(undefined);
						} else {
							reject(err);
						}
					})
					.finally(() => {
						this.activeAbortControllers.delete(cacheKey);
						this.activeLoadCount -= 1;
						this.startNextQueuedLoad();
					});
			};

			if (this.activeLoadCount < MAX_CONCURRENT_OBS_LOADS) {
				run();
				return;
			}

			this.loadQueue.push({ cacheKey, resolve, run });
		});
	}

	private reset(): void {
		// Abort all in-flight fetches
		for (const controller of this.activeAbortControllers.values()) {
			controller.abort();
		}
		this.activeAbortControllers.clear();

		for (const url of this.imageUrlCache.values()) {
			URL.revokeObjectURL(url);
		}

		this.imageUrlCache.clear();
		this.pendingImageLoads.clear();
		this.failedImageLoads.clear();
		this.obsFetchDisabledReason = undefined;
		this.drainQueuedLoads();
	}

	/**
	 * Cancel a pending or queued image load for the given message.
	 * Removes queued items and aborts in-flight fetches.
	 */
	cancelLoad(message: Message): void {
		const serverId = message.serverId?.trim();
		const objectId = message.attachment?.image?.objectId?.trim();
		if (!serverId || !objectId) return;

		const cacheKey = `${serverId}:${objectId}`;

		// Remove from queue if still waiting
		this.loadQueue = this.loadQueue.filter((item) => {
			if (item.cacheKey === cacheKey) {
				item.resolve(undefined);
				return false;
			}
			return true;
		});

		// Abort if currently fetching
		const controller = this.activeAbortControllers.get(cacheKey);
		if (controller) {
			controller.abort();
		}

		// Remove from pending
		this.pendingImageLoads.delete(cacheKey);
	}

	private disableObsFetching(reason: string): void {
		if (this.obsFetchDisabledReason) return;

		this.obsFetchDisabledReason = reason;
		this.drainQueuedLoads();
		console.warn(reason);
	}

	setEncryptedAccessToken(rawValue?: string | null): void {
		const token = normalizeObsAccessToken(rawValue);
		if (this.obsToken !== token) this.reset();
		this.obsToken = token || undefined;
	}

	resetFetchFailures(): void {
		this.failedImageLoads.clear();
		this.obsFetchDisabledReason = undefined;
		this.drainQueuedLoads();
	}

	canFetchImage(message: Message): boolean {
		if (message.attachment?.type !== 'image') return false;
		if (message.attachment.url) return true;
		if (this.obsFetchDisabledReason) return false;

		return Boolean(
			this.obsToken &&
			message.serverId &&
			message.attachment.image?.objectId &&
			message.attachment.image?.serviceId === 'emi' &&
			message.attachment.image?.encryptionKey
		);
	}

	getCachedImageUrl(message: Message): string | undefined {
		if (message.attachment?.url) return message.attachment.url;

		const objectId = message.attachment?.image?.objectId;
		if (!objectId || !message.serverId) return undefined;

		return this.imageUrlCache.get(`${message.serverId}:${objectId}`);
	}

	async resolveImageUrl(message: Message): Promise<string | undefined> {
		if (message.attachment?.type !== 'image') return undefined;
		if (message.attachment.url) return message.attachment.url;
		if (!globalThis.crypto?.subtle) {
			console.warn('[OBS] crypto.subtle not available');
			return undefined;
		}
		if (this.obsFetchDisabledReason) {
			console.warn('[OBS] Disabled:', this.obsFetchDisabledReason);
			return undefined;
		}

		const serverId = message.serverId?.trim();
		const objectId = message.attachment.image?.objectId?.trim();
		const serviceId = message.attachment.image?.serviceId?.trim();
		const encryptionKey = message.attachment.image?.encryptionKey?.trim();

		console.log('[OBS] resolveImageUrl', {
			hasToken: !!this.obsToken,
			serverId,
			objectId: objectId?.slice(0, 20),
			serviceId,
			hasEncKey: !!encryptionKey
		});

		if (!this.obsToken || !serverId || !objectId || serviceId !== 'emi' || !encryptionKey) {
			console.warn('[OBS] Missing required field');
			return undefined;
		}

		const cacheKey = `${serverId}:${objectId}`;
		const cachedUrl = this.imageUrlCache.get(cacheKey);
		if (cachedUrl) return cachedUrl;
		if (this.failedImageLoads.has(cacheKey)) return undefined;

		const pending = this.pendingImageLoads.get(cacheKey);
		if (pending) return pending;

		const loadPromise = this.enqueueLoad(cacheKey, (signal) =>
			this.fetchAndDecryptImage(objectId, serverId, encryptionKey, signal)
		)
			.then((url) => {
				if (url) {
					this.imageUrlCache.set(cacheKey, url);
				}
				return url;
			})
			.catch((error) => {
				this.failedImageLoads.add(cacheKey);

				if (!(error instanceof ObsMediaFetchError && error.suppressFollowUpLogs)) {
					console.warn('Failed to resolve OBS image:', error);
				}

				return undefined;
			})
			.finally(() => {
				this.pendingImageLoads.delete(cacheKey);
			});

		this.pendingImageLoads.set(cacheKey, loadPromise);
		return loadPromise;
	}

	private async fetchAndDecryptImage(
		objectId: string,
		serverId: string,
		encryptionKey: string,
		signal?: AbortSignal
	): Promise<string | undefined> {
		const url = `${OBS_PROXY_BASE_URL}${encodeURIComponent(objectId)}`;

		const response = await fetch(url, {
			method: 'GET',
			cache: 'no-store',
			signal,
			headers: {
				'X-Line-Access': this.obsToken || '',
				'X-Talk-Meta': buildTalkMeta(serverId)
			}
		});

		if (!response.ok) {
			const responseText = (await response.text()).trim();
			const message = responseText
				? `OBS fetch failed with status ${response.status}: ${responseText}`
				: `OBS fetch failed with status ${response.status}`;

			if (OBS_SESSION_DISABLE_STATUSES.has(response.status)) {
				this.disableObsFetching(
					`OBS image fetching was disabled for this session after status ${response.status}.`
				);
				throw new ObsMediaFetchError(message, response.status, true);
			}

			throw new ObsMediaFetchError(message, response.status);
		}

		const encryptedData = new Uint8Array(await response.arrayBuffer());
		const decryptedData = await decryptObsImagePayload(encryptedData, encryptionKey);
		const mimeType = detectImageMimeType(decryptedData);
		if (!mimeType) {
			throw new Error('Unsupported decrypted image format');
		}

		return URL.createObjectURL(new Blob([toArrayBuffer(decryptedData)], { type: mimeType }));
	}
}

export const obsMediaService = new ObsMediaService();

const DB_NAME = 'lime-viewer-storage';
const DB_VERSION = 2;

const STORE_DATABASE = 'database';
const STORE_CONTACTS = 'contacts';
const STORE_MEDIA = 'media';
const STORE_MEDIA_KEYS = 'media_keys';

const BATCH_SIZE = 50;

interface StoredMedia {
	key: string;
	blob: Blob;
	chatId: string;
}

class StorageService {
	private db: IDBDatabase | null = null;
	private mediaKeysCache: Set<string> | null = null;

	private async openDB(): Promise<IDBDatabase> {
		if (this.db) return this.db;

		return new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => {
				reject(new Error('Failed to open IndexedDB'));
			};

			request.onsuccess = () => {
				this.db = request.result;
				resolve(this.db);
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				const oldVersion = event.oldVersion;

				if (!db.objectStoreNames.contains(STORE_DATABASE)) {
					db.createObjectStore(STORE_DATABASE);
				}
				if (!db.objectStoreNames.contains(STORE_CONTACTS)) {
					db.createObjectStore(STORE_CONTACTS);
				}

				if (!db.objectStoreNames.contains(STORE_MEDIA)) {
					const mediaStore = db.createObjectStore(STORE_MEDIA, { keyPath: 'key' });
					mediaStore.createIndex('chatId', 'chatId', { unique: false });
				} else if (oldVersion < 2) {
					const transaction = (event.target as IDBOpenDBRequest).transaction;
					if (transaction) {
						const mediaStore = transaction.objectStore(STORE_MEDIA);
						if (!mediaStore.indexNames.contains('chatId')) {
							mediaStore.createIndex('chatId', 'chatId', { unique: false });
						}
					}
				}

				if (!db.objectStoreNames.contains(STORE_MEDIA_KEYS)) {
					db.createObjectStore(STORE_MEDIA_KEYS);
				}
			};
		});
	}

	async saveDatabase(buffer: ArrayBuffer): Promise<void> {
		const db = await this.openDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_DATABASE, 'readwrite');
			const store = transaction.objectStore(STORE_DATABASE);
			const request = store.put(buffer, 'dbBuffer');

			request.onerror = () => reject(new Error('Failed to save database'));
			request.onsuccess = () => resolve();
		});
	}

	async loadDatabase(): Promise<ArrayBuffer | null> {
		const db = await this.openDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_DATABASE, 'readonly');
			const store = transaction.objectStore(STORE_DATABASE);
			const request = store.get('dbBuffer');

			request.onerror = () => reject(new Error('Failed to load database'));
			request.onsuccess = () => resolve(request.result || null);
		});
	}

	async saveContacts(csvContent: string): Promise<void> {
		const db = await this.openDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_CONTACTS, 'readwrite');
			const store = transaction.objectStore(STORE_CONTACTS);
			const request = store.put(csvContent, 'csvContent');

			request.onerror = () => reject(new Error('Failed to save contacts'));
			request.onsuccess = () => resolve();
		});
	}

	async loadContacts(): Promise<string | null> {
		const db = await this.openDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_CONTACTS, 'readonly');
			const store = transaction.objectStore(STORE_CONTACTS);
			const request = store.get('csvContent');

			request.onerror = () => reject(new Error('Failed to load contacts'));
			request.onsuccess = () => resolve(request.result || null);
		});
	}

	async saveMedia(key: string, blob: Blob): Promise<void> {
		const db = await this.openDB();
		const chatId = key.split('/')[0];
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_MEDIA, 'readwrite');
			const store = transaction.objectStore(STORE_MEDIA);
			const request = store.put({ key, blob, chatId } as StoredMedia);

			request.onerror = () => reject(new Error('Failed to save media'));
			request.onsuccess = () => {
				if (this.mediaKeysCache) {
					this.mediaKeysCache.add(key);
				}
				resolve();
			};
		});
	}

	async saveAllMedia(
		mediaMap: Map<string, Blob>,
		onProgress?: (percent: number) => void
	): Promise<void> {
		const db = await this.openDB();
		const entries = Array.from(mediaMap.entries());
		const totalEntries = entries.length;

		if (totalEntries === 0) return;

		for (let i = 0; i < totalEntries; i += BATCH_SIZE) {
			const batch = entries.slice(i, i + BATCH_SIZE);

			await new Promise<void>((resolve, reject) => {
				const transaction = db.transaction(STORE_MEDIA, 'readwrite');
				const store = transaction.objectStore(STORE_MEDIA);

				transaction.onerror = () => reject(new Error('Failed to save media batch'));
				transaction.oncomplete = () => resolve();

				for (const [key, blob] of batch) {
					const chatId = key.split('/')[0];
					store.put({ key, blob, chatId } as StoredMedia);
				}
			});

			if (onProgress) {
				const percent = Math.min(100, Math.round(((i + batch.length) / totalEntries) * 100));
				onProgress(percent);
			}

			await new Promise((resolve) => setTimeout(resolve, 0));
		}

		const keys = Array.from(mediaMap.keys());
		await this.saveMediaKeys(keys);
	}

	private async saveMediaKeys(keys: string[]): Promise<void> {
		const db = await this.openDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_MEDIA_KEYS, 'readwrite');
			const store = transaction.objectStore(STORE_MEDIA_KEYS);
			const request = store.put(keys, 'allKeys');

			request.onerror = () => reject(new Error('Failed to save media keys'));
			request.onsuccess = () => {
				this.mediaKeysCache = new Set(keys);
				resolve();
			};
		});
	}

	async loadMediaKeys(): Promise<Set<string>> {
		if (this.mediaKeysCache) return this.mediaKeysCache;

		const db = await this.openDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_MEDIA_KEYS, 'readonly');
			const store = transaction.objectStore(STORE_MEDIA_KEYS);
			const request = store.get('allKeys');

			request.onerror = () => reject(new Error('Failed to load media keys'));
			request.onsuccess = () => {
				const keys = (request.result as string[]) || [];
				this.mediaKeysCache = new Set(keys);
				resolve(this.mediaKeysCache);
			};
		});
	}

	async hasMediaKey(key: string): Promise<boolean> {
		const keys = await this.loadMediaKeys();
		return keys.has(key);
	}

	async loadMedia(key: string): Promise<Blob | null> {
		const db = await this.openDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_MEDIA, 'readonly');
			const store = transaction.objectStore(STORE_MEDIA);
			const request = store.get(key);

			request.onerror = () => reject(new Error('Failed to load media'));
			request.onsuccess = () => {
				const result = request.result as StoredMedia | undefined;
				resolve(result?.blob || null);
			};
		});
	}

	async loadMediaByChat(chatId: string): Promise<Map<string, Blob>> {
		const db = await this.openDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_MEDIA, 'readonly');
			const store = transaction.objectStore(STORE_MEDIA);

			let request: IDBRequest;
			if (store.indexNames.contains('chatId')) {
				const index = store.index('chatId');
				request = index.getAll(chatId);
			} else {
				request = store.getAll();
			}

			request.onerror = () => reject(new Error('Failed to load media by chat'));
			request.onsuccess = () => {
				const result = new Map<string, Blob>();
				const items = request.result as StoredMedia[];
				for (const item of items) {
					if (!store.indexNames.contains('chatId') && item.chatId !== chatId) {
						continue;
					}
					result.set(item.key, item.blob);
				}
				resolve(result);
			};
		});
	}

	async loadAllMedia(onProgress?: (percent: number) => void): Promise<Map<string, Blob>> {
		const db = await this.openDB();

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_MEDIA, 'readonly');
			const store = transaction.objectStore(STORE_MEDIA);
			const result = new Map<string, Blob>();

			const request = store.openCursor();
			let count = 0;
			let totalCount = 0;

			const countRequest = store.count();
			countRequest.onsuccess = () => {
				totalCount = countRequest.result;
			};

			request.onerror = () => reject(new Error('Failed to load media'));
			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					const item = cursor.value as StoredMedia;
					result.set(item.key, item.blob);
					count++;

					if (onProgress && totalCount > 0) {
						onProgress(Math.round((count / totalCount) * 100));
					}

					cursor.continue();
				} else {
					resolve(result);
				}
			};
		});
	}

	async hasStoredData(): Promise<boolean> {
		try {
			const db = await this.openDB();
			return new Promise((resolve, reject) => {
				const transaction = db.transaction(STORE_DATABASE, 'readonly');
				const store = transaction.objectStore(STORE_DATABASE);
				const request = store.count();

				request.onerror = () => reject(new Error('Failed to check stored data'));
				request.onsuccess = () => resolve(request.result > 0);
			});
		} catch {
			return false;
		}
	}

	async getMediaCount(): Promise<number> {
		try {
			const keys = await this.loadMediaKeys();
			return keys.size;
		} catch {
			return 0;
		}
	}

	async clearAll(): Promise<void> {
		const db = await this.openDB();
		const stores = [STORE_DATABASE, STORE_CONTACTS, STORE_MEDIA, STORE_MEDIA_KEYS];
		const errors: string[] = [];

		for (const storeName of stores) {
			if (!db.objectStoreNames.contains(storeName)) continue;

			await new Promise<void>((resolve) => {
				const transaction = db.transaction(storeName, 'readwrite');
				const store = transaction.objectStore(storeName);
				const request = store.clear();

				request.onerror = () => {
					errors.push(`Failed to clear ${storeName}`);
					resolve();
				};
				request.onsuccess = () => resolve();
			});
		}

		this.mediaKeysCache = null;

		if (errors.length > 0) {
			console.error('Some stores failed to clear:', errors);
		}
	}
}

export const storageService = new StorageService();

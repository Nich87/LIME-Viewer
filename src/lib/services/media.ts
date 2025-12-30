/**
 * Media Service
 * Manages uploaded media files from the chats_backup folder
 */

import JSZip from 'jszip';
import { storageService } from './storage';

interface MediaFile {
	blob: Blob;
	blobUrl: string;
}

export class MediaError extends Error {
	constructor(
		message: string,
		public readonly code: 'ZIP_EXTRACT_FAILED' | 'LOAD_FAILED' | 'STORAGE_FAILED'
	) {
		super(message);
		this.name = 'MediaError';
	}
}

class MediaService {
	// Map: chatId/filename -> MediaFile (in-memory cache)
	private mediaFiles = new Map<string, MediaFile>();
	// Set of all known media keys (for fast existence check)
	private mediaKeys = new Set<string>();
	private initialized = false;
	private storageInitialized = false;

	async initializeFromFolder(
		files: FileList | File[],
		persist = true,
		onProgress?: (percent: number) => void
	): Promise<number> {
		this.clear();

		let processedCount = 0;
		const blobsToSave = new Map<string, Blob>();
		const totalFiles = files.length;

		for (let i = 0; i < totalFiles; i++) {
			const file = files[i];
			// Get the relative path from webkitRelativePath or name
			const relativePath =
				(file as { webkitRelativePath?: string }).webkitRelativePath || file.name;

			// Parse the path to extract chatId and messageId
			// Expected format: chats_backup/chatId/messages/messageId
			const pathParts = relativePath.split(/[/\\]/);

			// Find the chats_backup directory in the path
			const backupIndex = pathParts.findIndex((p) => p === 'chats_backup');
			if (backupIndex === -1 || pathParts.length < backupIndex + 4) {
				// Not a valid media file path
				continue;
			}

			const chatId = pathParts[backupIndex + 1];
			const filename = pathParts[pathParts.length - 1];

			if (!chatId || !filename) continue;

			// Skip if file is empty (directory entry)
			if (file.size === 0) continue;

			const key = `${chatId}/${filename}`;
			const blob = file.slice();
			const blobUrl = URL.createObjectURL(blob);

			this.mediaFiles.set(key, { blob, blobUrl });
			this.mediaKeys.add(key);
			blobsToSave.set(key, blob);
			processedCount++;

			// Report progress for folder processing
			if (onProgress && i % 100 === 0) {
				onProgress(Math.round((i / totalFiles) * 50)); // First 50% for reading
			}
		}

		this.initialized = true;

		// Persist to IndexedDB with progress callback
		if (persist && blobsToSave.size > 0) {
			await storageService.saveAllMedia(blobsToSave, (percent) => {
				if (onProgress) {
					onProgress(50 + Math.round(percent / 2)); // Last 50% for saving
				}
			});
		}

		return processedCount;
	}

	async initializeFromZip(
		zipFile: File,
		onProgress?: (percent: number) => void,
		persist = true
	): Promise<number> {
		this.clear();

		let processedCount = 0;
		const blobsToSave = new Map<string, Blob>();

		try {
			const zip = await JSZip.loadAsync(zipFile);
			const entries = Object.entries(zip.files);
			const totalEntries = entries.length;

			for (let i = 0; i < entries.length; i++) {
				const [path, zipEntry] = entries[i];

				// Skip directories
				if (zipEntry.dir) continue;

				// Parse the path to extract chatId and filename
				// Expected format: chats_backup/chatId/messages/messageId
				const pathParts = path.split(/[/\\]/);

				// Find the chats_backup directory in the path
				const backupIndex = pathParts.findIndex((p) => p === 'chats_backup');
				if (backupIndex === -1 || pathParts.length < backupIndex + 4) {
					// Also try without chats_backup prefix (direct chatId/messages/filename)
					if (pathParts.length >= 3 && pathParts[1] === 'messages') {
						const chatId = pathParts[0];
						const filename = pathParts[pathParts.length - 1];

						if (chatId && filename) {
							const blob = await zipEntry.async('blob');
							const blobUrl = URL.createObjectURL(blob);
							const key = `${chatId}/${filename}`;
							this.mediaFiles.set(key, { blob, blobUrl });
							this.mediaKeys.add(key);
							blobsToSave.set(key, blob);
							processedCount++;
						}
					}
					continue;
				}

				const chatId = pathParts[backupIndex + 1];
				const filename = pathParts[pathParts.length - 1];

				if (!chatId || !filename) continue;

				const blob = await zipEntry.async('blob');
				const blobUrl = URL.createObjectURL(blob);
				const key = `${chatId}/${filename}`;

				this.mediaFiles.set(key, { blob, blobUrl });
				this.mediaKeys.add(key);
				blobsToSave.set(key, blob);
				processedCount++;

				// Report progress (first 50% for extraction)
				if (onProgress) {
					onProgress(Math.round(((i + 1) / totalEntries) * 50));
				}
			}
		} catch (error) {
			console.error('Failed to extract ZIP file:', error);
			throw new MediaError('Failed to extract ZIP file', 'ZIP_EXTRACT_FAILED');
		}

		this.initialized = true;

		// Persist to IndexedDB with progress callback
		if (persist && blobsToSave.size > 0) {
			await storageService.saveAllMedia(blobsToSave, (percent) => {
				if (onProgress) {
					onProgress(50 + Math.round(percent / 2)); // Last 50% for saving
				}
			});
		}

		return processedCount;
	}

	async loadFromStorage(): Promise<boolean> {
		// Only load the keys, not the actual media blobs
		const keys = await storageService.loadMediaKeys();
		if (keys.size === 0) {
			return false;
		}
		this.clear();
		this.mediaKeys = keys;
		this.storageInitialized = true;
		this.initialized = true;
		return true;
	}

	async preloadChatMedia(chatId: string): Promise<void> {
		if (!this.storageInitialized) return;

		const keysToLoad: string[] = [];
		for (const key of this.mediaKeys) {
			if (key.startsWith(`${chatId}/`) && !this.mediaFiles.has(key)) {
				keysToLoad.push(key);
			}
		}

		if (keysToLoad.length === 0) return;

		const mediaMap = await storageService.loadMediaByChat(chatId);
		for (const [key, blob] of mediaMap) {
			if (!this.mediaFiles.has(key)) {
				const blobUrl = URL.createObjectURL(blob);
				this.mediaFiles.set(key, { blob, blobUrl });
			}
		}
	}

	async initialize(files: FileList | File[]): Promise<number> {
		return this.initializeFromFolder(files);
	}

	isInitialized(): boolean {
		return this.initialized;
	}

	getMediaUrl(chatId: string, filename: string): string | undefined {
		const key = `${chatId}/${filename}`;
		const media = this.mediaFiles.get(key);
		if (media) {
			return media.blobUrl;
		}

		if (this.storageInitialized && this.mediaKeys.has(key)) {
			this.loadSingleMedia(key);
			return undefined;
		}

		return undefined;
	}

	private async loadSingleMedia(key: string): Promise<void> {
		if (this.mediaFiles.has(key)) return;

		try {
			const blob = await storageService.loadMedia(key);
			if (blob && !this.mediaFiles.has(key)) {
				const blobUrl = URL.createObjectURL(blob);
				this.mediaFiles.set(key, { blob, blobUrl });
			}
		} catch (e) {
			console.error(`Failed to lazy load media: ${key}`, e);
		}
	}

	async getMediaUrlAsync(chatId: string, filename: string): Promise<string | undefined> {
		const key = `${chatId}/${filename}`;

		// Check memory cache first
		const media = this.mediaFiles.get(key);
		if (media) {
			return media.blobUrl;
		}

		if (this.storageInitialized && this.mediaKeys.has(key)) {
			await this.loadSingleMedia(key);
			return this.mediaFiles.get(key)?.blobUrl;
		}

		return undefined;
	}

	hasMedia(chatId: string, filename: string): boolean {
		const key = `${chatId}/${filename}`;
		// Check both in-memory cache and storage keys
		return this.mediaFiles.has(key) || this.mediaKeys.has(key);
	}

	getMediaBlob(chatId: string, filename: string): Blob | undefined {
		const key = `${chatId}/${filename}`;
		return this.mediaFiles.get(key)?.blob;
	}

	getMediaCount(): number {
		// Return total count including storage keys
		return Math.max(this.mediaFiles.size, this.mediaKeys.size);
	}

	clear(): void {
		// Revoke all blob URLs to free memory
		for (const media of this.mediaFiles.values()) {
			URL.revokeObjectURL(media.blobUrl);
		}
		this.mediaFiles.clear();
		this.mediaKeys.clear();
		this.initialized = false;
		this.storageInitialized = false;
	}
}

export const mediaService = new MediaService();

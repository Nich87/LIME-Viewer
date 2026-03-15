import { storageService } from './storage';

type BubbleAssetKind = 'send' | 'receive';

interface BubbleAssetFile {
	blob: Blob;
	blobUrl: string;
}

const BUBBLE_ASSET_KEYS: Record<BubbleAssetKind, string> = {
	send: 'textBubbleSend',
	receive: 'textBubbleReceive'
};

class BubbleAssetService {
	private bubbleAssets = new Map<BubbleAssetKind, BubbleAssetFile>();
	private initialized = false;

	async initialize(files: { send: Blob; receive: Blob }, persist = true): Promise<void> {
		this.clear();

		const nextAssets = new Map<BubbleAssetKind, BubbleAssetFile>();
		for (const kind of ['send', 'receive'] as const) {
			const blob = files[kind].slice(0, files[kind].size, files[kind].type || 'image/png');
			const blobUrl = URL.createObjectURL(blob);
			nextAssets.set(kind, { blob, blobUrl });
		}

		this.bubbleAssets = nextAssets;
		this.initialized = true;

		if (persist) {
			await Promise.all(
				(['send', 'receive'] as const).map((kind) =>
					storageService.saveBubbleAsset(BUBBLE_ASSET_KEYS[kind], nextAssets.get(kind)!.blob)
				)
			);
		}
	}

	async loadFromStorage(): Promise<boolean> {
		this.clear();

		const [sendBlob, receiveBlob] = await Promise.all([
			storageService.loadBubbleAsset(BUBBLE_ASSET_KEYS.send),
			storageService.loadBubbleAsset(BUBBLE_ASSET_KEYS.receive)
		]);

		if (!sendBlob || !receiveBlob) {
			this.clear();
			return false;
		}

		this.bubbleAssets.set('send', {
			blob: sendBlob,
			blobUrl: URL.createObjectURL(sendBlob)
		});
		this.bubbleAssets.set('receive', {
			blob: receiveBlob,
			blobUrl: URL.createObjectURL(receiveBlob)
		});
		this.initialized = true;

		return true;
	}

	getBubbleUrl(kind: BubbleAssetKind): string | undefined {
		return this.bubbleAssets.get(kind)?.blobUrl;
	}

	clear(): void {
		for (const asset of this.bubbleAssets.values()) {
			URL.revokeObjectURL(asset.blobUrl);
		}

		this.bubbleAssets.clear();
		this.initialized = false;
	}
}

export const bubbleAssetService = new BubbleAssetService();

import { storageService } from './storage';

class ContactsService {
	private contactsMap = new Map<string, string>();
	private initialized = false;

	async initialize(csvContent: string, persist = true): Promise<void> {
		this.contactsMap.clear();

		const lines = csvContent.split(/\r?\n/);

		// Skip header (mid,profile_name)
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			// Extract values between quotes: "mid","name"
			const match = line.match(/^"([^"]+)","([^"]+)"$/);
			if (match) {
				this.contactsMap.set(match[1], match[2]);
			} else {
				// Fallback for unquoted or mixed format
				const parts = line.split(',');
				if (parts.length >= 2) {
					const mid = parts[0].replace(/^"|"$/g, '');
					const name = parts.slice(1).join(',').replace(/^"|"$/g, '');
					this.contactsMap.set(mid, name);
				}
			}
		}

		this.initialized = true;

		if (persist) await storageService.saveContacts(csvContent);
	}

	async loadFromStorage(): Promise<boolean> {
		try {
			const csvContent = await storageService.loadContacts();
			if (csvContent) {
				await this.initialize(csvContent, false);
				return true;
			}
		} catch (e) {
			console.error('Failed to load contacts from storage:', e);
		}
		return false;
	}

	isInitialized(): boolean {
		return this.initialized;
	}

	getContactName(mid: string): string | undefined {
		return this.contactsMap.get(mid);
	}

	getContactsCount(): number {
		return this.contactsMap.size;
	}

	clear(): void {
		this.contactsMap.clear();
		this.initialized = false;
	}
}

export const contactsService = new ContactsService();

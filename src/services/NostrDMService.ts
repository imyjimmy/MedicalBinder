import { SimplePool, Event, nip04, nip19, getPublicKey } from 'nostr-tools';
import { KeychainService } from './KeychainService';

interface DecryptedDM {
  id: string;
  content: string;
  fromPubkey: string;
  toPubkey: string;
  createdAt: number;
}

class NostrDMService {
  private pool: SimplePool;
  private relays = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.primal.net',
    'wss://relay.nostr.band'
  ];

  private static cachedDMs: DecryptedDM[] = [];
  private static lastSuccessfulFetch: number = 0;

  constructor() {
    this.pool = new SimplePool();
  }

  private npubToHex(npub: string): string {
    try {
      const { type, data } = nip19.decode(npub);
      if (type === 'npub') {
        return data as string;
      }
      throw new Error('Not a valid npub');
    } catch (error) {
      console.error('Failed to decode npub:', error);
      throw error;
    }
  }


  async getDirectMessages(userPubkey: string): Promise<DecryptedDM[]> {
    try {
      // Use same pattern as NostrKeyManager
      const credentials = await KeychainService.getNostrCredentials();
      if (!credentials?.privateKey) {
        throw new Error('No private key available');
      }

      // Convert npub to hex format for the relay filter
      const hexPubkey = this.npubToHex(userPubkey);
      console.log('Using hex pubkey for relay:', hexPubkey.substring(0, 16) + '...');

      // Subscribe to DMs sent TO this user (kind 4)
      const filter = {
        kinds: [4],
        '#p': [hexPubkey],
        // since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // Last 7 days
        limit: 100
      };

      console.log('🔍 About to query relays with filter:', filter);
      console.log('🔍 Relay pool state:', this.pool);
      console.log('🔍 Active relays:', this.relays);

      const events = await this.pool.querySync(this.relays, filter);
      console.log(`📬 Raw events from relay query:`, events);
      console.log(`📬 Found ${events.length} DM events`);

      // Decrypt and parse DMs
      const decryptedDMs: DecryptedDM[] = [];
      
      for (const event of events) {
        try {
          const decryptedContent = await nip04.decrypt(
            credentials.privateKey,
            event.pubkey,
            event.content
          );
          
          decryptedDMs.push({
            id: event.id,
            content: decryptedContent,
            fromPubkey: event.pubkey,
            toPubkey: userPubkey,
            createdAt: event.created_at
          });
        } catch (decryptError) {
          console.warn('Failed to decrypt DM:', decryptError);
        }
      }

      if (decryptedDMs.length > 0) {
        console.log(`💾 Caching ${decryptedDMs.length} DMs for fallback!`);
        NostrDMService.cachedDMs = decryptedDMs;
        NostrDMService.lastSuccessfulFetch = Date.now();
        return decryptedDMs.sort((a, b) => b.createdAt - a.createdAt);
      }
      
      // If we got no results, check if we have cached data
      if (decryptedDMs.length === 0 && NostrDMService.cachedDMs.length > 0) {
        const cacheAge = Date.now() - NostrDMService.lastSuccessfulFetch;
        const cacheMaxAge = 5 * 60 * 1000; // 5 minutes
        
        if (cacheAge < cacheMaxAge) {
          console.log(`📦 Using cached DMs (${NostrDMService.cachedDMs.length} items, age: ${Math.round(cacheAge/1000)}s)`);
          return NostrDMService.cachedDMs;
        } else {
          console.log(`📦 Cache expired (age: ${Math.round(cacheAge/1000)}s), returning empty`);
        }
      }

      return [];
      
    } catch (error) {
      console.error('Failed to fetch DMs:', error);
      return [];
    }
  }

  async getCurrentUserPubkey(): Promise<string> {
    const credentials = await KeychainService.getNostrCredentials();
    if (!credentials?.npub) {
      throw new Error('No public key available');
    }
    // Since you already have npub in credentials, we can extract the hex pubkey
    // or just use the existing public key if it's stored in hex format
    return credentials.npub; // This might need conversion from npub to hex
  }

  disconnect() {
    this.pool.close(this.relays);
  }
}

export default new NostrDMService();
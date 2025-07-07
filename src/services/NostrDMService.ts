import { SimplePool, Event, nip04, getPublicKey } from 'nostr-tools';
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

  constructor() {
    this.pool = new SimplePool();
  }

  async getDirectMessages(userPubkey: string): Promise<DecryptedDM[]> {
    try {
      // Use same pattern as NostrKeyManager
      const credentials = await KeychainService.getNostrCredentials();
      if (!credentials?.privateKey) {
        throw new Error('No private key available');
      }

      // Subscribe to DMs sent TO this user (kind 4)
      const filter = {
        kinds: [4],
        '#p': [userPubkey],
        since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // Last 7 days
        limit: 100
      };

      const events = await this.pool.querySync(this.relays, filter);
      
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
      
      return decryptedDMs.sort((a, b) => b.createdAt - a.createdAt);
      
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
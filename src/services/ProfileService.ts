import { bech32 } from 'bech32';

interface NostrProfile {
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
}

class ProfileServiceClass {
  private profileCache: Map<string, NostrProfile | null> = new Map();
  private fetchPromises: Map<string, Promise<NostrProfile | null>> = new Map();

  async getProfile(pubkey: string): Promise<NostrProfile | null> {
    // Return cached result if available
    if (this.profileCache.has(pubkey)) {
      return this.profileCache.get(pubkey) || null;
    }

    // Return existing promise if fetch is in progress
    if (this.fetchPromises.has(pubkey)) {
      return this.fetchPromises.get(pubkey) || null;
    }

    // Start new fetch
    const fetchPromise = this.fetchProfileFromNostr(pubkey);
    this.fetchPromises.set(pubkey, fetchPromise);

    try {
      const profile = await fetchPromise;
      this.profileCache.set(pubkey, profile);
      return profile;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      this.profileCache.set(pubkey, null);
      return null;
    } finally {
      this.fetchPromises.delete(pubkey);
    }
  }

  clearCache() {
    this.profileCache.clear();
    this.fetchPromises.clear();
  }

  private bech32ToHex(bech32Str: string): string {
    const decoded = bech32.decode(bech32Str);
    const bytes = bech32.fromWords(decoded.words);
    if (bytes.length !== 32) throw new Error('Invalid public key length');  
    return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private async fetchProfileFromNostr(pubkey: string): Promise<NostrProfile | null> {
    console.log('🔍 Fetching profile for pubkey:', pubkey.substring(0, 20) + '...');
    
    // Convert npub to hex
    const hexPubkey = this.bech32ToHex(pubkey);
    console.log('🔑 Converted to hex:', hexPubkey.substring(0, 20) + '...');
    
    return this.fetchNostrMetadata(hexPubkey);
  }

  private fetchNostrMetadata(pubkey: string, timeoutMs = 10000): Promise<NostrProfile | null> {
    return new Promise((resolve, reject) => {
      const relays = [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.snort.social',
        'wss://relay.nostr.band'
      ];
      
      let currentRelayIndex = 0;
      
      const tryNextRelay = () => {
        if (currentRelayIndex >= relays.length) {
          reject(new Error('All relays failed to provide metadata'));
          return;
        }
        
        const relayUrl = relays[currentRelayIndex++];
        console.log(`Trying relay: ${relayUrl}`);
        
        this.tryFetchFromRelay(relayUrl, pubkey, timeoutMs / relays.length)
          .then(resolve)
          .catch((error) => {
            console.log(`Relay ${relayUrl} failed: ${error.message}`);
            tryNextRelay();
          });
      };
      
      tryNextRelay();
    });
  }

  private tryFetchFromRelay(relayUrl: string, hexPubkey: string, timeoutMs: number): Promise<NostrProfile | null> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(relayUrl);
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          reject(new Error('Timeout'));
        }
      }, timeoutMs);
      
      ws.onopen = () => {
        console.log('Connected to relay:', relayUrl);
        
        const subscription = {
          id: 'profile_' + Math.random().toString(36).substring(7),
          kinds: [0],
          authors: [hexPubkey],
          limit: 1
        };
        
        ws.send(JSON.stringify(['REQ', subscription.id, subscription]));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message[0] === 'EVENT' && message[2]?.kind === 0) {
            const profileEvent = message[2];
            const profile = JSON.parse(profileEvent.content);
            
            console.log('Found profile:', profile.name || profile.display_name || 'unnamed');
            
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              ws.close();
              resolve(profile);
            }
          }
        } catch (error) {
          console.error('Error parsing relay message:', error);
        }
      };
      
      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        }
      };
      
      ws.onclose = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error('Connection closed'));
        }
      };
    });
  }

  getCachedProfile(pubkey: string): NostrProfile | null {
    return this.profileCache.get(pubkey) || null;
  }

}

export const ProfileService = new ProfileServiceClass();
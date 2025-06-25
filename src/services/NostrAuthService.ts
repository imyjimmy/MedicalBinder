import { KeychainService } from './KeychainService';
import { 
  NostrKeyPair, 
  NostrEvent, 
  NostrAuthChallenge, 
  NostrAuthResponse,
  StoredNostrCredentials,
  NostrProfile
} from '../types/nostr';

// Use react-native-crypto for native crypto operations
import CryptoJS from 'crypto-js';
import { bech32 } from 'bech32';

export class NostrAuthService {

  /**
   * Generate a new NOSTR key pair using React Native crypto
   */
  static generateKeyPair(): NostrKeyPair {
    // Generate 32 random bytes for private key
    const privateKeyHex = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    
    // For now, we'll use a placeholder public key derivation
    // In a real implementation, you'd use secp256k1 curve
    const publicKeyHex = this.derivePublicKey(privateKeyHex);
    
    const npub = this.encodeNpub(publicKeyHex);
    const nsec = this.encodeNsec(privateKeyHex);

    return {
      privateKey: privateKeyHex,
      publicKey: publicKeyHex,
      npub,
      nsec
    };
  }

  /**
   * Import from hex private key
   */
  static importFromHex(hexPrivateKey: string): NostrKeyPair | null {
    try {
      if (!/^[0-9a-fA-F]{64}$/.test(hexPrivateKey)) {
        throw new Error('Invalid hex format');
      }

      const publicKeyHex = this.derivePublicKey(hexPrivateKey);
      const npub = this.encodeNpub(publicKeyHex);
      const nsec = this.encodeNsec(hexPrivateKey);

      return {
        privateKey: hexPrivateKey,
        publicKey: publicKeyHex,
        npub,
        nsec
      };
    } catch (error) {
      console.error('Failed to import hex key:', error);
      return null;
    }
  }

  /**
   * Import from nsec (bech32 format) OR hex
   */
  static importFromNsec(nsec: string): NostrKeyPair | null {
    try {
      console.log('Importing key, input:', nsec.substring(0, 10) + '...');
      
      // If it's already hex, use it directly
      if (/^[0-9a-fA-F]{64}$/.test(nsec)) {
        console.log('Detected hex format, importing directly');
        return this.importFromHex(nsec);
      }
      
      // If it starts with nsec1, try bech32 decode
      if (nsec.startsWith('nsec1')) {
        console.log('Detected nsec format, attempting bech32 decode');
        const privateKeyHex = this.decodeBech32(nsec);
        console.log('Decoded hex length:', privateKeyHex?.length);
        console.log('Decoded hex preview:', privateKeyHex?.substring(0, 16) + '...');
        
        if (!privateKeyHex || privateKeyHex.length !== 64) {
          throw new Error(`Invalid nsec - decoded to ${privateKeyHex?.length || 0} characters, expected 64`);
        }
        return this.importFromHex(privateKeyHex);
      }
      
      throw new Error('Invalid format - expected 64-character hex or nsec1...');
      
    } catch (error) {
      console.error('Failed to import key:', error);
      return null;
    }
  }

  /**
   * Fetch user profile from NOSTR relays
   */
  static async fetchUserProfile(publicKeyHex: string): Promise<NostrProfile | null> {
    try {
      console.log('Fetching profile for pubkey:', publicKeyHex.substring(0, 16) + '...');
      
      // List of popular NOSTR relays
      const relays = [
        'wss://relay.damus.io',
        'wss://nos.lol', 
        'wss://relay.snort.social',
        'wss://relay.nostr.band'
      ];

      return new Promise((resolve) => {
        let resolved = false;
        let connectionsActive = 0;
        
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.log('Profile fetch timeout');
            resolve(null);
          }
        }, 10000); // 10 second timeout

        relays.forEach((relayUrl) => {
          try {
            const ws = new WebSocket(relayUrl);
            connectionsActive++;
            
            ws.onopen = () => {
              console.log('Connected to relay:', relayUrl);
              
              // Subscribe to user metadata (kind 0 events)
              const subscription = {
                id: 'profile_' + Math.random().toString(36).substring(7),
                kinds: [0],
                authors: [publicKeyHex],
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
                    resolve(profile);
                  }
                  
                  ws.close();
                }
              } catch (error) {
                console.error('Error parsing relay message:', error);
              }
            };
            
            ws.onerror = (error) => {
              console.error('WebSocket error for', relayUrl, error);
              connectionsActive--;
              
              if (connectionsActive === 0 && !resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve(null);
              }
            };
            
            ws.onclose = () => {
              connectionsActive--;
              
              if (connectionsActive === 0 && !resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve(null);
              }
            };
            
          } catch (error) {
            console.error('Failed to connect to relay:', relayUrl, error);
            connectionsActive--;
          }
        });
        
        // If no connections were made
        if (connectionsActive === 0) {
          clearTimeout(timeout);
          resolve(null);
        }
      });
      
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  }

  /**
   * Get current user's public key
   */
  static async getCurrentUserPubkey(): Promise<string | null> {
    const credentials = await KeychainService.getNostrCredentials();
    return credentials ? credentials.npub : null;
  }

  /**
   * Logout - clear all stored credentials and tokens
   */
  static async logout(): Promise<boolean> {
    try {
      await KeychainService.deleteNostrCredentials();
      return true;
    } catch (error) {
      console.error('Failed to logout:', error);
      return false;
    }
  }

  /**
   * Store new NOSTR credentials (for first-time setup or key import)
   */
  static async storeCredentials(keyPair: NostrKeyPair): Promise<boolean> {
    const credentials: StoredNostrCredentials = {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      npub: keyPair.npub,
      nsec: keyPair.nsec,
      lastLoginAt: new Date().toISOString(),
    };

    return await KeychainService.storeNostrCredentials(credentials);
  }

  // Helper methods (simplified implementations)
  private static derivePublicKey(privateKeyHex: string): string {
    // This is a PLACEHOLDER - you need proper secp256k1 implementation
    // For now, just hash the private key as a demo
    return CryptoJS.SHA256(privateKeyHex).toString(CryptoJS.enc.Hex);
  }

  private static encodeNpub(publicKeyHex: string): string {
    // Simplified bech32 encoding - use proper library in production
    return `npub1${publicKeyHex.substring(0, 48)}`;
  }

  private static encodeNsec(privateKeyHex: string): string {
    // Simplified bech32 encoding - use proper library in production
    return `nsec1${privateKeyHex.substring(0, 48)}`;
  }

  private static decodeBech32(bech32String: string): string {
    try {
      console.log('Decoding bech32 with proper library:', bech32String.substring(0, 20) + '...');
      
      // Use proper bech32 library
      const decoded = bech32.decode(bech32String);
      console.log('Bech32 decoded, hrp:', decoded.hrp, 'data length:', decoded.words.length);
      
      // Convert from 5-bit to 8-bit
      const bytes = bech32.fromWords(decoded.words);
      console.log('Converted to bytes, length:', bytes.length);
      
      // Convert to hex
      const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
      console.log('Final hex length:', hex.length);
      
      return hex;
      
    } catch (error) {
      console.error('Bech32 decode error:', error);
      throw new Error(`Bech32 decode failed: ${error.message}`);
    }
  }
}
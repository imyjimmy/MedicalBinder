import { KeychainService } from './KeychainService';
import { 
  NostrKeyPair, 
  NostrEvent, 
  NostrAuthChallenge, 
  NostrAuthResponse,
  StoredNostrCredentials 
} from '../types/nostr';

// Use react-native-crypto for native crypto operations
import CryptoJS from 'crypto-js';
import { bech32 } from 'bech32';

// Default MGit server URL
const DEFAULT_SERVER_URL = 'http://localhost:3003';

export class NostrAuthService {
  private static serverUrl = DEFAULT_SERVER_URL;

  static setServerUrl(url: string) {
    this.serverUrl = url;
  }

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
   * Sign challenge using stored credentials
   */
  static async signChallenge(challenge: string): Promise<NostrEvent | null> {
    try {
      const credentials = await KeychainService.getNostrCredentials();
      if (!credentials) {
        throw new Error('No stored credentials found');
      }

      // Create event
      const event = {
        kind: 1,
        content: challenge,
        tags: [['challenge', challenge]],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: credentials.publicKey,
      };

      // Create event hash (simplified)
      const eventString = JSON.stringify([
        0,
        event.pubkey,
        event.created_at,
        event.kind,
        event.tags,
        event.content
      ]);
      
      const eventHash = CryptoJS.SHA256(eventString).toString(CryptoJS.enc.Hex);
      
      // Sign the hash
      const signature = this.signHash(eventHash, credentials.privateKey);

      return {
        ...event,
        id: eventHash,
        sig: signature
      };
    } catch (error) {
      console.error('Failed to sign challenge:', error);
      return null;
    }
  }

  /**
   * Authenticate with server
   */
  static async authenticateWithServer(): Promise<NostrAuthResponse> {
    try {
      // Get challenge
      const challengeResponse = await fetch(`${this.serverUrl}/api/auth/nostr/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to get challenge');
      }

      const challengeData: NostrAuthChallenge = await challengeResponse.json();

      // Sign challenge
      const signedEvent = await this.signChallenge(challengeData.challenge);
      if (!signedEvent) {
        throw new Error('Failed to sign challenge');
      }

      // Verify with server
      const verifyResponse = await fetch(`${this.serverUrl}/api/auth/nostr/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedEvent }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Server rejected signature');
      }

      const authResult: NostrAuthResponse = await verifyResponse.json();

      // Store token if successful
      if (authResult.status === 'OK' && authResult.token) {
        await KeychainService.storeServerToken(authResult.token);
        
        const credentials = await KeychainService.getNostrCredentials();
        if (credentials) {
          const updatedCredentials: StoredNostrCredentials = {
            ...credentials,
            lastLoginAt: new Date().toISOString(),
            serverToken: authResult.token,
          };
          await KeychainService.storeNostrCredentials(updatedCredentials);
        }
      }

      return authResult;
    } catch (error) {
      console.error('Authentication failed:', error);
      return {
        status: 'error',
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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

  private static signHash(hash: string, privateKeyHex: string): string {
    // This is a PLACEHOLDER - you need proper ECDSA signing
    // For now, just create a demo signature
    const combined = hash + privateKeyHex;
    return CryptoJS.SHA256(combined).toString(CryptoJS.enc.Hex);
  }

  // Standard methods
  static async isAuthenticated(): Promise<boolean> {
    const hasCredentials = await KeychainService.hasStoredCredentials();
    const hasToken = await KeychainService.getServerToken();
    return hasCredentials && !!hasToken;
  }

  static async getCurrentUserPubkey(): Promise<string | null> {
    const credentials = await KeychainService.getNostrCredentials();
    return credentials ? credentials.npub : null;
  }

  static async logout(): Promise<boolean> {
    try {
      await KeychainService.deleteNostrCredentials();
      await KeychainService.deleteServerToken();
      return true;
    } catch (error) {
      console.error('Failed to logout:', error);
      return false;
    }
  }

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
}
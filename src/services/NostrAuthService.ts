import 'react-native-get-random-values';
import { generateSecretKey, getPublicKey, finishEvent, nip19 } from 'nostr-tools';
import { 
  NostrKeyPair, 
  NostrEvent, 
  NostrAuthChallenge, 
  NostrAuthResponse,
  StoredNostrCredentials 
} from '../types/nostr';
import { KeychainService } from './KeychainService';

// Default MGit server URL - make this configurable
const DEFAULT_SERVER_URL = 'http://localhost:3003';

export class NostrAuthService {
  private static serverUrl = DEFAULT_SERVER_URL;

  /**
   * Configure the MGit server URL
   */
  static setServerUrl(url: string) {
    this.serverUrl = url;
  }

  /**
   * Generate a new NOSTR key pair
   */
  static generateKeyPair(): NostrKeyPair {
    const privateKey = generateSecretKey();
    const publicKey = getPublicKey(privateKey);
    
    const npub = nip19.npubEncode(publicKey);
    const nsec = nip19.nsecEncode(privateKey);

    return {
      privateKey: Buffer.from(privateKey).toString('hex'),
      publicKey,
      npub,
      nsec
    };
  }

  /**
   * Import key pair from nsec (private key)
   */
  static importFromNsec(nsec: string): NostrKeyPair | null {
    try {
      const decoded = nip19.decode(nsec);
      if (decoded.type !== 'nsec') {
        throw new Error('Invalid nsec format');
      }
      
      const privateKey = decoded.data as Uint8Array;
      const publicKey = getPublicKey(privateKey);
      const npub = nip19.npubEncode(publicKey);

      return {
        privateKey: Buffer.from(privateKey).toString('hex'),
        publicKey,
        npub,
        nsec
      };
    } catch (error) {
      console.error('Failed to import nsec:', error);
      return null;
    }
  }

  /**
   * Import key pair from hex private key
   */
  static importFromHex(hexPrivateKey: string): NostrKeyPair | null {
    try {
      const privateKey = new Uint8Array(Buffer.from(hexPrivateKey, 'hex'));
      const publicKey = getPublicKey(privateKey);
      
      const npub = nip19.npubEncode(publicKey);
      const nsec = nip19.nsecEncode(privateKey);

      return {
        privateKey: hexPrivateKey,
        publicKey,
        npub,
        nsec
      };
    } catch (error) {
      console.error('Failed to import hex key:', error);
      return null;
    }
  }

  /**
   * Sign a challenge with the stored private key
   */
  static async signChallenge(challenge: string): Promise<NostrEvent | null> {
    try {
      const credentials = await KeychainService.getNostrCredentials();
      if (!credentials) {
        throw new Error('No stored credentials found');
      }

      const privateKey = new Uint8Array(Buffer.from(credentials.privateKey, 'hex'));
      
      const event = {
        kind: 1,
        content: challenge,
        tags: [['challenge', challenge]],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: credentials.publicKey,
      };

      const signedEvent = finishEvent(event, privateKey);
      return signedEvent;
    } catch (error) {
      console.error('Failed to sign challenge:', error);
      return null;
    }
  }

  /**
   * Perform full authentication flow with MGit server
   */
  static async authenticateWithServer(): Promise<NostrAuthResponse> {
    try {
      // Step 1: Get challenge from server
      const challengeResponse = await fetch(`${this.serverUrl}/api/auth/nostr/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to get challenge from server');
      }

      const challengeData: NostrAuthChallenge = await challengeResponse.json();

      // Step 2: Sign the challenge
      const signedEvent = await this.signChallenge(challengeData.challenge);
      if (!signedEvent) {
        throw new Error('Failed to sign challenge');
      }

      // Step 3: Submit signed challenge for verification
      const verifyResponse = await fetch(`${this.serverUrl}/api/auth/nostr/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signedEvent }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Server rejected signed challenge');
      }

      const authResult: NostrAuthResponse = await verifyResponse.json();

      // Step 4: Store server token if authentication successful
      if (authResult.status === 'OK' && authResult.token) {
        await KeychainService.storeServerToken(authResult.token);
        
        // Update stored credentials with latest info
        const credentials = await KeychainService.getNostrCredentials();
        if (credentials) {
          const updatedCredentials: StoredNostrCredentials = {
            ...credentials,
            lastLoginAt: new Date().toISOString(),
            serverToken: authResult.token,
            profile: authResult.metadata || credentials.profile,
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

  /**
   * Check if user is currently authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const hasCredentials = await KeychainService.hasStoredCredentials();
    const hasToken = await KeychainService.getServerToken();
    return hasCredentials && !!hasToken;
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
      await KeychainService.deleteServerToken();
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
}
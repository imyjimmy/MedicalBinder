import { KeychainService } from './KeychainService';
import { 
  NostrKeyPair, 
  StoredNostrCredentials,
  NostrProfile
} from '../types/nostr';

import CryptoJS from 'crypto-js';
import { bech32 } from 'bech32';
import * as secp256k1 from '@noble/secp256k1';

// Helper functions - defined outside the class to avoid method resolution issues
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function decodeBech32(bech32String: string): string {
  try {
    console.log('Decoding bech32:', bech32String.substring(0, 20) + '...');
    
    const decoded = bech32.decode(bech32String);
    console.log('Bech32 decoded, prefix:', decoded.prefix, 'data length:', decoded.words.length);
    
    const bytes = bech32.fromWords(decoded.words);
    console.log('Converted to bytes, length:', bytes.length);
    
    const hex = bytesToHex(new Uint8Array(bytes));
    console.log('Final hex length:', hex.length);
    
    return hex;
  } catch (error: any) {
    console.error('Bech32 decode error:', error);
    throw new Error(`Bech32 decode failed: ${error.message}`);
  }
}

function encodeNpub(publicKeyHex: string): string {
  try {
    const publicKeyBytes = hexToBytes(publicKeyHex);
    const xOnlyBytes = publicKeyBytes.slice(1, 33); // Remove prefix
    const words = bech32.toWords(xOnlyBytes);
    return bech32.encode('npub', words);
  } catch (error) {
    console.error('Failed to encode npub:', error);
    return `npub1${publicKeyHex.substring(2, 50)}`;
  }
}

function encodeNsec(privateKeyHex: string): string {
  try {
    const privateKeyBytes = hexToBytes(privateKeyHex);
    const words = bech32.toWords(privateKeyBytes);
    return bech32.encode('nsec', words);
  } catch (error) {
    console.error('Failed to encode nsec:', error);
    return `nsec1${privateKeyHex.substring(0, 48)}`;
  }
}

export class NostrAuthService {

  static generateKeyPair(): NostrKeyPair {
    const privateKeyBytes = secp256k1.utils.randomPrivateKey();
    const privateKeyHex = bytesToHex(privateKeyBytes);
    
    const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes);
    const publicKeyHex = bytesToHex(publicKeyBytes);
    
    return {
      privateKey: privateKeyHex,
      publicKey: publicKeyHex,
      npub: encodeNpub(publicKeyHex),
      nsec: encodeNsec(privateKeyHex)
    };
  }

  static importFromHex(hexPrivateKey: string): NostrKeyPair | null {
    try {
      console.log('003 Importing hex key:', hexPrivateKey.substring(0, 16) + '...');
      
      if (!/^[0-9a-fA-F]{64}$/.test(hexPrivateKey)) {
        throw new Error('Invalid hex format - must be 64 hex characters');
      }

      const privateKeyBytes = hexToBytes(hexPrivateKey);
      console.log('Private key bytes length:', privateKeyBytes.length);
      
      const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes);
      const publicKeyHex = bytesToHex(publicKeyBytes);

      console.log('Generated public key:', '...' + encodeNpub(publicKeyHex).slice(-6));

      return {
        privateKey: hexPrivateKey,
        publicKey: publicKeyHex,
        npub: encodeNpub(publicKeyHex),
        nsec: encodeNsec(hexPrivateKey)
      };
    } catch (error) {
      console.error('Failed to import hex key:', error);
      return null;
    }
  }

  static importFromNsec(nsec: string): NostrKeyPair | null {
    try {
      console.log('004 Importing key:', nsec.substring(0, 10) + '...');
      
      // If it's hex, import directly
      if (/^[0-9a-fA-F]{64}$/.test(nsec)) {
        console.log('Detected hex format');
        return NostrAuthService.importFromHex(nsec);
      }
      
      // If it's nsec, decode first
      if (nsec.startsWith('nsec1')) {
        console.log('Detected nsec format');
        const privateKeyHex = decodeBech32(nsec);
        console.log('Decoded hex length:', privateKeyHex?.length);
        
        if (!privateKeyHex || privateKeyHex.length !== 64) {
          throw new Error(`Invalid nsec - decoded to ${privateKeyHex?.length || 0} characters, expected 64`);
        }
        return NostrAuthService.importFromHex(privateKeyHex);
      }
      
      throw new Error('Invalid format - expected 64-character hex or nsec1...');
      
    } catch (error) {
      console.error('005 Failed to import key:', error);
      return null;
    }
  }

  static async fetchUserProfile(publicKeyHex: string): Promise<NostrProfile | null> {
    try {
      console.log('Fetching profile for pubkey:', publicKeyHex.substring(0, 16) + '...');
      
      const relays = [
        'wss://relay.damus.io',
        'wss://nos.lol', 
        'wss://relay.snort.social'
      ];

      return new Promise((resolve) => {
        let resolved = false;
        let connectionsActive = 0;
        
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        }, 10000);

        relays.forEach((relayUrl) => {
          try {
            const ws = new WebSocket(relayUrl);
            connectionsActive++;
            
            ws.onopen = () => {
              console.log('Connected to relay:', relayUrl);
              
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
            
            ws.onerror = () => {
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
            connectionsActive--;
          }
        });
        
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

  static async getCurrentUserPubkey(): Promise<string | null> {
    const credentials = await KeychainService.getNostrCredentials();
    return credentials ? credentials.npub : null;
  }

  static async logout(): Promise<boolean> {
    try {
      await KeychainService.deleteNostrCredentials();
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
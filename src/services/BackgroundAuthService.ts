// services/BackgroundAuthService.js
import { KeychainService } from './KeychainService';
import * as secp256k1 from '@noble/secp256k1';
import CryptoJS from 'crypto-js';
import { bytesToHex, hexToBytes } from '../utils/bytesHexUtils';
import { finalizeEvent } from 'nostr-tools/pure';

class BackgroundAuthService {
  /**
   * Sign a challenge using Nostr event format (matching nos2x)
   */
  static async signChallenge(challenge: string, privateKeyHex: string): Promise<any> {
    try {
      // Create the same event structure as nos2x
      const event = {
        kind: 1,
        content: challenge,
        tags: [["challenge", challenge]],
        created_at: Math.floor(Date.now() / 1000)
      };
      
      // Use nostr-tools to finalize/sign the event (same as nos2x)
      const privateKeyBytes = hexToBytes(privateKeyHex);
      const signedEvent = finalizeEvent(event, privateKeyBytes);
      
      console.log('signed event: ', signedEvent)
      return signedEvent;
    } catch (error) {
      console.error('Failed to sign challenge:', error);
      throw error;
    }
  }

  /**
   * Get general JWT for WebRTC/video calls
   */
  static async getGeneralJWT(baseUrl: string): Promise<string | null> {
    try {
      // Step 1: Get stored credentials from keychain
      const credentials = await KeychainService.getNostrCredentials();
      if (!credentials) {
        console.error('No stored credentials found');
        return null;
      }

      const { publicKey, privateKey } = credentials;
      console.log('Using pubkey for auth:', publicKey.substring(0, 16) + '...');
      
      // Step 2: Request challenge from server
      const challengeResponse = await fetch(`${baseUrl}/api/auth/nostr/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubkey: publicKey })
      });
      
      if (!challengeResponse.ok) {
        console.error('Failed to get challenge:', challengeResponse.status);
        return null;
      }
      
      const { challenge } = await challengeResponse.json();
      console.log('Received challenge:', challenge.substring(0, 20) + '...');
      
      // Step 3: Sign challenge as Nostr event (same as nos2x)
      const signedEvent = await this.signChallenge(challenge, privateKey);
      console.log('Generated signed event:', JSON.stringify(signedEvent).substring(0, 100) + '...');
      
      // Step 4: Verify signature and get JWT
      const verifyResponse = await fetch(`${baseUrl}/api/auth/nostr/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedEvent: signedEvent })
      });
      
      if (!verifyResponse.ok) {
        console.error('Authentication failed:', verifyResponse.status);
        const errorText = await verifyResponse.text();
        console.error('Auth error details:', errorText);
        return null;
      }
      
      const { token } = await verifyResponse.json();
      console.log('Received JWT token:', token.substring(0, 30) + '...');
      
      return token;
      
    } catch (error) {
      console.error('Background auth failed:', error);
      return null;
    }
  }

  /**
   * Get cached JWT or authenticate if needed
   */
  static async getOrCreateJWT(baseUrl: string): Promise<string | null> {
    try {
      // Try to get cached token first
      const cachedToken = await KeychainService.getServerToken();
      
      if (cachedToken) {
        // TODO: Add JWT expiration check here if needed
        console.log('Using cached JWT token');
        return cachedToken;
      }
      
      // Get new token and cache it
      const newToken = await this.getGeneralJWT(baseUrl);
      
      if (newToken) {
        await KeychainService.storeServerToken(newToken);
        console.log('Cached new JWT token');
      }
      
      return newToken;
      
    } catch (error) {
      console.error('Failed to get/create JWT:', error);
      return null;
    }
  }
}

export default BackgroundAuthService;
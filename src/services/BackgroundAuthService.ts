// services/BackgroundAuthService.js
import { KeychainService } from './KeychainService';
import * as secp256k1 from '@noble/secp256k1';
import CryptoJS from 'crypto-js';
import { bytesToHex, hexToBytes } from '../utils/bytesHexUtils';
import { finalizeEvent } from 'nostr-tools/pure';
import { base64UrlDecode } from '../utils/base64Utils';

class BackgroundAuthService {
  /**
   * Check if JWT token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      // JWT format: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      // Decode the payload (base64url)
      const decodedPayload = base64UrlDecode(parts[1])
      const payloadObj = JSON.parse(decodedPayload);
      
      // Check expiration (exp is in seconds, Date.now() is in milliseconds)
      if (!payloadObj.exp) return true;
      
      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired = currentTime >= payloadObj.exp;
      
      console.log(`Token expires at: ${new Date(payloadObj.exp * 1000).toISOString()}`);
      console.log(`Current time: ${new Date().toISOString()}`);
      console.log(`Token expired: ${isExpired}`);
      
      return isExpired;
      
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // Assume expired if we can't parse it
    }
  }

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
        // Check if token is expired
        if (!this.isTokenExpired(cachedToken)) {
          console.log('Using cached JWT token (still valid)');
          return cachedToken;
        } else {
          console.log('Cached JWT token expired, getting new one');
          // Clear expired token
          await KeychainService.deleteServerToken();
        }
      }
      
      // Get new token and cache it
      console.log('Authenticating for new JWT token...');
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
import * as Keychain from 'react-native-keychain';
import { StoredNostrCredentials } from '../types/nostr';

const NOSTR_CREDENTIALS_KEY = 'medicalbinder_nostr_credentials';
const SERVER_TOKEN_KEY = 'medicalbinder_server_token';

export class KeychainService {
  
  /**
   * Store NOSTR credentials securely in iOS Keychain
   */
  static async storeNostrCredentials(credentials: StoredNostrCredentials): Promise<boolean> {
    try {
      const result = await Keychain.setInternetCredentials(
        NOSTR_CREDENTIALS_KEY,
        credentials.npub, // username = npub for identification
        JSON.stringify(credentials), // password = full credentials JSON
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
          accessGroup: undefined,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }
      );
      return result !== false;
    } catch (error) {
      console.error('Failed to store NOSTR credentials:', error);
      return false;
    }
  }

  /**
   * Retrieve NOSTR credentials from iOS Keychain
   */
  static async getNostrCredentials(): Promise<StoredNostrCredentials | null> {
    try {
      const result = await Keychain.getInternetCredentials(NOSTR_CREDENTIALS_KEY, {
        authenticationPrompt: {
          title: 'Authenticate to access your NOSTR identity',
          subtitle: 'Use your biometric or device passcode',
          description: 'MedicalBinder needs to access your stored NOSTR private key',
          fallbackLabel: 'Use Passcode',
          negativeText: 'Cancel',
        },
      });

      if (result && result.password) {
        return JSON.parse(result.password) as StoredNostrCredentials;
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve NOSTR credentials:', error);
      return null;
    }
  }

  /**
   * Check if NOSTR credentials exist without triggering biometric prompt
   */
  static async hasStoredCredentials(): Promise<boolean> {
    try {
      const result = await Keychain.hasInternetCredentials(NOSTR_CREDENTIALS_KEY);
      return result;
    } catch (error) {
      console.error('Failed to check for stored credentials:', error);
      return false;
    }
  }

  /**
   * Delete stored NOSTR credentials
   */
  static async deleteNostrCredentials(): Promise<boolean> {
    try {
      const result = await Keychain.resetInternetCredentials(NOSTR_CREDENTIALS_KEY);
      return result;
    } catch (error) {
      console.error('Failed to delete NOSTR credentials:', error);
      return false;
    }
  }

  /**
   * Store server authentication token
   */
  static async storeServerToken(token: string): Promise<boolean> {
    try {
      const result = await Keychain.setInternetCredentials(
        SERVER_TOKEN_KEY,
        'server_token',
        token,
        {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }
      );
      return result !== false;
    } catch (error) {
      console.error('Failed to store server token:', error);
      return false;
    }
  }

  /**
   * Retrieve server authentication token
   */
  static async getServerToken(): Promise<string | null> {
    try {
      const result = await Keychain.getInternetCredentials(SERVER_TOKEN_KEY);
      return result ? result.password : null;
    } catch (error) {
      console.error('Failed to retrieve server token:', error);
      return null;
    }
  }

  /**
   * Delete server authentication token
   */
  static async deleteServerToken(): Promise<boolean> {
    try {
      const result = await Keychain.resetInternetCredentials(SERVER_TOKEN_KEY);
      return result;
    } catch (error) {
      console.error('Failed to delete server token:', error);
      return false;
    }
  }
}
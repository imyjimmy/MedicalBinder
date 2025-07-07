import { webln } from "@getalby/sdk";
import { LIGHTNING_CONFIG } from '../config/lightning';

class LightningService {
  constructor() {
    this.nwc = null;
    this.connected = false;
  }

  async connect() {
    try {
      console.log('Connecting to Lightning wallet via NWC...');
      
      if (!LIGHTNING_CONFIG.PATIENT_NWC_CONNECTION_STRING) {
        throw new Error('No NWC connection string configured');
      }

      this.nwc = new webln.NostrWebLNProvider({
        nostrWalletConnectUrl: LIGHTNING_CONFIG.PATIENT_NWC_CONNECTION_STRING
      });

      await this.nwc.enable();
      this.connected = true;
      
      console.log('Lightning wallet connected successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect Lightning wallet:', error);
      this.connected = false;
      throw error;
    }
  }

  async payInvoice(paymentRequest) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      console.log('Paying invoice:', paymentRequest.substring(0, 50) + '...');
      
      const response = await this.nwc.sendPayment(paymentRequest);
      
      console.log('Payment successful:', response);
      return {
        success: true,
        preimage: response.preimage,
        paymentHash: response.payment_hash || response.paymentHash,
        feePaid: response.fee
      };
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    }
  }

  async getBalance() {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const balance = await this.nwc.getBalance();
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  disconnect() {
    this.nwc = null;
    this.connected = false;
    console.log('Lightning wallet disconnected');
  }
}

export default new LightningService();
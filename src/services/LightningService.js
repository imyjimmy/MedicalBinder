import "../../applyGlobalPolyfills";
import { webln } from "@getalby/sdk";
import { LIGHTNING_CONFIG } from '../config/lightning';

class LightningService {
  constructor() {
    this.provider = null;
    this.connected = false;
  }

  async connect() {
    try {
      console.log('🔍 Creating NostrWebLNProvider like Alby example...');
      
      this.provider = new webln.NostrWebLNProvider({
        nostrWalletConnectUrl: LIGHTNING_CONFIG.PATIENT_NWC_CONNECTION_STRING,
      });
      
      await this.provider.enable();
      this.connected = true;
      console.log('✅ NostrWebLNProvider connected');
      return true;
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.connected = false;
      throw error;
    }
  }

  async getBalance() {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const response = await this.provider.getBalance();
      console.log('✅ Balance response:', response);
      return response.balance;
    } catch (error) {
      console.error('❌ Get balance failed:', error);
      throw error;
    }
  }

  async payInvoice(paymentRequest) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      console.log('💳 Paying invoice:', paymentRequest.substring(0, 20) + '...');
      
      const response = await this.provider.sendPayment(paymentRequest);
      console.log('✅ Payment response:', response);
      
      return {
        success: true,
        preimage: response.preimage,
        paymentHash: response.payment_hash,
        feePaid: response.fee_msat ? Math.floor(response.fee_msat / 1000) : 0
      };
    } catch (error) {
      console.error('❌ Payment failed:', error);
      throw error;
    }
  }
}

export default new LightningService();
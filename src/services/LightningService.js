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
}

export default new LightningService();
import "websocket-polyfill";
import { nwc } from "@getalby/sdk";
import { LIGHTNING_CONFIG } from '../config/lightning';

class LightningService {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async testRelayDirectly() {
    try {
      console.log('🔍 Testing relay.getalby.com directly...');
      
      // Use the EXACT same pattern as ProfileService
      const ws = new WebSocket('wss://relay.getalby.com/v1');
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          console.log('❌ relay.getalby.com timed out');
        }
      }, 5000);
      
      ws.onopen = () => {
        console.log('✅ Connected to relay.getalby.com');
        
        // Send a simple REQ to test if relay responds
        const subscription_id = 'test_' + Math.random().toString(36).substring(7);
        const subscription = {
          kinds: [0], // Profile events
          limit: 1
        };
        
        ws.send(JSON.stringify(['REQ', subscription_id, subscription]));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('✅ relay.getalby.com responded:', message[0]);
          
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
      
      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.log('❌ relay.getalby.com WebSocket error');
        }
      };
      
      ws.onclose = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.log('❌ relay.getalby.com connection closed');
        }
      };
      
    } catch (error) {
      console.error('❌ Relay test failed:', error);
    }
  }
  
  async connect() {
    try {
      console.log('🔍 Creating NWCClient...');
      console.log('🔍 Connection string preview:', LIGHTNING_CONFIG.PATIENT_NWC_CONNECTION_STRING?.substring(0, 50) + '...');
      
      if (!LIGHTNING_CONFIG.PATIENT_NWC_CONNECTION_STRING) {
        throw new Error('❌ No NWC connection string configured');
      }

      // Create NWCClient
      this.client = new nwc.NWCClient({
        nostrWalletConnectUrl: LIGHTNING_CONFIG.PATIENT_NWC_CONNECTION_STRING,
      });
      
      this.connected = true;
      console.log('✅ NWCClient created successfully');
      return true;
    } catch (error) {
      console.error('❌ NWCClient creation failed:', error);
      this.connected = false;
      throw error;
    }
  }

  async getBalance() {
    if (!this.connected) {
      await this.connect();
    }

    try {
      console.log('🔍 Requesting balance...');
      console.log('🔍 Client exists?', !!this.client);
      
      if (!this.client) {
        throw new Error('NWCClient not initialized');
      }
      
      const response = await this.client.getBalance();
      console.log('✅ Balance response:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      throw error;
    }
  }

  async payInvoice(paymentRequest) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      console.log('🔍 Paying invoice...');
      
      if (!this.client) {
        throw new Error('NWCClient not initialized');
      }
      
      const response = await this.client.payInvoice({ invoice: paymentRequest });
      console.log('✅ Payment response:', response);
      return {
        success: true,
        preimage: response.preimage,
        paymentHash: response.paymentHash,
      };
    } catch (error) {
      console.error('❌ Payment failed:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.client) {
      this.client.close();
      this.connected = false;
      console.log('🔍 NWCClient disconnected');
    }
  }
}

export default new LightningService();
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet,
  ActivityIndicator 
} from 'react-native';
import LightningService from '../services/LightningService';

interface Invoice {
  amount: number;
  description: string;
  payment_request: string;
}

interface PaymentResult {
  success: boolean;
  preimage?: string;
  paymentHash?: string;
  feePaid?: number;
}

interface InvoicePaymentProps {
  invoice: Invoice;
  onPaymentComplete?: (result: PaymentResult) => void;
  onPaymentError?: (error: Error) => void;
}

const InvoicePayment: React.FC<InvoicePaymentProps> = ({ 
  invoice, 
  onPaymentComplete, 
  onPaymentError 
}) => {
  const [paying, setPaying] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async (): Promise<void> => {
    try {
      await LightningService.connect();
      setConnected(true);
      
      // Get wallet balance
      const walletBalance = await LightningService.getBalance();
      setBalance(walletBalance);
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnected(false);
    }
  };

  const payInvoice = async (): Promise<void> => {
    setPaying(true);
    
    try {
      const result = await LightningService.payInvoice(invoice.payment_request);
      
      Alert.alert(
        'Payment Successful! ⚡', 
        `Medical bill paid successfully!\n\nAmount: ${invoice.amount} sats\nFee: ${result.feePaid || 0} sats`,
        [{ text: 'OK', onPress: () => onPaymentComplete && onPaymentComplete(result) }]
      );
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Payment Failed ❌', 
        `Error: ${errorMessage}`,
        [{ text: 'OK', onPress: () => onPaymentError && onPaymentError(error as Error) }]
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medical Bill Payment</Text>
      
      <View style={styles.invoiceInfo}>
        <Text style={styles.label}>Amount:</Text>
        <Text style={styles.amount}>{invoice.amount} sats</Text>
        
        <Text style={styles.label}>Description:</Text>
        <Text style={styles.description}>{invoice.description}</Text>
        
        {balance !== null && (
          <>
            <Text style={styles.label}>Wallet Balance:</Text>
            <Text style={styles.balance}>{balance} sats</Text>
          </>
        )}
      </View>

      <View style={styles.connectionStatus}>
        <Text style={[styles.statusText, { color: connected ? '#00b894' : '#e74c3c' }]}>
          {connected ? '⚡ Wallet Connected' : '❌ Wallet Disconnected'}
        </Text>
      </View>

      <TouchableOpacity 
        style={[
          styles.payButton, 
          !connected && styles.disabledButton,
          paying && styles.disabledButton
        ]} 
        onPress={payInvoice}
        disabled={!connected || paying}
      >
        {paying ? (
          <View style={styles.payingContainer}>
            <ActivityIndicator color="white" size="small" />
            <Text style={[styles.buttonText, { marginLeft: 10 }]}>Paying...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Pay Medical Bill ⚡</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2c3e50',
  },
  invoiceInfo: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f7931a', // Bitcoin orange
  },
  description: {
    fontSize: 16,
    color: '#333',
  },
  balance: {
    fontSize: 18,
    fontWeight: '600',
    color: '#27ae60',
  },
  connectionStatus: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  payButton: {
    backgroundColor: '#f7931a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  payingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export { InvoicePayment };
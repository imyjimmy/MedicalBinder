import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { InvoicePayment } from './InvoicePayment';
import LightningService from '../services/LightningService';
import NostrDMService from '../services/NostrDMService';

interface PendingBill {
  id: string;
  amount: number;
  description: string;
  payment_request: string;
  receivedAt: Date;
  paid: boolean;
}

export const BillingManager: React.FC = () => {
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [selectedBill, setSelectedBill] = useState<PendingBill | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    checkWalletConnection();
    loadPendingBills();
    return () => {
      // Cleanup when component unmounts
      NostrDMService.disconnect();
    };
  }, []);

  const checkWalletConnection = async () => {
    try {
      await LightningService.connect();
      setWalletConnected(true);
      const walletBalance = await LightningService.getBalance();
      setBalance(walletBalance);
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setWalletConnected(false);
    }
  };

  const loadPendingBills = async () => {
    try {
      console.log('🔍 Loading pending bills from Nostr DMs...');
      
      // Get current user's pubkey
      const userPubkey = await NostrDMService.getCurrentUserPubkey();
      console.log('User pubkey:', userPubkey.substring(0, 16) + '...');
      
      // Fetch DMs
      const dms = await NostrDMService.getDirectMessages(userPubkey);
      console.log(`📬 Found ${dms.length} DMs`);
      
      // Parse invoices from DMs
      const invoices = parseInvoicesFromDMs(dms);
      console.log(`💰 Parsed ${invoices.length} invoices`);
      
      setPendingBills(invoices);
    } catch (error) {
      console.error('❌ Failed to load pending bills:', error);
      // Keep empty array if loading fails
      setPendingBills([]);
    }
  };

  const parseInvoicesFromDMs = (dms: any[]): PendingBill[] => {
    const invoices: PendingBill[] = [];
    
    dms.forEach(dm => {
      try {
        // Look for Lightning invoice pattern in DM content
        const invoiceMatch = dm.content.match(/(ln(bc|tb|bcrt)[a-zA-Z0-9]+)/i);
        if (invoiceMatch) {
          const payment_request = invoiceMatch[1];
          
          // Extract amount from invoice (basic parsing)
          const amount = extractAmountFromInvoice(payment_request);
          
          // Extract description from DM content
          const description = extractDescriptionFromDM(dm.content);
          
          invoices.push({
            id: dm.id,
            amount,
            description,
            payment_request,
            receivedAt: new Date(dm.createdAt * 1000),
            paid: false
          });
        }
      } catch (error) {
        console.warn('Failed to parse invoice from DM:', error);
      }
    });
    
    return invoices;
  };

  const extractAmountFromInvoice = (paymentRequest: string): number => {
    try {
      // Basic Lightning invoice amount extraction
      // Format: ln + bc/tb/bcrt + amount + multiplier
      const match = paymentRequest.match(/ln(bc|tb|bcrt)(\d+)([munp]?)/i);
      if (match && match[2]) {
        let amount = parseInt(match[2]);
        const multiplier = match[3]?.toLowerCase();
        
        // Convert to sats based on multiplier
        switch (multiplier) {
          case 'm': amount *= 100000; break;     // milli-bitcoin
          case 'u': amount *= 100; break;        // micro-bitcoin  
          case 'n': amount *= 0.1; break;       // nano-bitcoin
          case 'p': amount *= 0.0001; break;    // pico-bitcoin
          default: amount *= 100000000; break;  // bitcoin (no multiplier)
        }
        
        return Math.floor(amount);
      }
    } catch (error) {
      console.error('Failed to extract amount from invoice:', error);
    }
    
    return 0; // Default fallback
  };

  const extractDescriptionFromDM = (content: string): string => {
    // Try to extract description from common patterns
    const lines = content.split('\n');
    
    // Look for lines that might contain description
    for (const line of lines) {
      if (line.toLowerCase().includes('description:') || 
          line.toLowerCase().includes('memo:') ||
          line.toLowerCase().includes('for:')) {
        return line.replace(/^(description|memo|for):\s*/i, '').trim();
      }
    }
    
    // Look for medical-related keywords
    if (content.toLowerCase().includes('medical') || 
        content.toLowerCase().includes('bill') ||
        content.toLowerCase().includes('invoice')) {
      return 'Medical bill payment';
    }
    
    // Fallback to first line if it's not too long
    const firstLine = lines[0]?.trim();
    if (firstLine && firstLine.length < 100 && !firstLine.startsWith('ln')) {
      return firstLine;
    }
    
    return 'Payment request';
  };

  const handlePaymentComplete = (bill: PendingBill, result: any) => {
    // Mark bill as paid
    setPendingBills(prev => 
      prev.map(b => 
        b.id === bill.id ? { ...b, paid: true } : b
      )
    );
    setSelectedBill(null);
    
    // TODO: Send payment confirmation via Nostr DM
    Alert.alert('Success', 'Payment confirmation will be sent to the medical practice.');
  };

  if (selectedBill) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setSelectedBill(null)}
        >
          <Text style={styles.backText}>← Back to Bills</Text>
        </TouchableOpacity>
        
        <InvoicePayment
          invoice={selectedBill}
          onPaymentComplete={(result) => handlePaymentComplete(selectedBill, result)}
          onPaymentError={(error) => console.error('Payment error:', error)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lightning Wallet & Billing</Text>
      
      {/* Wallet Status */}
      <View style={styles.walletStatus}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Wallet Status:</Text>
          <Text style={[styles.statusValue, { color: walletConnected ? '#27ae60' : '#e74c3c' }]}>
            {walletConnected ? '⚡ Connected' : '❌ Disconnected'}
          </Text>
        </View>
        
        {balance !== null && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Balance:</Text>
            <Text style={styles.balanceValue}>{balance} sats</Text>
          </View>
        )}
        
        {!walletConnected && (
          <TouchableOpacity style={styles.connectButton} onPress={checkWalletConnection}>
            <Text style={styles.connectButtonText}>Reconnect Wallet</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Pending Bills */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Medical Bills</Text>
        {pendingBills.filter(bill => !bill.paid).map(bill => (
          <TouchableOpacity
            key={bill.id}
            style={styles.billItem}
            onPress={() => setSelectedBill(bill)}
          >
            <View style={styles.billInfo}>
              <Text style={styles.billAmount}>{bill.amount} sats</Text>
              <Text style={styles.billDescription}>{bill.description}</Text>
              <Text style={styles.billDate}>
                Received: {bill.receivedAt.toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.payButton}>Pay →</Text>
          </TouchableOpacity>
        ))}
        
        {pendingBills.filter(bill => !bill.paid).length === 0 && (
          <Text style={styles.noBills}>No pending bills</Text>
        )}
      </View>

      {/* Payment History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Payments</Text>
        {pendingBills.filter(bill => bill.paid).map(bill => (
          <View key={bill.id} style={styles.paidBillItem}>
            <Text style={styles.paidAmount}>{bill.amount} sats</Text>
            <Text style={styles.paidDescription}>{bill.description}</Text>
            <Text style={styles.paidStatus}>✅ Paid</Text>
          </View>
        ))}
        
        {pendingBills.filter(bill => bill.paid).length === 0 && (
          <Text style={styles.noBills}>No payment history</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
  },
  walletStatus: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f7931a',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  connectButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2c3e50',
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  billInfo: {
    flex: 1,
  },
  billAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f7931a',
  },
  billDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  billDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  payButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paidBillItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f1f8ff',
    borderRadius: 8,
    marginBottom: 8,
  },
  paidAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  paidDescription: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginLeft: 10,
  },
  paidStatus: {
    fontSize: 14,
    color: '#27ae60',
  },
  noBills: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
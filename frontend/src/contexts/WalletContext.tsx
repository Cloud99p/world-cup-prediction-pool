'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';

interface WalletContextType {
  connected: boolean;
  publicKey: PublicKey | null;
  connecting: boolean;
  balance: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  network: string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [network, setNetwork] = useState('mainnet-beta'); // Default to mainnet for production
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false);

  // Connection - Default to mainnet, fallback to devnet for testing
  const connection = new Connection(
    network === 'devnet' 
      ? 'https://api.devnet.solana.com' 
      : 'https://api.mainnet-beta.solana.com',
    'confirmed'
  );

  // Use environment variable if available (for Vercel deployment)
  useEffect(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (rpcUrl) {
      setNetwork(rpcUrl.includes('devnet') ? 'devnet' : 'mainnet-beta');
    }
  }, []);

  // Check for Phantom on mount (only if not manually disconnected)
  useEffect(() => {
    if (typeof window !== 'undefined' && !manuallyDisconnected) {
      const checkWallet = async () => {
        const provider = (window as any).solana;
        if (provider?.isPhantom) {
          try {
            const response = await provider.connect({ onlyIfTrusted: true });
            setPublicKey(response.publicKey);
            setConnected(true);
            
            // Fetch balance
            const bal = await connection.getBalance(response.publicKey);
            setBalance(bal / 1e9);
          } catch (err) {
            // Not connected, that's fine
          }
        }
      };
      checkWallet();
    }
  }, [connection, manuallyDisconnected]);

  const connect = async () => {
    setConnecting(true);
    try {
      const provider = (window as any).solana;
      
      if (!provider) {
        window.open('https://phantom.app/', '_blank');
        throw new Error('Phantom not installed');
      }

      const response = await provider.connect();
      setPublicKey(response.publicKey);
      setConnected(true);
      setManuallyDisconnected(false); // Reset flag on manual connect
      
      // Fetch balance
      const bal = await connection.getBalance(response.publicKey);
      setBalance(bal / 1e9);
    } catch (err: any) {
      console.error('Connection error:', err);
      throw err;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    const provider = (window as any).solana;
    if (provider) {
      await provider.disconnect();
    }
    setPublicKey(null);
    setConnected(false);
    setBalance(0);
    setManuallyDisconnected(true); // Prevent auto-reconnect
  };

  const signTransaction = async (transaction: Transaction) => {
    const provider = (window as any).solana;
    if (!provider) {
      throw new Error('Wallet not connected');
    }
    return await provider.signTransaction(transaction);
  };

  return (
    <WalletContext.Provider
      value={{
        connected,
        publicKey,
        connecting,
        balance,
        connect,
        disconnect,
        signTransaction,
        network,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

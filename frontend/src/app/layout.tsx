import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/contexts/WalletContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'World Cup Prediction Pool',
  description: 'Trustless prediction markets for the World Cup',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}

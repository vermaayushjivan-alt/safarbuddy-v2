import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { RootProvider } from '@/components/providers/RootProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SafarBuddy - Your Travel Companion',
  description: 'Enterprise-grade travel platform for hotels, resorts, homestays, and tour packages',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RootProvider>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}

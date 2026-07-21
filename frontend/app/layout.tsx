import type { Metadata } from 'next';
import { Lora, Manrope } from 'next/font/google';

import './globals.css';
import { Providers } from '@/app/providers';

const display = Lora({ subsets: ['latin'], variable: '--font-display' });
const sans = Manrope({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Aether Clinic — Care, clearly arranged',
  description: 'Aether Clinic brings booking, patient care, scheduling, and operations into one clear experience.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' data-scroll-behavior='smooth' className={`${display.variable} ${sans.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Space_Grotesk, Work_Sans } from 'next/font/google';

import './globals.css';
import { Providers } from '@/app/providers';

const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const sans = Work_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Aether Clinic - онлайн-запис і кабінет пацієнта',
  description: 'Сайт клініки з онлайн-записом, кабінетом пацієнта, розкладом лікаря та CRM для адміністратора.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='uk' className={`${display.variable} ${sans.variable}`}>
      <body className='antialiased'>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import { Inter } from 'next/font/google';
import './globals.css';
import { Metadata, Viewport } from 'next';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
});

export const metadata = {
  title: 'Uang Jajan Tracker',
  description: 'Catat uang jajan harianmu dengan gamifikasi streak & budget tracking',
  manifest: '/manifest.json',
  icons: {
    icon: '/Logo.jpg',
    apple: '/Logo.jpg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#E8734A',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans bg-cream-100 text-gray-900 antialiased">
        <main className="max-w-md mx-auto min-h-screen relative">
          {children}
        </main>
      </body>
    </html>
  );
}
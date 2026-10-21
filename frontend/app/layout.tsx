import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quiet Check-In — Calm Elder Caretaking',
  description: 'Privacy-first ambient routine intelligence for elder care using Ring event metadata.',
  icons: {
    icon: '/app_icon.jpg',
    apple: '/app_icon.jpg',
  },
  manifest: '/manifest.json'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface text-primary antialiased min-h-screen flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}

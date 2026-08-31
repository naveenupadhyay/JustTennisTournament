import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JUST Tennis League · US Open Edition',
  description: 'Group stage standings, round-robin score sheets, and knockout bracket for JUST Tennis League.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

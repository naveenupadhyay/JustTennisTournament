import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://just-tennis-tournament.vercel.app'),
  title: {
    default: 'Just Tennis US Open',
    template: '%s · Just Tennis US Open',
  },
  description: 'Follow the Just Tennis US Open Edition league tables, match results, and knockout bracket.',
  openGraph: {
    title: 'Just Tennis US Open',
    description: 'League tables, match results, and knockout bracket for the Just Tennis US Open Edition.',
    url: '/',
    siteName: 'Just Tennis US Open',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Just Tennis US Open tournament preview',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Just Tennis US Open',
    description: 'League tables, match results, and knockout bracket for the Just Tennis US Open Edition.',
    images: ['/opengraph-image'],
  },
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

import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Subreddit Scraper',
  description: 'Scrape trendy images from subreddits',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning should ideally be on the element where the mismatch occurs.
    // Browser extensions often add attributes to the body.
    <html lang="en">
      <head>
        <meta name="referrer" content="no-referrer-when-downgrade" />
        <meta name="b16aa8d572ab5890309afb9dfd2ad736f9cf7b3f" content="b16aa8d572ab5890309afb9dfd2ad736f9cf7b3f" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning={true}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

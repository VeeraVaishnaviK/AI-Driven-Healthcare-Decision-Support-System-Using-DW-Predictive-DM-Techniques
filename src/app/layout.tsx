import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Healthcare Decision Support System',
  description: 'Clinical Data Warehousing and Predictive Mining Support Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

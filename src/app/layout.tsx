import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pizza Workforce Management',
  description: 'Workforce management for NZ pizza chain — rosters, timesheets, leave, payroll',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import '../css/styles.css';

export const metadata: Metadata = {
  title: 'tmy — AUDIO ARCHIVE',
  description: 'Prodtmy Audio Archive & Vault',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <script src="https://cdn.tailwindcss.com" async></script>
        <script dangerouslySetInnerHTML={{ __html: `
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  surface: '#F5F5F7',
                  card: '#FFFFFF',
                  primary: '#1D1D1F',
                  muted: '#86868B',
                  subtle: '#E8E8ED',
                  darker: '#D2D2D7',
                  online: '#34C759',
                },
                fontFamily: {
                  mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
                }
              }
            }
          }
        `}} />
      </head>
      <body className="h-full antialiased">
        {children}
      </body>
    </html>
  );
}

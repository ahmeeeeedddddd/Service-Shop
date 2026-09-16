import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/shared/Header';
import { LanguageProvider } from '@/lib/i18n/context';

export const metadata: Metadata = {
  title: 'مركز الأنصاري لصيانة السيارات | El-Ansary Service Center',
  description: 'مركز الأنصاري لصيانة وإصلاح السيارات',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-zinc-900 min-h-screen flex flex-col antialiased selection:bg-yellow-400 selection:text-black">
        <LanguageProvider>
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
            {children}
          </main>
          <footer className="border-t border-zinc-200 bg-white py-6 text-center text-sm font-bold tracking-wide text-zinc-600">
            Elansary
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}

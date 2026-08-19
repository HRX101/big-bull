import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Big Bull Car Spa',
  description: 'Enterprise automotive workshop ERP',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var STRIP = ['fdprocessedid'];
                function strip(target) {
                  if (!target || typeof target.removeAttribute !== 'function') return;
                  for (var i = 0; i < STRIP.length; i++) {
                    target.removeAttribute(STRIP[i]);
                  }
                }
                function scan(root) {
                  if (!root) return;
                  strip(root);
                  if (root.querySelectorAll) {
                    var found = root.querySelectorAll('*');
                    for (var i = 0; i < found.length; i++) strip(found[i]);
                  }
                }
                var observer = new MutationObserver(function (mutations) {
                  for (var i = 0; i < mutations.length; i++) {
                    var mutation = mutations[i];
                    if (mutation.type === 'attributes') {
                      if (STRIP.indexOf(mutation.attributeName) !== -1) {
                        mutation.target.removeAttribute(mutation.attributeName);
                      }
                    } else if (mutation.addedNodes) {
                      for (var j = 0; j < mutation.addedNodes.length; j++) {
                        scan(mutation.addedNodes[j]);
                      }
                    }
                  }
                });
                observer.observe(document, {
                  subtree: true,
                  childList: true,
                  attributes: true,
                  attributeFilter: STRIP,
                });
                scan(document.body);
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

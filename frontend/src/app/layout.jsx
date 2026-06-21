import "./globals.css";

export const metadata = {
  title: "GLC MRA System",
  description: "General Affairs, Legal, & Compliance Integrated System MRA Group",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          } catch (_) {}
        ` }} />
      </head>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}

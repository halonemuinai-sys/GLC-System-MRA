import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { getPageMap } from 'nextra/page-map';
import 'nextra-theme-docs/style.css';

export const metadata = {
  title: 'GLC OpsSuite Documentation',
  description: 'Panduan Penggunaan dan SOP Sistem Terpadu GLC MRA Group',
};

export default async function DocsLayout({ children }) {
  const pageMap = await getPageMap('/docs');

  return (
    <Layout
      navbar={<Navbar logo={<b>GLC OpsSuite Docs</b>} />}
      footer={<Footer>GLC OpsSuite © {new Date().getFullYear()}</Footer>}
      pageMap={pageMap}
    >
      {children}
    </Layout>
  );
}

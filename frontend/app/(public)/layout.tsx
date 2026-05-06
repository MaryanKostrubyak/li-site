import { SiteFooter } from '@/components/shared/site-footer';
import { SiteHeader } from '@/components/shared/site-header';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className='min-h-[calc(100vh-56px)]'>{children}</main>
      <SiteFooter />
    </>
  );
}

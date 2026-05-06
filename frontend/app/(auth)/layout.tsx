import { SiteHeader } from '@/components/shared/site-header';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className='container-max page-y'>{children}</main>
    </>
  );
}

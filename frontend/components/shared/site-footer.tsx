import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className='border-t border-border bg-[#EEE9DF]'>
      <div className='container-max grid gap-8 py-12 md:grid-cols-[1fr,1fr]'>
        <div>
          <p className='font-display text-xl'>Aether Clinic</p>
          <p className='mt-3 max-w-md text-sm leading-6 text-muted-foreground'>Thoughtful appointments, clear scheduling, and care that fits into real life.</p>
        </div>
        <div className='grid gap-3 text-sm md:justify-self-end md:text-right'>
          <Link href='/book' className='font-bold'>Book a visit</Link>
          <a href='mailto:hello@aetherclinic.test'>hello@aetherclinic.test</a>
          <p className='text-muted-foreground'>Pacific Time · USD</p>
        </div>
      </div>
    </footer>
  );
}

export function SiteFooter() {
  return (
    <footer className='section-rule bg-background/80'>
      <div className='container-max grid gap-6 py-10 text-sm text-muted-foreground md:grid-cols-[1fr,1.4fr] md:items-end'>
        <div>
          <p className='font-display text-lg font-semibold tracking-tight text-foreground'>Aether Clinic</p>
          <p className='mt-2 max-w-sm leading-6'>Онлайн-запис, кабінет пацієнта, розклад лікаря і CRM для клініки.</p>
        </div>
        <div className='grid gap-2 text-xs uppercase tracking-[0.12em] sm:grid-cols-3 md:text-right'>
          <p>Запис</p>
          <p>Пацієнти</p>
          <p>Розклад</p>
        </div>
      </div>
    </footer>
  );
}

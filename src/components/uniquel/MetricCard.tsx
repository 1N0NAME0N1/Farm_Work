type MetricCardProps = {
  label?: string;
  value?: string;
  change?: string;
  detail?: string;
  className?: string;
};

export default function MetricCard({
  label = 'Monthly revenue',
  value = '$48,294',
  change = '+12.4%',
  detail = 'Compared with last month',
  className = '',
}: MetricCardProps) {
  return (
    <article
      className={[
        'w-full max-w-sm rounded-[var(--radius-2xl,1rem)] border border-[color:var(--color-border,#e5e7eb)] bg-[var(--color-card,#fff)] p-5 shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className='text-sm font-medium text-[color:var(--color-muted-foreground,#4b5563)]'>{label}</p>
          <p className='mt-2 text-3xl font-semibold tracking-tight text-[color:var(--color-card-foreground,#111827)]'>{value}</p>
        </div>
        <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'>
          {change}
        </span>
      </div>
      <svg viewBox='0 0 280 56' className='mt-6 h-14 w-full' fill='none' aria-hidden>
        <path d='M2 47C24 45 29 36 50 39C70 42 77 24 98 29C119 34 124 20 145 23C167 26 177 9 198 14C219 19 231 5 250 9C263 12 271 5 278 2' stroke='#10B981' strokeWidth='3' strokeLinecap='round' />
        <path d='M2 47C24 45 29 36 50 39C70 42 77 24 98 29C119 34 124 20 145 23C167 26 177 9 198 14C219 19 231 5 250 9C263 12 271 5 278 2V56H2V47Z' fill='url(#metric-fill)' opacity='.12' />
        <defs>
          <linearGradient id='metric-fill' x1='0' y1='0' x2='0' y2='56' gradientUnits='userSpaceOnUse'>
            <stop stopColor='#10B981' />
            <stop offset='1' stopColor='#10B981' stopOpacity='0' />
          </linearGradient>
        </defs>
      </svg>
      <p className='mt-3 text-xs text-[color:var(--color-muted-foreground,#6b7280)]'>{detail}</p>
    </article>
  );
}

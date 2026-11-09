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
    <article className={['w-full min-w-0 border-b border-[color:var(--color-border,#2a2d30)] py-4', className].filter(Boolean).join(' ')}>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-sm text-[color:var(--color-muted-foreground,#a1a5a6)]'>{label}</p>
        <span className='text-xs tabular-nums text-[color:var(--color-muted-foreground,#a1a5a6)]'>{change}</span>
      </div>
      <p className='mt-2 text-2xl font-semibold tracking-tight tabular-nums text-[color:var(--color-card-foreground,#e9e9e4)] md:text-3xl'>{value}</p>
      <p className='mt-1 text-xs text-[color:var(--color-muted-foreground,#a1a5a6)]'>{detail}</p>
    </article>
  );
}

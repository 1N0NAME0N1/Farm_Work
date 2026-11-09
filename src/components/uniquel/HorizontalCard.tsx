type HorizontalCardProps = {
  image?: string;
  imageAlt?: string;
  label?: string;
  title?: string;
  description?: string;
  price?: string;
  actionLabel?: string;
  href?: string;
  className?: string;
};

export default function HorizontalCard({
  image = '',
  imageAlt = '',
  label = '',
  title = '',
  description = '',
  price = '',
  actionLabel = 'View details',
  href = '#',
  className = '',
}: HorizontalCardProps) {
  return (
    <article className={['flex min-w-0 items-start gap-3 p-4 sm:gap-4', className].filter(Boolean).join(' ')}>
      {image && <img src={image} alt={imageAlt} className='h-11 w-11 shrink-0 rounded-lg border border-[color:var(--color-border,#2a2d30)] object-cover sm:h-12 sm:w-12' />}
      <div className='min-w-0 flex-1'>
        <p className='text-xs text-[color:var(--color-muted-foreground,#a1a5a6)]'>{label}</p>
        <h3 className='mt-1 break-words text-sm font-semibold text-[color:var(--color-card-foreground,#e9e9e4)]'>{title}</h3>
        <p className='mt-1 break-words text-xs leading-5 text-[color:var(--color-muted-foreground,#a1a5a6)]'>{description}</p>
        <div className='mt-3 flex flex-wrap items-center justify-between gap-2'>
          <span className='text-sm font-semibold tabular-nums text-[color:var(--color-card-foreground,#e9e9e4)]'>{price}</span>
          <a href={href} className='rounded-lg border border-[color:var(--color-border,#2a2d30)] px-3 py-2 text-xs text-[color:var(--color-card-foreground,#e9e9e4)] transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ring,#a9b08d)]'>{actionLabel}</a>
        </div>
      </div>
    </article>
  );
}

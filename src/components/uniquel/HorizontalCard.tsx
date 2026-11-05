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
  image = 'https://assets.uniquel.io/components/stock/photo-1523275335684-37898b6baf30.jpg',
  imageAlt = 'Minimal black watch',
  label = 'New arrival',
  title = 'Arc One Watch',
  description = 'A precise everyday timepiece with a brushed steel case and sapphire glass.',
  price = '$249',
  actionLabel = 'View product',
  href = '#',
  className = '',
}: HorizontalCardProps) {
  return (
    <article
      className={[
        'flex max-w-xl overflow-hidden rounded-[var(--radius-2xl,1rem)] border border-[color:var(--color-border,#e5e7eb)] bg-[var(--color-card,#fff)] shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <img src={image} alt={imageAlt} className='w-2/5 object-cover' />
      <div className='flex min-w-0 flex-1 flex-col p-5'>
        <p className='text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-primary,#4f46e5)]'>{label}</p>
        <h3 className='mt-2 text-lg font-semibold tracking-tight text-[color:var(--color-card-foreground,#111827)]'>{title}</h3>
        <p className='mt-2 text-sm leading-6 text-[color:var(--color-muted-foreground,#4b5563)]'>{description}</p>
        <div className='mt-auto flex items-center justify-between gap-3 pt-5'>
          <span className='text-base font-semibold text-[color:var(--color-card-foreground,#111827)]'>{price}</span>
          <a
            href={href}
            className='rounded-[var(--radius-md,0.375rem)] bg-[var(--color-primary,#111827)] px-3 py-2 text-xs font-semibold text-[color:var(--color-primary-foreground,#fff)] transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring,#111827)] focus-visible:ring-offset-2'
          >
            {actionLabel}
          </a>
        </div>
      </div>
    </article>
  );
}

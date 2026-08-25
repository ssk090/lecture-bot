import type { ComponentProps } from 'react';

export type GenerationLoaderVariant = 'dots' | 'squares' | 'rounded';

export interface GenerationLoaderProps extends Omit<ComponentProps<'div'>, 'children'> {
  label: string;
  /** Animation clock; advances the pixel pattern and the elapsed counter. */
  tick: number;
  /** Lay the pixel grid and label side by side on one line. */
  horizontal?: boolean;
  variant?: GenerationLoaderVariant;
}

const CELL_SHAPES: Record<GenerationLoaderVariant, string> = {
  dots: 'rounded-full',
  squares: 'rounded-[1px]',
  rounded: 'rounded-[3px]'
};

export function GenerationLoader({ label, tick, horizontal = false, variant = 'dots', className, ...props }: GenerationLoaderProps) {
  const pixelOffset = Math.floor(tick);

  return (
    <div
      data-slot="generation-loader"
      className={`flex items-center gap-2 ${horizontal ? 'flex-row' : 'flex-col'} ${className ?? ''}`}
      {...props}
    >
      {' '}
      <div aria-hidden className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 9 }, (_, index) => {
          const active = (index * 2 + pixelOffset) % 9 < 3;
          return (
            <span
              key={index}
              className={`bg-foreground size-1.5 transition-opacity duration-300 motion-reduce:transition-none ${CELL_SHAPES[variant]} ${
                active ? 'opacity-90' : 'opacity-15'
              }`}
            />
          );
        })}
      </div>
      <span className="shimmer text-foreground/55 relative inline-block text-xs">{label}</span>
    </div>
  );
}

import { type ComponentProps, useMemo } from 'react';

export interface Segment {
  text: string;
  mono?: boolean;
}

function take<T>(arr: T[], n: number): T[] {
  if (n <= 0) return [];
  if (n >= arr.length) return arr;
  return arr.slice(0, n);
}

export interface StreamingTextProps extends Omit<ComponentProps<'p'>, 'children' | 'segments' | 'count' | 'streaming'> {
  segments: Segment[];
  /** How many words from the flattened segments are visible. */
  count: number;
  /** When true the newest words tint blue and a caret blinks at the end. */
  streaming: boolean;
}

export function StreamingText({ segments, count, streaming, className, ...props }: StreamingTextProps) {
  const words = useMemo(
    () => segments.flatMap((segment) => segment.text.split(' ').map((word) => ({ word, mono: segment.mono ?? false }))),
    [segments]
  );
  const shown = take(words, count);

  return (
    <p data-slot="streaming-text" className={`max-w-sm text-sm leading-relaxed text-pretty ${className ?? ''}`} {...props}>
      {shown.map(({ word, mono: isMono }, i) => {
        const fresh = streaming && shown.length - 1 - i < 2;
        return (
          <span key={i}>
            <span
              className={`transition-colors duration-700 motion-reduce:transition-none ${fresh ? 'text-blue-500 dark:text-blue-400' : ''} ${
                isMono ? 'bg-foreground/[0.06] rounded-md px-1.5 py-0.5 font-mono text-[0.85em]' : ''
              }`}
            >
              {word}
            </span>{' '}
          </span>
        );
      })}
      {streaming && shown.length > 0 && (
        <span aria-hidden className="-mb-0.5 ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-blue-500 dark:bg-blue-400" />
      )}
    </p>
  );
}

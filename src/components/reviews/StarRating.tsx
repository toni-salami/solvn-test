type Props = {
  value: number;
  size?: number;
  className?: string;
};

/** Read-only star display, supports fractional averages. */
export function StarRating({ value, size = 14, className = "" }: Props) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rounded >= i ? 1 : rounded >= i - 0.5 ? 0.5 : 0;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
            <defs>
              <linearGradient id={`half-${i}-${size}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8L10 1.6z"
              className={fill > 0 ? "text-amber-500" : "text-muted-foreground/30"}
              fill={fill === 0.5 ? `url(#half-${i}-${size})` : "currentColor"}
              stroke="currentColor"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </span>
  );
}

type InputProps = {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
};

/** Interactive 1–5 star picker. */
export function StarRatingInput({ value, onChange, disabled }: InputProps) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          disabled={disabled}
          onClick={() => onChange(i)}
          className="rounded p-0.5 disabled:opacity-50"
        >
          <svg width="24" height="24" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8L10 1.6z"
              className={i <= value ? "text-amber-500" : "text-muted-foreground/30"}
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

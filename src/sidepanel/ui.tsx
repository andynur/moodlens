import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Side panel UI kit (D-016): small owned components on the DESIGN.md tokens in `styles.css`.
 * No Radix or class-merging library; the panel needs no dialogs, menus or popovers.
 */

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerOutline' | 'link';
export type ButtonSize = 'md' | 'sm' | 'icon';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
  secondary:
    'border border-line-strong bg-canvas text-ink hover:bg-well aria-pressed:border-brand-600 aria-pressed:bg-accent-soft aria-pressed:text-accent-ink',
  ghost: 'text-ink-2 hover:bg-well hover:text-ink aria-pressed:bg-accent-soft aria-pressed:text-accent-ink',
  danger: 'bg-error text-white hover:brightness-95 active:brightness-90',
  dangerOutline: 'border border-error/40 text-error-ink hover:bg-error-soft',
  link: 'text-accent-ink hover:underline'
};
const buttonSizes: Record<ButtonSize, string> = {
  md: 'min-h-9 px-3.5 py-2 text-sm',
  sm: 'min-h-8 px-2.5 py-1.5 text-xs',
  icon: 'h-7 w-7 justify-center'
};

/** Class string for elements that look like buttons but are not (`summary`, `a`). */
export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'sm', className?: string): string {
  return cx(
    'inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
    buttonVariants[variant],
    variant !== 'link' && buttonSizes[size],
    className
  );
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export type Tone = 'brand' | 'neutral' | 'peach' | 'rose' | 'mint' | 'lavender' | 'sky' | 'yellow';

const toneChip: Record<Tone, string> = {
  brand: 'bg-accent-soft text-accent-ink',
  neutral: 'bg-well text-ink-2',
  peach: 'bg-tint-peach text-on-peach',
  rose: 'bg-tint-rose text-on-rose',
  mint: 'bg-tint-mint text-on-mint',
  lavender: 'bg-tint-lavender text-on-lavender',
  sky: 'bg-tint-sky text-on-sky',
  yellow: 'bg-tint-yellow text-on-yellow'
};

export type CardVariant = 'default' | 'accent' | 'danger' | 'muted' | 'flat';

const cardVariants: Record<CardVariant, string> = {
  default: 'border-line shadow-card',
  accent: 'border-brand-200 shadow-card dark:border-brand-900',
  danger: 'border-error/30 shadow-card',
  muted: 'border-dashed border-line-strong opacity-60',
  flat: 'border-line'
};

/** Class string for card-like elements that are not a `section` (`details`, `ul`). */
export function cardClass(variant: CardVariant = 'default', padded = true): string {
  return cx('rounded-xl border bg-canvas', padded && 'p-4', cardVariants[variant]);
}

export function Card({ variant, className, ...props }: HTMLAttributes<HTMLElement> & { variant?: CardVariant }) {
  return <section className={cx(cardClass(variant), className)} {...props} />;
}

/** Card heading with an optional pastel icon chip and trailing actions. */
export function CardTitle(props: {
  icon?: LucideIcon;
  tone?: Tone;
  level?: 2 | 3;
  id?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const Heading = props.level === 2 ? 'h2' : 'h3';
  return (
    <div className={cx('flex items-center gap-2', props.className)}>
      {props.icon && (
        <span
          aria-hidden="true"
          className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-lg', toneChip[props.tone ?? 'brand'])}
        >
          <props.icon size={15} />
        </span>
      )}
      <Heading
        id={props.id}
        className={cx('min-w-0 flex-1 font-semibold', props.level === 2 ? 'text-base' : 'text-sm')}
      >
        {props.children}
      </Heading>
      {props.actions}
    </div>
  );
}

/** Small uppercase label above a settings group (DESIGN.md `micro-uppercase`). */
export function SectionLabel(props: { children: ReactNode; tone?: 'muted' | 'accent' | 'danger'; className?: string }) {
  const color = props.tone === 'accent' ? 'text-accent-ink' : props.tone === 'danger' ? 'text-error-ink' : 'text-ink-3';
  return (
    <p className={cx('text-[11px] font-semibold tracking-wider uppercase', color, props.className)}>{props.children}</p>
  );
}

/** Secondary text; `faint` for footnotes under a page. */
export function Hint(props: { children: ReactNode; faint?: boolean; className?: string }) {
  return (
    <p className={cx('text-xs leading-relaxed', props.faint ? 'text-ink-3' : 'text-ink-2', props.className)}>
      {props.children}
    </p>
  );
}

/** `compact` fits three filters in one row at 320px; `leading` leaves room for an icon. */
type FieldStyle = { compact?: boolean; leading?: boolean };

function fieldClass({ compact, leading }: FieldStyle, className?: string): string {
  return cx(
    'block w-full min-w-0 rounded-lg border border-line-strong bg-canvas py-2 font-normal text-ink placeholder:text-ink-3 focus:border-brand-600 disabled:opacity-50',
    compact ? 'px-2 text-xs' : 'pr-3 text-sm',
    !compact && (leading ? 'pl-9' : 'pl-3'),
    className
  );
}

export function Input({ compact, leading, className, ...props }: InputHTMLAttributes<HTMLInputElement> & FieldStyle) {
  return <input className={fieldClass({ compact, leading }, className)} {...props} />;
}

export function Select({ compact, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & FieldStyle) {
  return <select className={fieldClass({ compact }, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={fieldClass({}, className)} {...props} />;
}

/** Label wrapping a field; the field follows the caption. */
export function Field({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block space-y-1.5 text-xs font-medium text-ink-2', className)}>
      <span className="block">{label}</span>
      {children}
    </label>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  return (
    <label className={cx('flex items-center gap-2 text-sm text-ink has-disabled:opacity-50', className)}>
      <input type="checkbox" className="h-4 w-4 shrink-0 accent-brand-700" {...props} />
      {label}
    </label>
  );
}

export type BadgeTone = 'solid' | Tone;

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        tone === 'solid' ? 'bg-brand-700 text-white' : toneChip[tone]
      )}
    >
      {children}
    </span>
  );
}

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const alertTone: Record<AlertTone, string> = {
  info: 'border-brand-200 bg-accent-soft text-accent-ink dark:border-brand-900',
  success: 'border-success/30 bg-success-soft text-success-ink',
  warning: 'border-warning/30 bg-warning-soft text-warning-ink',
  error: 'border-error/30 bg-error-soft text-error-ink'
};

export function Alert({
  tone,
  icon: Icon,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { tone: AlertTone; icon?: LucideIcon }) {
  return (
    <section className={cx('rounded-lg border p-3 text-xs leading-relaxed', alertTone[tone], className)} {...props}>
      {Icon ? (
        <div className="flex gap-2">
          <Icon size={15} aria-hidden="true" className="mt-px shrink-0" />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export function ProgressBar(props: { value: number; label: string; tone?: 'brand' | 'success' }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={props.value}
      aria-label={props.label}
      className="h-1.5 overflow-hidden rounded-full bg-line"
    >
      <div
        className={cx(
          'h-full rounded-full motion-safe:transition-all',
          props.tone === 'success' ? 'bg-success' : 'bg-brand-700'
        )}
        style={{ width: `${props.value}%` }}
      />
    </div>
  );
}

/** Single-choice row of toggle buttons (theme, language). */
export function Segmented<T extends string>(props: {
  value: T;
  options: { value: T; label: ReactNode; icon?: LucideIcon; ariaLabel?: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={props.label} className={cx('flex gap-1 rounded-lg bg-well p-1', props.className)}>
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={props.value === option.value}
          aria-label={option.ariaLabel}
          onClick={() => props.onChange(option.value)}
          className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-ink-2 transition-colors duration-150 hover:text-ink aria-pressed:bg-canvas aria-pressed:text-ink aria-pressed:shadow-card dark:aria-pressed:bg-line-strong"
        >
          {option.icon && <option.icon size={14} aria-hidden="true" />}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Divider() {
  return <hr className="border-line" />;
}

/** Vector copy of the extension icon (same geometry as scripts/make-icons.mjs and store-assets/logo.svg). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="16 16 96 96" className={className} aria-hidden="true">
      <rect x="16" y="16" width="96" height="96" rx="23.04" fill="#5645d4" />
      <g
        transform="translate(62 68) scale(2.7) translate(-12 -12)"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21.6 10 12 5 2.4 10 12 15z" />
        <path d="M22 10v6" />
        <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
      </g>
      <polygon points="88.32,27.52 95.36,37.12 88.32,46.72 81.28,37.12" fill="#f5d75e" />
    </svg>
  );
}

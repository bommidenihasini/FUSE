export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-[12px] border border-border bg-panel p-5">
      <p className="text-xs tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-2 font-mono text-lg text-text">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </article>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[12px] border border-dashed border-border bg-panel/50 p-8">
      <p className="font-display text-lg">{title}</p>
      <p className="mt-2 max-w-lg text-sm text-muted">{body}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[12px] border border-breaker/40 bg-breaker/10 p-4 text-sm text-breaker" role="alert">
      {message}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted" role="status">
      {label}
    </p>
  );
}

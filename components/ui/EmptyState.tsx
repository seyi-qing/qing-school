export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 px-4 border border-dashed border-line bg-white/50">
      <p className="font-serif text-lg text-ink/80">{title}</p>
      {description && <p className="text-sm text-ink/50 mt-2 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-fb-surface rounded-xl border border-fb-border">
      <div className="w-12 h-12 rounded-full bg-fb-bg flex items-center justify-center text-2xl mb-3">
        📭
      </div>
      <h3 className="text-lg font-semibold text-fb-text">{title}</h3>
      {description && (
        <p className="text-sm text-fb-subtle mt-1 max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

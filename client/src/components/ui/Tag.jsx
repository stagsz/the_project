export function Tag({ children, className = '' }) {
  return (
    <span className={`font-mono text-xs text-text-muted opacity-60 ${className}`}>
      {children}
    </span>
  );
}
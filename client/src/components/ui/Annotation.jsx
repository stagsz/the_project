export function Annotation({ children, className = '' }) {
  return (
    <span className={`annotation ${className}`}>
      {children}
    </span>
  );
}
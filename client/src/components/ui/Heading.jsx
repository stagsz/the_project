export function Heading({ highlight, children, className = '' }) {
  if (highlight) {
    return (
      <h1 className={`text-3xl font-bold ${className}`}>
        <span className="text-highlight">{highlight}</span> {children}
      </h1>
    );
  }
  return <h1 className={`text-3xl font-bold ${className}`}>{children}</h1>;
}
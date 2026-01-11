const variants = {
  primary: 'bg-accent text-white hover:shadow-offset',
  secondary: 'bg-transparent border border-border text-text hover:bg-bg-subtle',
  highlight: 'bg-highlight text-white hover:opacity-90',
};

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button 
      className={`px-4 py-2 rounded font-medium transition-all duration-200 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
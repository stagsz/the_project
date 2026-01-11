const variants = {
  dashed: 'bg-bg-subtle border-2 border-dashed border-[#C5C2BD] -rotate-[0.3deg]',
  accent: 'bg-accent text-white shadow-offset rotate-[0.2deg] border-2 border-[#152844]',
  outline: 'bg-white border-2 border-[#D5D2CD]',
  bordered: 'bg-white border-l-[3px] border-text-muted rounded-none ml-2',
  subtle: 'bg-bg-subtle border-2 border-[#D5D2CD]',
};

export function Card({ variant = 'outline', className = '', children, ...props }) {
  return (
    <div 
      className={`card-base ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
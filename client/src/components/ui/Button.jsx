const styles = {
  primary:
    "inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine",
  secondary:
    "inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90",
  ghost:
    "inline-flex items-center justify-center rounded-full border border-ink/15 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white",
};

function Button({ as: Comp = "button", variant = "primary", className = "", ...props }) {
  return <Comp className={`${styles[variant]} ${className}`.trim()} {...props} />;
}

export default Button;


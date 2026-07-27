const styles = {
  primary:
    "inline-flex min-h-[44px] sm:min-h-[48px] items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine active:scale-98 cursor-pointer select-none",
  secondary:
    "inline-flex min-h-[44px] sm:min-h-[48px] items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-98 cursor-pointer select-none",
  ghost:
    "inline-flex min-h-[44px] sm:min-h-[48px] items-center justify-center rounded-full border border-ink/15 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white active:scale-98 cursor-pointer select-none",
};

function Button({ as: Comp = "button", variant = "primary", className = "", ...props }) {
  return <Comp className={`${styles[variant]} ${className}`.trim()} {...props} />;
}

export default Button;



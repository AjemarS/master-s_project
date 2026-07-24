interface WaveDividerProps {
  className?: string;
  variant?: "light" | "medium";
}

export function WaveDivider({ className, variant = "light" }: WaveDividerProps) {
  const opacity = variant === "light" ? "opacity-40" : "opacity-70";
  return (
      <div className={`relative h-12 w-full overflow-hidden md:h-16 ${className ?? ""}`}>
      <svg
        className="absolute bottom-0 h-12 w-full md:h-16"
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 24C360 40 1080 8 1440 24L1440 48L0 48Z"
          className={`fill-primary/10 dark:fill-primary/15 ${opacity}`}
        />
      </svg>
    </div>
  );
}

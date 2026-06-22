import logoUrl from "@/assets/bharatone-logo.png";

export function BharatOneLogo({ size = "md", className = "" }: { size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const h = size === "xl" ? "h-20 sm:h-24" : size === "lg" ? "h-12 sm:h-14" : size === "sm" ? "h-7" : "h-9 sm:h-10";
  return (
    <img
      src={logoUrl}
      alt="BharatOne — For Serving Indian Citizens"
      className={`${h} w-auto select-none ${className}`}
      draggable={false}
    />
  );
}

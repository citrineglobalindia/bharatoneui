export function BharatOneLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const stripeW = size === "lg" ? "w-14" : size === "sm" ? "w-8" : "w-10";
  const titleSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col gap-[3px]">
        <span className={`block h-[6px] ${stripeW} -skew-x-[20deg] rounded-[2px] bg-[oklch(0.68_0.18_45)]`} />
        <span className={`block h-[6px] ${stripeW} -skew-x-[20deg] rounded-[2px] bg-[oklch(0.55_0.15_150)]`} />
      </div>
      <div className="leading-none">
        <div className={`${titleSize} font-extrabold tracking-tight text-foreground`}>
          BharatOne<sup className="text-[10px]">®</sup>
        </div>
        <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
          For Serving Indian Citizens
        </div>
      </div>
    </div>
  );
}
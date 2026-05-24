export function BharatOneLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const stripeW = size === "lg" ? "w-12 sm:w-14" : size === "sm" ? "w-8" : "w-10";
  const stripeH = size === "lg" ? "h-[7px]" : "h-[6px]";
  const titleSize =
    size === "lg" ? "text-xl sm:text-2xl" : size === "sm" ? "text-base" : "text-lg sm:text-xl";
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-col gap-[3px]">
        <span className={`block ${stripeH} ${stripeW} -skew-x-[18deg] rounded-[2px] bg-saffron shadow-sm`} />
        <span className={`block ${stripeH} ${stripeW} -skew-x-[18deg] rounded-[2px] bg-white border border-border`} />
        <span className={`block ${stripeH} ${stripeW} -skew-x-[18deg] rounded-[2px] bg-india-green shadow-sm`} />
      </div>
      <div className="leading-none">
        <div className={`font-display ${titleSize} font-extrabold tracking-tight text-foreground`}>
          BharatOne<sup className="ml-0.5 text-[9px] text-saffron">®</sup>
        </div>
        <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          For Serving Indian Citizens
        </div>
      </div>
    </div>
  );
}
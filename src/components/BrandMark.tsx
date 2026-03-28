import { cn } from "@/lib/utils";

/** Client logo: place `aurthayon-logo.png` in `public/brand/` (see `public/brand/README.txt`). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/aurthayon-logo.png"
      alt="Aurthayon"
      className={cn(
        "h-9 w-auto max-h-11 max-w-[min(100%,260px)] object-contain object-left shrink-0",
        className
      )}
    />
  );
}

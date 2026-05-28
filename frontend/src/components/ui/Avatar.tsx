import { cn } from "@/lib/utils/cn";
import { formatInitials } from "@/lib/utils/formatters";
import Image from "next/image";

interface AvatarProps {
  name: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-xl",
};

const colors = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-teal-500",
];

function getColor(name: string): string {
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const sizeClass = sizes[size];
  const colorClass = getColor(name);

  if (src) {
    return (
      <div className={cn("rounded-full overflow-hidden flex-shrink-0", sizeClass, className)}>
        <Image src={src} alt={name} width={64} height={64} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0",
        sizeClass,
        colorClass,
        className
      )}
    >
      {formatInitials(name)}
    </div>
  );
}

export function AvatarGroup({
  users,
  max = 4,
}: {
  users: Array<{ name: string; src?: string }>;
  max?: number;
}) {
  const visible = users.slice(0, max);
  const extra = users.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((u, i) => (
        <div key={i} className="ring-2 ring-white dark:ring-slate-800 rounded-full">
          <Avatar name={u.name} src={u.src} size="sm" />
        </div>
      ))}
      {extra > 0 && (
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300">
          +{extra}
        </div>
      )}
    </div>
  );
}

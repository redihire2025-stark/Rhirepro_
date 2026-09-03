import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { SheetContent, SheetTitle, SheetDescription } from "./ui/sheet";
import logoImage from "../../logo/logo.png";

export interface MobileNavLink {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  active?: boolean;
}

interface MobileNavPanelProps {
  links: MobileNavLink[];
  tagline?: string;
  /** CTA / auth buttons rendered above the link list, e.g. sign-in buttons. */
  children?: ReactNode;
}

export default function MobileNavPanel({ links, tagline, children }: MobileNavPanelProps) {
  return (
    <SheetContent side="right" className="w-80 bg-white p-0 flex flex-col gap-0">
      <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
      <SheetDescription className="sr-only">Site navigation and sign in options</SheetDescription>

      <div className="relative overflow-hidden bg-gradient-to-br from-[#3A1F1F] to-[#1f1010] px-6 pt-8 pb-6 text-white">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#FF2B2B]/25 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
            <img src={logoImage} alt="RhirePro Logo" className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold leading-tight">
              Rhire<span className="text-[#FF6B6B]">Pro</span>
            </h3>
            {tagline && <p className="mt-0.5 text-xs text-white/70">{tagline}</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
        {children && <div className="flex flex-col gap-2.5">{children}</div>}

        {links.length > 0 && (
          <div className={children ? "border-t border-gray-100 pt-5" : ""}>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
              Explore
            </p>
            <nav className="flex flex-col gap-1">
              {links.map(({ label, icon: Icon, onClick, active }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#FF2B2B] text-white shadow-sm"
                      : "text-[#3A1F1F] hover:bg-[#F6F6F6]"
                  }`}
                >
                  {Icon && (
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-[#FF2B2B]"}`} />
                  )}
                  {label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 px-6 py-4 text-center">
        <p className="text-xs text-[#8A8A8A]">Connecting talent with opportunity</p>
      </div>
    </SheetContent>
  );
}

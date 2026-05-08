import Link from "next/link";
import { X, Compass, PlusCircle } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Sidebar Overlay (Mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col overflow-hidden
          ${isOpen ? "w-72" : "w-0"}
          fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto
        `}
      >
        <div className="w-72"> {/* Fixed width wrapper to prevent content squishing during animation */}
          <div className="flex items-center justify-between p-8">
            <h2 className="text-2xl font-serif font-bold tracking-tight text-foreground">Kern.</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="px-4 space-y-2">
            <Link
              href="/discovery"
              className="flex items-center gap-3 px-4 py-3 bg-secondary/50 text-foreground rounded-2xl font-medium transition-colors"
            >
              <Compass size={20} className="text-primary" />
              Discovery
            </Link>
            <Link
              href="/creator"
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-secondary/30 hover:text-foreground rounded-2xl font-medium transition-colors"
            >
              <PlusCircle size={20} />
              Create Campaign
            </Link>
          </nav>
        </div>
      </aside>
    </>
  );
}

"use client";

import { Menu } from "lucide-react";

type PageHeaderProps = {
  title: string;
  onToggleSidebar: () => void;
  containerClassName?: string;
  actions?: React.ReactNode;
};

export function PageHeader({
  title,
  onToggleSidebar,
  containerClassName = "max-w-7xl",
  actions,
}: PageHeaderProps) {
  return (
    <header className={`mb-12 flex justify-between items-center mx-auto w-full ${containerClassName}`}>
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors text-foreground"
        >
          <Menu size={24} />
        </button>
        <span className="font-serif text-muted-foreground text-2xl hidden sm:inline">{title}</span>
      </div>
      <div className="flex items-center gap-6">{actions}</div>
    </header>
  );
}

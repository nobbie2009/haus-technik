import type { ReactNode } from "react";
import { ChevronUp } from "lucide-react";

export function RibbonSection({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className="ribbon-section"
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="ribbon-section-heading">
        <h3>{title}</h3>
        <button className="subtle icon-button" onClick={onClose} aria-label={`${title} einklappen`}>
          <ChevronUp size={16} />
        </button>
      </div>
      {children}
    </section>
  );
}

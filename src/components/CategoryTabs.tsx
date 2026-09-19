import { categories } from "../editor/categories";
import { useEditorStore } from "../stores/editorStore";

export function CategoryTabs() {
  const active = useEditorStore((s) => s.category);
  const setCategory = useEditorStore((s) => s.setCategory);
  return (
    <div className="category-tabs" role="tablist" aria-label="Planungsbereiche">
      {categories.map((category, index) => (
        <button
          key={category.id}
          role="tab"
          id={`category-${category.id}`}
          aria-selected={active === category.id}
          aria-controls={`tools-${category.id}`}
          tabIndex={active === category.id ? 0 : -1}
          onClick={() => setCategory(category.id)}
          onKeyDown={(event) => {
            const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
            if (!offset && event.key !== "Home" && event.key !== "End") return;
            event.preventDefault();
            event.stopPropagation();
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? categories.length - 1
                  : (index + offset + categories.length) % categories.length;
            setCategory(categories[next]!.id);
            event.currentTarget.parentElement
              ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
              [next]?.focus();
          }}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}

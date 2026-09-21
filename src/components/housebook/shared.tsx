import { ensureNetworkLayer } from "../../network/model";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { housebook, setHousebook, type Housebook } from "../../housebook/model";
export function updateBook(label: string, change: (book: Housebook) => void) {
  return useProjectStore.getState().commit(label, (project) => {
    const book = housebook(project);
    change(book);
    if (book.networkNodes.length) ensureNetworkLayer(project);
    setHousebook(project, book);
  });
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="book-field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children) ? cloneElement(children as ReactElement<{ id?: string }>, { id }) : children}
    </div>
  );
}

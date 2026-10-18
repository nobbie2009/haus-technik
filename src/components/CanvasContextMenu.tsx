import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ClipboardPaste,
  Copy,
  CopyPlus,
  RotateCcw,
  RotateCw,
  Scan,
  Scissors,
  Settings2,
  SquareDashed,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useProjectStore } from "../stores/projectStore";
import {
  copySelected,
  cutSelected,
  deleteSelected,
  duplicateSelected,
  fitView,
  hasClipboard,
  pasteClipboard,
} from "../editor/interaction/commands";
import { selectAllInView } from "../editor/interaction/selectAll";
import { elementTables } from "../core/elementTables";

const mac = typeof navigator !== "undefined" && /Mac|iPad|iPhone/.test(navigator.platform);
const key = (letter: string) => (mac ? `⌘${letter}` : `Strg+${letter}`);

interface Entry {
  label: string;
  icon: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  run: () => void;
}

function rotateFurniture(id: string, degrees: number) {
  useProjectStore.getState().commit("Möbel drehen", (draft) => {
    const item = draft.furniture[id]!;
    const next = ((((item.rotation * 180) / Math.PI + degrees) % 360) + 360) % 360;
    item.rotation = (next * Math.PI) / 180;
  });
}

function openProperties() {
  const toggle = document.querySelector<HTMLButtonElement>('.ribbon-properties[aria-expanded="false"]');
  if (toggle && toggle.offsetParent) toggle.click();
}

export function CanvasContextMenu() {
  const menu = useEditorStore((s) => s.contextMenu);
  const selection = useEditorStore((s) => s.selection);
  const project = useProjectStore((s) => s.project);
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const close = () => useEditorStore.setState({ contextMenu: null });

  useLayoutEffect(() => {
    if (!menu || !ref.current) return setPosition(null);
    const { width, height } = ref.current.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(menu.client.x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(menu.client.y, window.innerHeight - height - 8)),
    });
    ref.current.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
  }, [menu]);
  useEffect(() => {
    if (!menu) return;
    const outside = (event: Event) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("wheel", outside, true);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("wheel", outside, true);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", close);
    };
  }, [menu]);
  if (!menu) return null;

  const tables = elementTables(project);
  const single = selection.length === 1 ? selection[0]! : null;
  const furniture = single?.kind === "furniture" ? project.furniture[single.id] : undefined;
  const locked = selection.some((s) => {
    const item = tables[s.kind]?.[s.id] as { layerId?: string } | undefined;
    return !!item?.layerId && !!project.layers[item.layerId]?.locked;
  });
  const groups: Entry[][] = selection.length
    ? [
        [
          {
            label: "Ausschneiden",
            icon: <Scissors size={15} />,
            shortcut: key("X"),
            disabled: locked,
            run: cutSelected,
          },
          { label: "Kopieren", icon: <Copy size={15} />, shortcut: key("C"), run: () => void copySelected() },
          {
            label: "Hier einfügen",
            icon: <ClipboardPaste size={15} />,
            shortcut: key("V"),
            disabled: !hasClipboard(),
            run: () => pasteClipboard(menu.world),
          },
          {
            label: "Duplizieren",
            icon: <CopyPlus size={15} />,
            shortcut: key("D"),
            disabled: locked,
            run: duplicateSelected,
          },
        ],
        furniture
          ? [
              {
                label: "Um 90° nach links drehen",
                icon: <RotateCcw size={15} />,
                disabled: locked,
                run: () => rotateFurniture(furniture.id, -90),
              },
              {
                label: "Um 90° nach rechts drehen",
                icon: <RotateCw size={15} />,
                disabled: locked,
                run: () => rotateFurniture(furniture.id, 90),
              },
            ]
          : [],
        [
          { label: "Eigenschaften", icon: <Settings2 size={15} />, run: openProperties },
          {
            label: "Auswahl aufheben",
            icon: <SquareDashed size={15} />,
            run: () => useEditorStore.setState({ selection: [] }),
          },
        ],
        [
          {
            label: "Löschen",
            icon: <Trash2 size={15} />,
            shortcut: "Entf",
            danger: true,
            disabled: locked,
            run: deleteSelected,
          },
        ],
      ]
    : [
        [
          {
            label: "Hier einfügen",
            icon: <ClipboardPaste size={15} />,
            shortcut: key("V"),
            disabled: !hasClipboard(),
            run: () => pasteClipboard(menu.world),
          },
        ],
        [
          {
            label: "Alles auswählen",
            icon: <SquareDashed size={15} />,
            shortcut: key("A"),
            run: () => {
              const editor = useEditorStore.getState();
              const all = selectAllInView(project, editor.floorId, editor.category);
              editor.setTool("select");
              useEditorStore.setState({
                selection: all,
                message: `${all.length} Objekte im aktuellen Tab ausgewählt.`,
              });
            },
          },
          { label: "Alles anzeigen", icon: <Scan size={15} />, shortcut: "Pos1", run: fitView },
        ],
      ];

  return (
    <div
      ref={ref}
      className="context-menu"
      role="menu"
      aria-label="Kontextmenü"
      style={position ?? { left: menu.client.x, top: menu.client.y, visibility: "hidden" }}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
        event.preventDefault();
        const items = [...ref.current!.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      }}
    >
      {selection.length > 0 && (
        <div className="context-menu-title">
          {selection.length === 1 ? "1 Objekt ausgewählt" : `${selection.length} Objekte ausgewählt`}
        </div>
      )}
      {groups
        .filter((group) => group.length)
        .map((group, index) => (
          <div className="context-menu-group" role="group" key={index}>
            {group.map((entry) => (
              <button
                key={entry.label}
                type="button"
                role="menuitem"
                className={entry.danger ? "danger" : undefined}
                disabled={entry.disabled}
                onClick={() => {
                  close();
                  entry.run();
                }}
              >
                {entry.icon}
                <span>{entry.label}</span>
                {entry.shortcut && <kbd>{entry.shortcut}</kbd>}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}

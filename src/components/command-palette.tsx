"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/workspace", label: "AI Workspace" },
  { href: "/planning", label: "Planning" },
  { href: "/materials", label: "Materials" },
  { href: "/questions", label: "Question Bank" },
  { href: "/assessments", label: "Assessment" },
  { href: "/students", label: "Students" },
  { href: "/classes", label: "Classes" },
  { href: "/calendar", label: "Calendar" },
  { href: "/tasks", label: "Tasks" },
  { href: "/settings/ai", label: "AI Settings" },
];

/** Global assistant: Ctrl+K opens navigation + AI ask. Mounted in root layout. */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;
  const query = q.trim().toLowerCase();
  const matches = LINKS.filter((l) => l.label.toLowerCase().includes(query));

  function ask() {
    const askQ = q.trim();
    if (!askQ) return;
    setOpen(false);
    setQ("");
    router.push(`/workspace?ask=${encodeURIComponent(askQ)}`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 p-4" onClick={() => setOpen(false)} role="presentation">
      <div
        className="mx-auto mt-20 max-w-lg rounded border bg-white p-3 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="AI Assistant"
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (matches.length > 0 && query) {
                // Prefer navigation when it matches; Enter with no match asks AI.
              }
              ask();
            }
          }}
          placeholder="Ketik tujuan atau pertanyaan untuk AI..."
          aria-label="Perintah asisten"
          className="w-full rounded border px-3 py-2"
        />
        <ul className="mt-2 max-h-64 overflow-auto">
          {matches.map((l) => (
            <li key={l.href}>
              <button
                type="button"
                className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-gray-100"
                onClick={() => {
                  setOpen(false);
                  router.push(l.href);
                }}
              >
                Buka {l.label}
              </button>
            </li>
          ))}
          {q.trim() && (
            <li>
              <button
                type="button"
                className="block w-full rounded bg-gray-50 px-2 py-1 text-left text-sm font-medium hover:bg-gray-100"
                onClick={ask}
              >
                Tanya AI: “{q.trim()}”
              </button>
            </li>
          )}
        </ul>
        <p className="mt-2 text-xs text-gray-500">Ctrl+K buka/tutup · Enter tanya AI · Esc tutup</p>
      </div>
    </div>
  );
}

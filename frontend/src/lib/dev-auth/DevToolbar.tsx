import { useEffect, useRef, useState } from "react";
import { getTestUser, setTestUser, TEST_USER_COUNT, type TestUser } from "./test-user";

const OPTIONS: { label: string; value: TestUser }[] = [
  { label: "Logged out", value: null },
  ...Array.from({ length: TEST_USER_COUNT }, (_, index) => ({
    label: `test-user-${index + 1}`,
    value: index + 1,
  })),
];

export function DevToolbar() {
  const [current, setCurrent] = useState<TestUser>(getTestUser());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function pick(value: TestUser) {
    setTestUser(value);
    setCurrent(value);
    setOpen(false);
    window.location.reload();
  }

  const label = current ? `test-user-${current}` : "logged out";

  return (
    <div
      ref={ref}
      className="fixed bottom-4 right-4 z-[9999] font-mono text-xs"
    >
      {open && (
        <div className="mb-2 flex flex-col overflow-hidden rounded-md border border-white/20 bg-black/90 text-white shadow-lg">
          {OPTIONS.map((option) => {
            const active = option.value === current;
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => pick(option.value)}
                className={`px-3 py-1.5 text-left transition-colors hover:bg-white/10 ${
                  active ? "bg-white/15" : ""
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-md border border-white/20 bg-black/90 px-3 py-1.5 text-white shadow-lg hover:bg-black"
      >
        DEV: {label}
      </button>
    </div>
  );
}

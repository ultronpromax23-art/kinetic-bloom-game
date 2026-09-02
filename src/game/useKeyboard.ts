import { useEffect, useRef } from "react";

export function useKeyboard(onKey?: (code: string) => void) {
  const keys = useRef(new Set<string>());
  const handler = useRef(onKey);
  handler.current = onKey;

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      keys.current.add(e.code);
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ControlLeft", "Tab"].includes(
          e.code,
        )
      ) {
        e.preventDefault();
      }
      handler.current?.(e.code);
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    const onBlur = () => keys.current.clear();

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return keys;
}

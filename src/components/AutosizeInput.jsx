import { useLayoutEffect, useRef } from "react";

/** textarea تک‌خطی با قد خودکار و پشتیبانی از متنِ بلند و RTL */
export default function AutosizeInput({ value, onChange, placeholder, onKeyDown, className, style }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      dir="auto"
      className={(className ? className + " " : "") + "text-input"}
      style={{
        ...style,
        resize: "none",
        overflow: "hidden",
        lineHeight: "1.25",
        minHeight: 38,
        maxHeight: 200,
        width: "100%",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "8px 12px",
        background: "#fff",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
      }}
      rows={1}
    />
  );
}

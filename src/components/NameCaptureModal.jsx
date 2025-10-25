import React, { useState } from "react";

export default function NameCaptureModal({ onSave, initial = "" }) {
  const [name, setName] = useState(initial);
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Welcome!</h3>
        </div>
        <div className="modal-body">
          <p className="hint">اسم قهرمانتو انتخاب کن. بعداً هم می‌تونی عوضش کنی.</p>
          <input
            type="text"
            placeholder="Your hero name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div className="row-sb" style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => onSave("")}>بعداً</button>
            <button className="btn primary" disabled={!name.trim()} onClick={() => onSave(name.trim())}>
              شروع
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

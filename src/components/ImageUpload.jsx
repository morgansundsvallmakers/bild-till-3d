import { useState } from 'react';

export default function ImageUpload({ onFile, busy }) {
  const [dragging, setDragging] = useState(false);

  function handleFile(file) {
    if (!file || busy) return;
    onFile(file);
  }

  return <section className="panel">
    <h2>1. Bild</h2>
    <p>Ladda upp ett foto, en skanning eller en SVG med slutna konturer. Bilden behandlas i din webbläsare.</p>
    <label
      className={`upload ${dragging ? 'dragging' : ''}`}
      onDragEnter={e => { e.preventDefault(); if (!busy) setDragging(true); }}
      onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }}
      onDragLeave={e => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
      }}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <strong>{dragging ? 'Släpp bilden här' : 'Dra och släpp en bild här'}</strong>
      <span>eller</span>
      <span className="upload-button">Välj bild eller SVG</span>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" disabled={busy}
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
    </label>
    <p className="hint">PNG · JPG · WebP · SVG. Fotografera gärna mot en kontrasterande bakgrund.</p>
  </section>;
}

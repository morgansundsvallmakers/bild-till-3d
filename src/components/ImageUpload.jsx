export default function ImageUpload({ onFile, busy }) {
  return <section className="panel">
    <h2>1. Bild</h2>
    <p>Ladda upp ett foto, en skanning eller en SVG med slutna konturer. Bilden behandlas i din webbläsare.</p>
    <label className="upload">
      <span>Välj bild eller SVG</span>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" disabled={busy}
        onChange={e => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ''; }} />
    </label>
    <p className="hint">PNG · JPG · WebP · SVG. Fotografera gärna mot en kontrasterande bakgrund.</p>
  </section>;
}

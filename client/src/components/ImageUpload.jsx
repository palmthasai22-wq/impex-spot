import React, { useRef } from 'react';

export default function ImageUpload({ images = [], onChange }) {
  const inputRef = useRef(null);

  const handleFiles = (files) => {
    const newImages = [...images];
    for (const file of files) {
      if (newImages.length >= 3) break;
      if (file.size > 5 * 1024 * 1024) continue;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
      newImages.push({ file, preview: URL.createObjectURL(file) });
    }
    onChange(newImages);
  };

  const handleDrop = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); };
  const handleChange = (e) => handleFiles(e.target.files);
  const removeImage = (i) => onChange(images.filter((_, idx) => idx !== i));

  return (
    <div>
      {/* Drop Zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
          images.length >= 3
            ? 'border-gray-200 bg-gray-50 opacity-50 pointer-events-none'
            : 'border-brand-300 bg-brand-50/30 hover:bg-brand-50 hover:border-brand-400'
        }`}
      >
        <span className="text-3xl block mb-2">📷</span>
        <p className="text-sm text-brand-600 font-medium">ลากรูปมาวาง หรือกดเพื่อเลือก</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · สูงสุด 5MB · {images.length}/3 รูป</p>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleChange} />

      {/* Previews */}
      {images.length > 0 && (
        <div className="flex gap-2 mt-3">
          {images.map((img, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden shadow-card group">
              <img src={img.preview || img} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

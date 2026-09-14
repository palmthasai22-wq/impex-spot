import React, { useRef } from 'react';

export default function ImageUpload({ images = [], onChange }) {
  const cameraRef = useRef(null);
  const fileRef = useRef(null);

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

  const isFull = images.length >= 3;

  return (
    <div>
      {/* Camera Capture — ปุ่มหลัก */}
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        disabled={isFull}
        className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all duration-200 mb-2 ${
          isFull
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg hover:from-emerald-600 hover:to-green-600 active:scale-[0.98]'
        }`}
      >
        <span className="text-xl">📸</span>
        ถ่ายรูปเพื่อยืนยัน
      </button>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />

      {/* File Picker — ปุ่มรอง */}
      <div
        onClick={() => !isFull && fileRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 ${
          isFull
            ? 'border-gray-200 bg-gray-50 opacity-50 pointer-events-none'
            : 'border-gray-200 bg-gray-50/50 hover:bg-brand-50/30 hover:border-brand-300'
        }`}
      >
        <p className="text-xs text-gray-500 font-medium">หรือเลือกรูปจากคลัง / ลากมาวาง</p>
        <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WebP · สูงสุด 5MB · {images.length}/3 รูป</p>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleChange} />

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


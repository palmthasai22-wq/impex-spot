import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Set canvas size to the cropped size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image onto the canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
};

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteInternal = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBlob);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-md flex flex-col h-[80vh] max-h-[600px]">
        <div className="p-4 bg-brand-gradient text-white flex justify-between items-center">
          <h3 className="font-bold">ครอบรูปภาพไอคอน</h3>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">✕</button>
        </div>
        
        <div className="relative flex-1 bg-gray-900 w-full min-h-[300px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={setZoom}
          />
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-500 mb-2 block">ซูมภาพ</label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 btn-outline py-3 rounded-xl text-sm" disabled={isProcessing}>
              ยกเลิก
            </button>
            <button onClick={handleConfirm} className="flex-1 btn-primary py-3 rounded-xl text-sm" disabled={isProcessing}>
              {isProcessing ? 'กำลังประมวลผล...' : 'ใช้งานรูปนี้'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

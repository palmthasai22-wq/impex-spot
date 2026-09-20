import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import PlanShopForm from './PlanShopForm';
import PlanShopPopup from './PlanShopPopup';
import toast from 'react-hot-toast';

export default function PlanViewPopup({ pinId, pinTitle, plans: initialPlans, onClose, isAdmin = false }) {
  const [plans, setPlans] = useState(initialPlans || []);
  const [activePlanIdx, setActivePlanIdx] = useState(0);
  const [shopPins, setShopPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState(null);
  const [pendingPin, setPendingPin] = useState(null); // { xPercent, yPercent }
  const [isPinMode, setIsPinMode] = useState(false);
  const imageContainerRef = useRef(null);
  const imageRef = useRef(null);

  const activePlan = plans[activePlanIdx] || null;

  // Fetch shop pins when active plan changes
  useEffect(() => {
    if (!activePlan) { setLoading(false); return; }
    let cancelled = false;
    const fetchShops = async () => {
      setLoading(true);
      try {
        const api = (await import('../utils/api')).default;
        const { data } = await api.get(`/plans/${activePlan.id}/shops`);
        if (!cancelled) setShopPins(data);
      } catch (err) {
        console.error('Failed to fetch shop pins', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchShops();
    return () => { cancelled = true; };
  }, [activePlan?.id]);

  // Handle click on the plan image to place a new pin
  const handleImageClick = useCallback((e) => {
    if (!isPinMode) return;
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;

    setPendingPin({ xPercent, yPercent });
    setIsPinMode(false);
    setSelectedShop(null);
  }, [isPinMode]);

  const handleShopCreated = (newShop) => {
    setShopPins(prev => [...prev, newShop]);
    setPendingPin(null);
  };

  const handleDeleteShop = async (shopId) => {
    if (!window.confirm('ยืนยันการลบหมุดร้านนี้?')) return;
    try {
      const api = (await import('../utils/api')).default;
      await api.delete(`/plans/shops/${shopId}`);
      setShopPins(prev => prev.filter(s => s.id !== shopId));
      setSelectedShop(null);
      toast.success('ลบหมุดร้านสำเร็จ');
    } catch (err) {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  if (!activePlan) return null;

  const content = (
    <div className="fixed inset-0 z-[1100] flex flex-col bg-gray-900/95 backdrop-blur-sm animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-lg border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl">🗺️</span>
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-gray-800 truncate">{pinTitle || 'แผนผังสถานที่'}</h2>
            {activePlan.floorName && (
              <p className="text-[10px] text-gray-400">{activePlan.floorName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setIsPinMode(!isPinMode); setSelectedShop(null); }}
            className={`h-9 px-3 rounded-xl text-xs font-bold transition-all ${
              isPinMode
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {isPinMode ? '📍 กดที่รูปเพื่อปัก' : '📍 ปักหมุดร้าน'}
          </button>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all">
            ✕
          </button>
        </div>
      </div>

      {/* Floor tabs (if multiple) */}
      {plans.length > 1 && (
        <div className="flex gap-1 px-4 py-2 bg-white/90 backdrop-blur border-b border-gray-100 overflow-x-auto flex-shrink-0">
          {plans.map((plan, idx) => (
            <button
              key={plan.id}
              onClick={() => { setActivePlanIdx(idx); setSelectedShop(null); setPendingPin(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                idx === activePlanIdx
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {plan.floorName || `ชั้น ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Plan image with zoom/pan */}
      <div className="flex-1 relative overflow-hidden" ref={imageContainerRef}>
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={5}
          centerOnInit
          wheel={{ step: 0.1 }}
          panning={{ disabled: isPinMode }}
          pinch={{ disabled: isPinMode }}
          doubleClick={{ disabled: true }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Zoom controls */}
              <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-1.5">
                <button onClick={() => zoomIn()}
                  className="w-10 h-10 rounded-xl bg-white/95 shadow-lg flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-white hover:scale-105 transition-all backdrop-blur">
                  +
                </button>
                <button onClick={() => zoomOut()}
                  className="w-10 h-10 rounded-xl bg-white/95 shadow-lg flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-white hover:scale-105 transition-all backdrop-blur">
                  −
                </button>
                <button onClick={() => resetTransform()}
                  className="w-10 h-10 rounded-xl bg-white/95 shadow-lg flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-white hover:scale-105 transition-all backdrop-blur">
                  ⟲
                </button>
              </div>

              {/* Pin mode hint */}
              {isPinMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg animate-bounce-in flex items-center gap-2">
                  📍 แตะ/คลิกบนรูปเพื่อเลือกตำแหน่งร้าน
                  <button onClick={() => setIsPinMode(false)} className="ml-1 opacity-70 hover:opacity-100">✕</button>
                </div>
              )}

              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="relative inline-block" style={{ cursor: isPinMode ? 'crosshair' : 'grab' }}>
                  <img
                    ref={imageRef}
                    src={activePlan.planImageUrl}
                    alt={activePlan.floorName || 'แผนผัง'}
                    className="max-w-none select-none"
                    style={{ maxHeight: '80vh', objectFit: 'contain' }}
                    draggable={false}
                    onClick={handleImageClick}
                    onLoad={() => setLoading(false)}
                  />

                  {/* Existing shop pins */}
                  {shopPins.map((shop) => (
                    <button
                      key={shop.id}
                      className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-sm transition-all hover:scale-125 z-20 ${
                        selectedShop?.id === shop.id
                          ? 'bg-emerald-500 text-white shadow-lg scale-125 ring-4 ring-emerald-200'
                          : 'bg-white text-emerald-600 shadow-md border-2 border-emerald-300 hover:shadow-lg'
                      }`}
                      style={{
                        left: `${shop.xPercent}%`,
                        top: `${shop.yPercent}%`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShop(selectedShop?.id === shop.id ? null : shop);
                      }}
                      title={shop.name}
                    >
                      {shop.imageUrl ? (
                        <img src={shop.imageUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : '🏪'}
                    </button>
                  ))}

                  {/* Selected shop popup */}
                  {selectedShop && (
                    <div
                      className="absolute z-30"
                      style={{
                        left: `${selectedShop.xPercent}%`,
                        top: `${selectedShop.yPercent}%`,
                      }}
                    >
                      <PlanShopPopup
                        shop={selectedShop}
                        onClose={() => setSelectedShop(null)}
                        isAdmin={isAdmin}
                        onDelete={handleDeleteShop}
                      />
                    </div>
                  )}

                  {/* Pending pin marker */}
                  {pendingPin && (
                    <div
                      className="absolute w-8 h-8 -ml-4 -mt-8 z-30 animate-bounce"
                      style={{
                        left: `${pendingPin.xPercent}%`,
                        top: `${pendingPin.yPercent}%`,
                      }}
                    >
                      <span className="text-2xl drop-shadow-lg">📍</span>
                    </div>
                  )}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-40">
            <div className="text-center">
              <span className="text-4xl block mb-2 animate-pulse">🗺️</span>
              <p className="text-sm text-gray-500 font-medium">กำลังโหลดแผนผัง...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom info bar */}
      <div className="px-4 py-2 bg-white/95 backdrop-blur border-t border-gray-100 flex items-center justify-between flex-shrink-0">
        <span className="text-[11px] text-gray-400">
          📍 {shopPins.length} ร้านค้า/จุดสนใจ
        </span>
        <span className="text-[10px] text-gray-300">
          ซูม: scroll/pinch · เลื่อน: drag
        </span>
      </div>

      {/* Shop pin form modal */}
      {pendingPin && (
        <PlanShopForm
          planId={activePlan.id}
          xPercent={pendingPin.xPercent}
          yPercent={pendingPin.yPercent}
          onClose={() => setPendingPin(null)}
          onCreated={handleShopCreated}
        />
      )}
    </div>
  );

  return createPortal(content, document.body);
}

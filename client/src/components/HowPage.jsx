import React from 'react';

export default function HowPage({ onBack }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={onBack}
            className="mb-4 flex items-center gap-2 text-green-600 hover:text-green-700 font-medium transition-colors">
            ← ย้อนกลับ
          </button>
          <h1 className="text-4xl font-black text-gray-800 mb-2">ทำงานยังไง?</h1>
          <p className="text-gray-500">อยากรู้วิธีใช้งาน ImpEx Spot ตรงนี้เลย!</p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {[
            { step: 1, title: 'เปิดแผนที่', desc: 'กดปุ่ม "มาดูแผนที่กัน" เพื่อดูแผนที่พื้นที่คุณ' },
            { step: 2, title: 'ปักหมุด', desc: 'คลิกที่ตำแหน่งที่ต้องการและกรอกข้อมูลหมุด' },
            { step: 3, title: 'แบ่งปัน', desc: 'ปักหมุดของคุณจะแสดงให้ผู้ใช้คนอื่นเห็น' },
            { step: 4, title: 'แจ้งเหตุ', desc: 'ในกรณีฉุกเฉิน ให้กดปุ่มแจ้งเหตุโดยด่วน' },
            { step: 5, title: 'กรอง', desc: 'ใช้ตัวกรองเพื่อค้นหาหมุดตามหมวดหมู่ที่ต้องการ' },
          ].map(item => (
            <div key={item.step} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex gap-4 items-start">
                <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-black text-gray-800 mb-1">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="mt-10 bg-green-100 rounded-2xl p-6 border-l-4 border-green-500">
          <p className="text-green-900 font-medium mb-2">💡 เคล็ดลับ</p>
          <ul className="text-green-800 space-y-1 text-sm">
            <li>• ปักหมุดให้ถูกต้องเพื่อให้ผู้อื่นหาตำแหน่งได้ง่าย</li>
            <li>• อัปเดตข้อมูลหมุดเมื่อสถานการณ์เปลี่ยน</li>
            <li>• ให้ความเห็นเพื่อช่วยชุมชน</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';

export default function FAQPage({ onBack }) {
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    {
      q: 'ImpEx Spot คืออะไร?',
      a: 'ImpEx Spot เป็นแพลตฟอร์มสำหรับปักหมุดและแชร์ข้อมูลเหตุการณ์ สภาวะ และสถานการณ์ต่างๆ ในพื้นที่เพื่อช่วยเหลือชุมชน'
    },
    {
      q: 'ผมสามารถปักหมุดหมวดหมู่ไหนได้บ้าง?',
      a: 'ผมสามารถปักหมุดได้หลายหมวดหมู่เช่น เหตุอุบัติเหตุ ปัญหาสาธารณูปโภค สถานที่ท่องเที่ยว อาหาร และอื่น ๆ ตามความต้องการ'
    },
    {
      q: 'ข้อมูลหมุดของผมปลอดภัยไหม?',
      a: 'ใช่ ข้อมูลส่วนตัวของผมจะถูกเก็บเป็นความลับ เราแสดงเฉพาะตำแหน่งและข้อมูลที่ผมเลือกแบ่งปัน'
    },
    {
      q: 'ผมสามารถแก้ไขหรือลบหมุดได้ไหม?',
      a: 'ได้ ผมสามารถแก้ไขหรือลบหมุดของผมได้ตลอดเวลา ถ้าตำแหน่งเปลี่ยนแปลงหรือสถานการณ์ดีขึ้น'
    },
    {
      q: 'มีค่าใช้จ่ายหรือไม่?',
      a: 'ไม่มีค่าใช้จ่ายเลย! ImpEx Spot เป็นบริการฟรีสำหรับทุกคน'
    },
    {
      q: 'ผมควรรายงานหมุดที่สงสัยไหม?',
      a: 'ถ้าผมพบหมุดที่ไม่เหมาะสมหรือเท็จ ให้รายงานมา ทีมของเราจะตรวจสอบและดำเนินการแก้ไข'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={onBack}
            className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors">
            ← ย้อนกลับ
          </button>
          <h1 className="text-4xl font-black text-gray-800 mb-2">คำถามที่เจอบ่อย</h1>
          <p className="text-gray-500">หาคำตอบสำหรับคำถามทั่วไปเกี่ยวกับ ImpEx Spot</p>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === idx ? -1 : idx)}
                className="w-full px-6 py-4 text-left hover:bg-blue-50 transition-colors flex items-center justify-between"
              >
                <span className="font-black text-gray-800">{faq.q}</span>
                <span className={`text-2xl transition-transform ${openIdx === idx ? 'rotate-45' : ''}`}>
                  +
                </span>
              </button>
              {openIdx === idx && (
                <div className="px-6 pb-4 text-gray-600 border-t border-gray-100">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-10 bg-blue-100 rounded-2xl p-8 border-l-4 border-blue-500 text-center">
          <p className="text-blue-900 font-medium mb-3">ยังมีคำถามอื่นเหรือ?</p>
          <button onClick={onBack}
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-full transition-all">
            📧 ติดต่อเรา
          </button>
        </div>
      </div>
    </div>
  );
}

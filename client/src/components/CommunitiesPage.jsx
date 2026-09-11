import React from 'react';

export default function CommunitiesPage({ onBack }) {
  const communities = [
    { name: 'Impact Commu Bangkok', desc: 'ชุมชนกรุงเทพ', members: 2500, active: true },
    { name: 'Impact Commu Chiang Mai', desc: 'ชุมชนเชียงใหม่', members: 1200, active: true },
    { name: 'Impact Commu Phuket', desc: 'ชุมชนภูเก็ต', members: 800, active: true },
    { name: 'Impact Commu Ubon', desc: 'ชุมชนอุบลราชธานี', members: 600, active: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={onBack}
            className="mb-4 flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium transition-colors">
            ← ย้อนกลับ
          </button>
          <h1 className="text-4xl font-black text-gray-800 mb-2">Impact Community</h1>
          <p className="text-gray-500">เข้าร่วมชุมชน Impact สำหรับสร้างความเปลี่ยนแปลงในพื้นที่ของคุณ</p>
        </div>

        {/* Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {communities.map((commu, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-black text-gray-800">{commu.name}</h3>
                  <p className="text-sm text-gray-500">{commu.desc}</p>
                </div>
                {commu.active && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                    ✓ กำลังดำเนิน
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">👥 {commu.members.toLocaleString('th-TH')} สมาชิก</span>
                <button className="bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-full transition-all">
                  เข้าร่วม
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* About Section */}
        <div className="bg-purple-100 rounded-2xl p-8 border-l-4 border-purple-500">
          <h2 className="text-2xl font-black text-purple-900 mb-4">ทำไมต้องเข้าร่วม?</h2>
          <ul className="space-y-3 text-purple-800">
            <li className="flex gap-3">
              <span className="text-xl">🤝</span>
              <span><strong>ร่วมมือกัน</strong> - เชื่อมต่อกับผู้คนในพื้นที่เดียวกัน</span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl">📢</span>
              <span><strong>แชร์ข้อมูล</strong> - แบ่งปันสถานการณ์ที่สำคัญ</span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl">🎯</span>
              <span><strong>สร้างความเปลี่ยนแปลง</strong> - ร่วมพัฒนาพื้นที่ของคุณ</span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl">🏆</span>
              <span><strong>ได้รับยกย่อง</strong> - เป็นผู้มีส่วนร่วมในชุมชน</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

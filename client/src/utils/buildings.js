export const BUILDINGS = [
  {
    id: 'challenger',
    name: 'IMPACT Challenger',
    type: 'exhibition',
    polygon: [
      [13.9150, 100.5480],
      [13.9150, 100.5510],
      [13.9125, 100.5510],
      [13.9125, 100.5480],
    ],
    floors: [
      {
        id: 'c-f1',
        level: 1,
        name: 'ชั้น 1 (Halls 1-3)',
        description: 'โถงนิทรรศการหลัก',
        image: '/images/impact-forum-floorplan.png'
      },
      {
        id: 'c-f2',
        level: 2,
        name: 'ชั้น 2 (Royal Jubilee)',
        description: 'ห้องบอลรูม และห้องประชุม Jupiter',
        image: '/images/impact-forum-floorplan.png'
      }
    ]
  },
  {
    id: 'forum',
    name: 'IMPACT Forum',
    type: 'exhibition',
    polygon: [
      [13.9168, 100.5450],
      [13.9168, 100.5480],
      [13.9155, 100.5480],
      [13.9155, 100.5450],
    ],
    floors: [
      {
        id: 'f-f1',
        level: 1,
        name: 'ชั้น 1 (Hall 4)',
        description: 'โถงนิทรรศการ IMPACT Forum',
        image: '/images/impact-forum-floorplan.png'
      },
      {
        id: 'f-f2',
        level: 2,
        name: 'ชั้น 2 (Sapphire)',
        description: 'ห้องประชุมย่อย Sapphire',
        image: '/images/impact-forum-floorplan.png' 
      }
    ]
  },
  {
    id: 'exhibition',
    name: 'IMPACT Exhibition Center',
    type: 'exhibition',
    polygon: [
      [13.9133, 100.5430],
      [13.9133, 100.5470],
      [13.9100, 100.5470],
      [13.9100, 100.5430],
    ],
    floors: [
      {
        id: 'e-f1',
        level: 1,
        name: 'ชั้น 1 (Halls 5-12)',
        description: 'โถงจัดแสดงสินค้าและนิทรรศการ',
        image: '/images/impact-forum-floorplan.png'
      }
    ]
  },
  {
    id: 'arena',
    name: 'IMPACT Arena',
    type: 'arena',
    polygon: [
      [13.9135, 100.5465],
      [13.9135, 100.5485],
      [13.9115, 100.5485],
      [13.9115, 100.5465],
    ],
    floors: [
      {
        id: 'a-f1',
        level: 1,
        name: 'Arena Floor',
        description: 'ฮอลล์จัดคอนเสิร์ตหลัก',
        image: '/images/impact-forum-floorplan.png'
      }
    ]
  }
];

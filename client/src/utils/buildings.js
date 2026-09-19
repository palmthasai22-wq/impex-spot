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
        image: '/images/floorplans/challenger-f1.png'
      },
      {
        id: 'c-f2',
        level: 2,
        name: 'ชั้น 2 (Royal Jubilee)',
        description: 'ห้องบอลรูม และห้องประชุม Jupiter',
        image: '/images/floorplans/challenger-f2.png'
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
        name: 'ชั้น 1 (Hall 4 & Sapphire)',
        description: 'โถงนิทรรศการและห้องประชุม',
        image: '/images/floorplans/forum-f1.png'
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
        image: '/images/floorplans/exhibition-f1.png'
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
        name: 'ชั้น 1',
        description: 'พื้นที่ชั้น 1',
        image: '/images/floorplans/arena-f1.png'
      },
      {
        id: 'a-f2',
        level: 2,
        name: 'ชั้น 2',
        description: 'พื้นที่ชั้น 2',
        image: '/images/floorplans/arena-f2.png'
      },
      {
        id: 'a-f3',
        level: 3,
        name: 'ชั้น 3',
        description: 'พื้นที่ชั้น 3',
        image: '/images/floorplans/arena-f3.png'
      },
      {
        id: 'a-f4',
        level: 4,
        name: 'ชั้น 4',
        description: 'พื้นที่ชั้น 4',
        image: '/images/floorplans/arena-f4.png'
      }
    ]
  }
];

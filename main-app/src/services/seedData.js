// 초기 재고 데이터 — 리셋 시 이 값으로 복원
const INITIAL_PARTS = [
  {
    partId: 'ENGINE-V6',
    partName: 'V6 엔진',
    category: 'engine',
    currentStock: 10,
    threshold: 5,
    orderQuantity: 5,
  },
  {
    partId: 'TIRE-R18',
    partName: 'R18 타이어',
    category: 'tire',
    currentStock: 40,
    threshold: 20,
    orderQuantity: 20,
  },
  {
    partId: 'BATTERY-72KWH',
    partName: '72kWh 배터리',
    category: 'battery',
    currentStock: 8,
    threshold: 3,
    orderQuantity: 5,
  },
];

module.exports = { INITIAL_PARTS };

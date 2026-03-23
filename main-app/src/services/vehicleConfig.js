// 차량 타입별 필요 부품 정의
const VEHICLE_PARTS = {
  sedan: {
    type: 'ice',
    label: '내연기관 세단',
    requiredParts: {
      'ENGINE-V6': 1,
      'TIRE-R18': 4,
    },
  },
  ev: {
    type: 'ev',
    label: '전기차',
    requiredParts: {
      'BATTERY-72KWH': 2,
      'TIRE-R18': 4,
    },
  },
  suv: {
    type: 'hybrid',
    label: '하이브리드 SUV',
    requiredParts: {
      'ENGINE-V6': 1,
      'TIRE-R18': 4,
      'BATTERY-72KWH': 1,
    },
  },
};

function getRequiredParts(vehicleModel) {
  const vehicle = VEHICLE_PARTS[vehicleModel];
  if (!vehicle) return null;
  return { ...vehicle };
}

function getVehicleModels() {
  return Object.entries(VEHICLE_PARTS).map(([model, info]) => ({
    model,
    type: info.type,
    label: info.label,
    requiredParts: info.requiredParts,
  }));
}

module.exports = { getRequiredParts, getVehicleModels, VEHICLE_PARTS };

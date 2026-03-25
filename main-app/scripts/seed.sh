#!/bin/bash
# Parts 테이블에 초기 재고 데이터 3건 입력
# 사용법: ./scripts/seed.sh

set -euo pipefail

# .env에서 USER_PREFIX 읽기
if [ -f .env ]; then
  source .env
fi

if [ -z "${USER_PREFIX:-}" ]; then
  echo "❌ USER_PREFIX가 설정되지 않았습니다."
  echo "   .env 파일에 USER_PREFIX=kmucd1-XX 를 설정하세요."
  exit 1
fi

TABLE="${USER_PREFIX}-Parts"
REGION="${AWS_REGION:-us-east-1}"

echo "📦 시드 데이터 입력: ${TABLE} (${REGION})"
echo ""

aws dynamodb put-item --table-name "${TABLE}" --region "${REGION}" --item '{
  "partId":{"S":"ENGINE-V6"},
  "partName":{"S":"V6 엔진"},
  "category":{"S":"engine"},
  "currentStock":{"N":"50"},
  "threshold":{"N":"20"},
  "orderQuantity":{"N":"100"},
  "updatedAt":{"S":"2026-03-26T00:00:00Z"}
}'
echo "  ✅ ENGINE-V6 (V6 엔진) — 재고: 50"

aws dynamodb put-item --table-name "${TABLE}" --region "${REGION}" --item '{
  "partId":{"S":"TIRE-R18"},
  "partName":{"S":"R18 타이어"},
  "category":{"S":"tire"},
  "currentStock":{"N":"200"},
  "threshold":{"N":"80"},
  "orderQuantity":{"N":"400"},
  "updatedAt":{"S":"2026-03-26T00:00:00Z"}
}'
echo "  ✅ TIRE-R18 (R18 타이어) — 재고: 200"

aws dynamodb put-item --table-name "${TABLE}" --region "${REGION}" --item '{
  "partId":{"S":"BATTERY-72KWH"},
  "partName":{"S":"72kWh 배터리"},
  "category":{"S":"battery"},
  "currentStock":{"N":"30"},
  "threshold":{"N":"10"},
  "orderQuantity":{"N":"50"},
  "updatedAt":{"S":"2026-03-26T00:00:00Z"}
}'
echo "  ✅ BATTERY-72KWH (72kWh 배터리) — 재고: 30"

echo ""
echo "🎉 완료! ${TABLE}에 3건 입력됨"

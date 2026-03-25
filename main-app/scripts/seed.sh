#!/bin/bash
# Parts 테이블에 초기 재고 데이터 3건 입력
# 사용법: ./scripts/seed.sh

set -euo pipefail

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
  "partId":{"S":"ENGINE-V6"},"partName":{"S":"V6 엔진"},
  "category":{"S":"engine"},"currentStock":{"N":"10"},
  "threshold":{"N":"5"},"orderQuantity":{"N":"20"},
  "updatedAt":{"S":"2026-03-26T00:00:00Z"}
}'
echo "  ✅ ENGINE-V6 (V6 엔진) — 재고: 10, 임계치: 5"

aws dynamodb put-item --table-name "${TABLE}" --region "${REGION}" --item '{
  "partId":{"S":"TIRE-R18"},"partName":{"S":"R18 타이어"},
  "category":{"S":"tire"},"currentStock":{"N":"40"},
  "threshold":{"N":"20"},"orderQuantity":{"N":"80"},
  "updatedAt":{"S":"2026-03-26T00:00:00Z"}
}'
echo "  ✅ TIRE-R18 (R18 타이어) — 재고: 40, 임계치: 20"

aws dynamodb put-item --table-name "${TABLE}" --region "${REGION}" --item '{
  "partId":{"S":"BATTERY-72KWH"},"partName":{"S":"72kWh 배터리"},
  "category":{"S":"battery"},"currentStock":{"N":"8"},
  "threshold":{"N":"3"},"orderQuantity":{"N":"10"},
  "updatedAt":{"S":"2026-03-26T00:00:00Z"}
}'
echo "  ✅ BATTERY-72KWH (72kWh 배터리) — 재고: 8, 임계치: 3"

echo ""
echo "🎉 완료! ${TABLE}에 3건 입력됨"

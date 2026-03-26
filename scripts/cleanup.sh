#!/bin/bash
# 학생 리소스 일괄 삭제 스크립트
# 사용법: ./scripts/cleanup.sh <prefix>
# 예시: ./scripts/cleanup.sh kmucd1    → kmucd1-00 ~ kmucd1-50 리소스 전부 삭제
#       ./scripts/cleanup.sh kmucd1-03 → kmucd1-03 리소스만 삭제

set -euo pipefail

PREFIX="${1:-}"
REGION="us-east-1"

if [ -z "$PREFIX" ]; then
  echo "사용법: $0 <prefix>"
  echo "  예: $0 kmucd1      (그룹 전체)"
  echo "  예: $0 kmucd1-03   (특정 학생)"
  exit 1
fi

echo "🔍 prefix: ${PREFIX}* 리소스 검색 중... (리전: ${REGION})"
echo ""

# 1. Lambda Event Source Mappings 제거
echo "=== Lambda Event Source Mappings ==="
FUNCTIONS=$(aws lambda list-functions --region $REGION --query "Functions[?starts_with(FunctionName, \`${PREFIX}\`)].FunctionName" --output text)
for func in $FUNCTIONS; do
  UUIDS=$(aws lambda list-event-source-mappings --function-name $func --region $REGION --query 'EventSourceMappings[*].UUID' --output text 2>/dev/null)
  for uuid in $UUIDS; do
    echo "  삭제: $func → $uuid"
    aws lambda delete-event-source-mapping --uuid $uuid --region $REGION 2>/dev/null || true
  done
done

# 2. Lambda 삭제
echo ""
echo "=== Lambda Functions ==="
for func in $FUNCTIONS; do
  echo "  삭제: $func"
  aws lambda delete-function --function-name $func --region $REGION 2>/dev/null || true
done

# 3. SNS 구독 + 토픽 삭제
echo ""
echo "=== SNS Topics + Subscriptions ==="
TOPICS=$(aws sns list-topics --region $REGION --query 'Topics[*].TopicArn' --output text | tr '\t' '\n' | grep ":${PREFIX}" || true)
for topic in $TOPICS; do
  SUBS=$(aws sns list-subscriptions-by-topic --topic-arn $topic --region $REGION --query 'Subscriptions[*].SubscriptionArn' --output text 2>/dev/null || true)
  for sub in $SUBS; do
    if [ "$sub" != "PendingConfirmation" ] && [ -n "$sub" ]; then
      aws sns unsubscribe --subscription-arn $sub --region $REGION 2>/dev/null || true
      echo "  구독 삭제: ${sub##*:}"
    fi
  done
  aws sns delete-topic --topic-arn $topic --region $REGION 2>/dev/null || true
  echo "  토픽 삭제: ${topic##*:}"
done

# 4. SQS 큐 삭제
echo ""
echo "=== SQS Queues ==="
QUEUES=$(aws sqs list-queues --region $REGION --queue-name-prefix $PREFIX --query 'QueueUrls[*]' --output text 2>/dev/null | tr '\t' '\n' || true)
for queue in $QUEUES; do
  name="${queue##*/}"
  echo "  삭제: $name"
  aws sqs delete-queue --queue-url $queue --region $REGION 2>/dev/null || true
done

# 5. DynamoDB 테이블 삭제
echo ""
echo "=== DynamoDB Tables ==="
TABLES=$(aws dynamodb list-tables --region $REGION --query 'TableNames' --output text | tr '\t' '\n' | grep "^${PREFIX}" || true)
for table in $TABLES; do
  echo "  삭제: $table"
  aws dynamodb delete-table --table-name $table --region $REGION --query 'TableDescription.TableStatus' --output text 2>/dev/null || true
done

# 6. S3 버킷은 삭제하지 않음 (프론트엔드 재배포 필요)
echo ""
echo "=== S3 Buckets (삭제 제외) ==="
BUCKETS=$(aws s3 ls | awk '{print $3}' | grep "^${PREFIX}" || true)
for bucket in $BUCKETS; do
  echo "  유지: $bucket"
done

# 결과 확인
echo ""
echo "✅ 삭제 완료. 검증 중..."
echo ""

REMAIN=0
R_SNS=$(aws sns list-topics --region $REGION --query 'Topics[*].TopicArn' --output text | tr '\t' '\n' | grep ":${PREFIX}" 2>/dev/null | wc -l | tr -d ' ')
R_SQS=$(aws sqs list-queues --region $REGION --queue-name-prefix $PREFIX --query 'QueueUrls' --output text 2>/dev/null | tr '\t' '\n' | grep "${PREFIX}" | wc -l | tr -d ' ')
R_LAMBDA=$(aws lambda list-functions --region $REGION --query "Functions[?starts_with(FunctionName, \`${PREFIX}\`)].FunctionName" --output text 2>/dev/null | wc -w | tr -d ' ')
R_DDB=$(aws dynamodb list-tables --region $REGION --query 'TableNames' --output text | tr '\t' '\n' | grep "^${PREFIX}" 2>/dev/null | wc -l | tr -d ' ')
echo "  SNS:      ${R_SNS}개 남음"
echo "  SQS:      ${R_SQS}개 남음"
echo "  Lambda:   ${R_LAMBDA}개 남음"
echo "  DynamoDB: ${R_DDB}개 남음"

TOTAL=$((R_SNS + R_SQS + R_LAMBDA + R_DDB))
if [ "$TOTAL" -eq 0 ]; then
  echo ""
  echo "🎉 ${PREFIX}* 리소스 전부 삭제 완료!"
else
  echo ""
  echo "⚠️  ${TOTAL}개 리소스가 남아있습니다. (삭제 지연 또는 권한 부족)"
fi

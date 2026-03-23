# Nxt-MSA 실습 교재 — 계획

## 목표
차량 조립 공장 부품 재고 관리 MSA 시스템의 전체 코드 + 인프라 + 실습 문서를 완성한다.

## 범위
- 메인 앱서버 (Express + DynamoDB)
- 프론트엔드 (바닐라 HTML/CSS/JS)
- 부품 공장 3개 (의도적으로 다른 API)
- Lambda 커넥터 5개
- CloudFormation 7개 스택
- 실습 문서 8개 Lab
- 배포/정리 스크립트

## 우선순위별 작업

### P0 — 즉시
- [ ] 메인 앱서버 (routes, services, models, app.js)
- [ ] DynamoDB 테이블 설계 + CloudFormation
- [ ] 프론트엔드 UI

### P1 — 중요
- [ ] 공장 서버 3개 (engine, tire, battery)
- [ ] SNS + SQS CloudFormation
- [ ] Lambda 커넥터 5개
- [ ] 입고 경로 구현

### P2 — 개선
- [ ] 실습 문서 (Lab 00 ~ Lab 08)
- [ ] 배포 스크립트 (deploy-all.sh, teardown.sh)
- [ ] 장애/복구 시나리오 가이드
- [ ] README.md

## 제약
- 한 커밋 = 한 목적
- 정리와 기능을 한 커밋에 섞지 않기
- 교육용이므로 이해 용이성 > 코드 복잡도
- 프레임워크 학습 부담 제거 (바닐라 JS)

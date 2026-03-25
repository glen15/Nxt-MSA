# Lab 02: S3 프론트엔드 (30분)

## 목표
S3 정적 웹사이트 호스팅으로 프론트엔드를 배포하고, 브라우저에서 API를 호출한다.

## Step 1: S3 버킷 생성 (콘솔)

1. AWS 콘솔 → S3 → 버킷 만들기
2. 버킷 이름: `nxt-msa-<본인이름>-frontend` (고유해야 함)
3. 리전: `us-east-1`
4. **모든 퍼블릭 액세스 차단** 해제 (체크 해제 + 확인)
5. 버킷 만들기

## Step 2: 정적 웹사이트 호스팅 활성화

1. 버킷 → 속성 탭 → 정적 웹사이트 호스팅
2. **활성화**
3. 인덱스 문서: `index.html`
4. 저장

## Step 3: 버킷 정책 설정

버킷 → 권한 탭 → 버킷 정책:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::<버킷이름>/*"
  }]
}
```

## Step 4: 프론트엔드 업로드

### config.js 수정
`frontend/js/config.js`를 열어 API 서버 주소 설정:
```javascript
window.API_BASE = 'http://<메인앱서버IP>:3000';
```

### 파일 업로드
```bash
aws s3 sync frontend/ s3://<버킷이름>/ --delete
```

## Step 5: 브라우저에서 확인

S3 정적 웹사이트 엔드포인트를 브라우저에서 열기:
```
http://<버킷이름>.s3-website-us-east-1.amazonaws.com
```

## 핵심 확인 포인트
- [ ] 재고 현황이 표시되는가
- [ ] 차량 주문 버튼 3개가 보이는가
- [ ] sedan/ev/suv 주문이 되는가
- [ ] 주문 후 재고 수치가 변하는가

> 💡 **교육 포인트**: 프론트엔드(S3)와 백엔드(EC2)가 분리되어 있다. CORS가 필요한 이유.

## 다음
→ [Lab 03: 공장 API 탐험](lab-03-factory-api.md)

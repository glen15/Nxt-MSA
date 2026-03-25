# Lab 00: 환경 설정 (30분)

## 목표
실습에 필요한 도구를 설치하고 AWS 환경을 준비한다.

## 사전 준비

### 1. AWS CLI 설치
```bash
# macOS
brew install awscli

# Windows
# https://aws.amazon.com/cli/ 에서 MSI 설치

# 확인
aws --version
```

### 2. AWS 자격 증명 설정
```bash
aws configure
# AWS Access Key ID: (IAM 사용자 키)
# AWS Secret Access Key: (IAM 사용자 시크릿)
# Default region name: us-east-1
# Default output format: json
```

### 3. Node.js 20 설치
```bash
# macOS
brew install node@20

# 또는 nvm 사용
nvm install 20
nvm use 20

# 확인
node --version  # v20.x.x
npm --version
```

### 4. 리포지토리 클론
```bash
git clone <레포지토리 URL>
cd Nxt-MSA
```

### 5. 강사에게 받을 정보
- **공장 서버 IP**: 강사가 `terraform output`으로 제공
- 환경변수에 설정할 값:
  ```
  ENGINE_FACTORY_URL=http://<강사IP>:3001
  TIRE_FACTORY_URL=http://<강사IP>:3002
  BATTERY_FACTORY_URL=http://<강사IP>:3003
  ```

## 확인 체크리스트
- [ ] `aws sts get-caller-identity` 성공
- [ ] `node --version` → v20.x.x
- [ ] 레포지토리 클론 완료
- [ ] 강사 공장 서버 IP 확인

## 다음
→ [Lab 01: DynamoDB + 메인 앱](lab-01-dynamodb-and-main-app.md)

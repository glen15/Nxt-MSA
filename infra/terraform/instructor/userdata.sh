#!/bin/bash
set -euo pipefail
exec > /var/log/userdata.log 2>&1
echo "=== 배포 시작: $(date) ==="

echo "=== [1/4] Node.js 20 + 빌드 도구 설치 ==="
dnf install -y nodejs20 npm git gcc-c++ make python3

echo "=== [2/4] 소스 코드 다운로드 ==="
git clone https://github.com/glen15/Nxt-MSA.git /opt/nxt-msa
cd /opt/nxt-msa/factories

echo "=== [3/4] 의존성 설치 ==="
cd /opt/nxt-msa/factories/shared && npm ci --production
cd /opt/nxt-msa/factories/engine-factory && npm ci --production
cd /opt/nxt-msa/factories/tire-factory && npm ci --production
cd /opt/nxt-msa/factories/battery-factory && npm ci --production
cd /opt/nxt-msa/factories/hub && npm ci --production

echo "=== [4/4] systemd 서비스 등록 및 시작 ==="

# 공통 환경변수 파일
cat > /opt/nxt-msa/factories/.env << 'ENVEOF'
AWS_REGION=${aws_region}
RECEIVING_TOPIC_ARN=${receiving_topic_arn}
FACTORY_DB_PATH=/opt/nxt-msa/factories/shared/factory.db
ENVEOF

# 엔진 공장 (:3001)
cat > /etc/systemd/system/engine-factory.service << 'SERVICE'
[Unit]
Description=Engine Factory Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nxt-msa/factories/engine-factory
EnvironmentFile=/opt/nxt-msa/factories/.env
Environment=PORT=3001
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

# 타이어 공장 (:3002)
cat > /etc/systemd/system/tire-factory.service << 'SERVICE'
[Unit]
Description=Tire Factory Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nxt-msa/factories/tire-factory
EnvironmentFile=/opt/nxt-msa/factories/.env
Environment=PORT=3002
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

# 배터리 공장 (:3003)
cat > /etc/systemd/system/battery-factory.service << 'SERVICE'
[Unit]
Description=Battery Factory Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nxt-msa/factories/battery-factory
EnvironmentFile=/opt/nxt-msa/factories/.env
Environment=PORT=3003
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

# 통합 대시보드 (:3000)
cat > /etc/systemd/system/factory-hub.service << 'SERVICE'
[Unit]
Description=Factory Hub Dashboard
After=engine-factory.service tire-factory.service battery-factory.service

[Service]
Type=simple
WorkingDirectory=/opt/nxt-msa/factories/hub
EnvironmentFile=/opt/nxt-msa/factories/.env
Environment=PORT=3000
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable --now engine-factory tire-factory battery-factory factory-hub

# IMDSv2 토큰으로 퍼블릭 IP 조회
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $${TOKEN}" \
  http://169.254.169.254/latest/meta-data/public-ipv4)

echo "=== 배포 완료: $(date) ==="
echo "통합 대시보드: http://$${PUBLIC_IP}:3000"
echo "엔진 공장:     http://$${PUBLIC_IP}:3001"
echo "타이어 공장:   http://$${PUBLIC_IP}:3002"
echo "배터리 공장:   http://$${PUBLIC_IP}:3003"

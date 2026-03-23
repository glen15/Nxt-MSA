#!/bin/bash
set -euo pipefail

# Node.js 20 설치
dnf install -y nodejs20 git

# 앱 디렉토리 생성
mkdir -p /opt/nxt-msa
cd /opt/nxt-msa

# 소스 코드 복사 (git clone or S3 다운로드로 변경 가능)
cat > /opt/nxt-msa/download.sh << 'SCRIPT'
#!/bin/bash
# TODO: git clone 또는 S3에서 factories/ 코드 다운로드
echo "소스 코드를 /opt/nxt-msa/factories 에 배치하세요"
SCRIPT
chmod +x /opt/nxt-msa/download.sh

# 환경변수 설정
cat > /opt/nxt-msa/.env << ENV
AWS_REGION=${aws_region}
RECEIVING_TOPIC_ARN=${receiving_topic_arn}
ENV

# systemd 서비스 — 엔진 공장 (:3001)
cat > /etc/systemd/system/engine-factory.service << 'SERVICE'
[Unit]
Description=Engine Factory Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nxt-msa/factories/engine-factory
EnvironmentFile=/opt/nxt-msa/.env
Environment=PORT=3001
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

# systemd 서비스 — 타이어 공장 (:3002)
cat > /etc/systemd/system/tire-factory.service << 'SERVICE'
[Unit]
Description=Tire Factory Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nxt-msa/factories/tire-factory
EnvironmentFile=/opt/nxt-msa/.env
Environment=PORT=3002
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

# systemd 서비스 — 배터리 공장 (:3003)
cat > /etc/systemd/system/battery-factory.service << 'SERVICE'
[Unit]
Description=Battery Factory Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nxt-msa/factories/battery-factory
EnvironmentFile=/opt/nxt-msa/.env
Environment=PORT=3003
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
# 서비스 시작은 코드 배치 후 수동으로
# systemctl enable --now engine-factory tire-factory battery-factory

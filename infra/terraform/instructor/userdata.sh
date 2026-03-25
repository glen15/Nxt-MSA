#!/bin/bash
set -euo pipefail
exec > /var/log/userdata.log 2>&1
echo "=== 배포 시작: $(date) ==="

echo "=== [1/5] Swap 설정 (t3.micro 메모리 보완) ==="
dd if=/dev/zero of=/swapfile bs=1M count=1024
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

echo "=== [2/5] Docker 설치 ==="
dnf install -y docker git
systemctl enable --now docker
usermod -aG docker ec2-user

# Docker Compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
ARCH=$(uname -m)
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$${ARCH}" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

echo "=== [3/5] 소스 코드 다운로드 ==="
git clone https://github.com/glen15/Nxt-MSA.git /opt/nxt-msa

echo "=== [4/5] 환경변수 설정 ==="
cat > /opt/nxt-msa/factories/.env << 'ENVEOF'
AWS_REGION=${aws_region}
RECEIVING_TOPIC_ARN=${receiving_topic_arn}
ENVEOF

echo "=== [5/5] Docker Compose 빌드 및 실행 ==="
cd /opt/nxt-msa/factories
docker compose up -d --build

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

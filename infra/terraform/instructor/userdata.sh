#!/bin/bash
set -euo pipefail
exec > /var/log/userdata.log 2>&1
echo "=== 배포 시작: $(date) ==="

echo "=== [1/4] Docker CE 공식 리포 설치 ==="
dnf install -y git

# AL2023용 Docker CE 리포 (CentOS 9 호환)
cat > /etc/yum.repos.d/docker-ce.repo << 'REPO'
[docker-ce-stable]
name=Docker CE Stable
baseurl=https://download.docker.com/linux/centos/9/$basearch/stable
enabled=1
gpgcheck=1
gpgkey=https://download.docker.com/linux/centos/gpg
REPO

dnf install -y --allowerasing docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
usermod -aG docker ec2-user

echo "=== [2/4] 소스 코드 다운로드 ==="
git clone https://github.com/glen15/Nxt-MSA.git /opt/nxt-msa

echo "=== [3/4] 환경변수 설정 ==="
cat > /opt/nxt-msa/factories/.env << 'ENVEOF'
AWS_REGION=${aws_region}
RECEIVING_TOPIC_ARN=${receiving_topic_arn}
ENVEOF

echo "=== [4/4] Docker Compose 빌드 및 실행 ==="
cd /opt/nxt-msa/factories
docker compose up -d --build

# IMDSv2 토큰으로 퍼블릭 IP 조회
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $${TOKEN}" \
  http://169.254.169.254/latest/meta-data/public-ipv4)

echo "=== 배포 완료: $(date) ==="
echo "Docker: $(docker --version)"
echo "Compose: $(docker compose version)"
echo ""
echo "통합 대시보드: http://$${PUBLIC_IP}:3000"
echo "엔진 공장:     http://$${PUBLIC_IP}:3001"
echo "타이어 공장:   http://$${PUBLIC_IP}:3002"
echo "배터리 공장:   http://$${PUBLIC_IP}:3003"

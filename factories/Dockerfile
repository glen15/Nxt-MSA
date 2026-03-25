FROM node:20-alpine

# better-sqlite3 네이티브 빌드에 필요
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 의존성 먼저 설치 (Docker 레이어 캐싱)
COPY shared/package*.json shared/
COPY engine-factory/package*.json engine-factory/
COPY tire-factory/package*.json tire-factory/
COPY battery-factory/package*.json battery-factory/
COPY hub/package*.json hub/

RUN cd shared && npm ci --production && \
    cd ../engine-factory && npm ci --production && \
    cd ../tire-factory && npm ci --production && \
    cd ../battery-factory && npm ci --production && \
    cd ../hub && npm ci --production

# 빌드 도구 제거 (이미지 경량화)
RUN apk del python3 make g++

# 소스 복사
COPY shared/ shared/
COPY engine-factory/ engine-factory/
COPY tire-factory/ tire-factory/
COPY battery-factory/ battery-factory/
COPY hub/ hub/

# 데이터 디렉토리
RUN mkdir -p /data

ENV FACTORY_DB_PATH=/data/factory.db

EXPOSE 3000 3001 3002 3003

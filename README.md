# Matzip Keep

맛집을 등록하고, 저장하고, 방문과 리뷰를 관리하는 React + NestJS + MySQL 서비스입니다.

## Local

MySQL에 데이터베이스를 만든 뒤 실행합니다.

```sql
CREATE DATABASE IF NOT EXISTS matzip
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

```powershell
cd backend
npm install
npm run start:dev
```

```powershell
cd frontend
npm install
npm run dev
```

## Railway Backend

1. Railway에서 새 프로젝트를 만듭니다.
2. MySQL 서비스를 추가합니다.
3. GitHub 저장소에서 `backend` 폴더를 백엔드 서비스로 배포합니다.
4. 백엔드 서비스 환경변수를 설정합니다.

Required:

```env
PORT=3000
FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app
DB_SYNC=true
```

Railway MySQL을 같은 프로젝트에 붙이면 아래 변수는 보통 자동으로 제공됩니다.

```env
MYSQLHOST=
MYSQLPORT=
MYSQLUSER=
MYSQLPASSWORD=
MYSQLDATABASE=
```

직접 DB 값을 넣고 싶으면 `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`을 사용해도 됩니다.

초기 배포에서는 `DB_SYNC=true`로 테이블을 생성할 수 있습니다. 운영 데이터가 쌓인 뒤에는 migration 도입 전까지 스키마 변경에 주의하세요.

## Vercel Frontend

1. Vercel에서 GitHub 저장소를 import합니다.
2. Root Directory를 `frontend`로 설정합니다.
3. 환경변수를 설정합니다.

```env
VITE_API_URL=https://your-railway-backend.up.railway.app
```

4. 배포 후 Vercel 도메인을 Railway 백엔드의 `FRONTEND_ORIGIN`에 넣습니다.

여러 origin을 허용하려면 쉼표로 연결합니다.

```env
FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,https://your-vercel-domain.vercel.app
```

## Useful Commands

```powershell
cd backend
npm run lint
npm run build
npm test -- --runInBand
```

```powershell
cd frontend
npm run lint
npm run build
```

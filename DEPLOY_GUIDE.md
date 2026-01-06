# 성능 대시보드 배포 가이드

## 전체 설정 순서

1. Supabase 프로젝트 생성 및 테이블 설정
2. Netlify 배포
3. GitHub Secrets 설정
4. 테스트 실행 및 확인

---

## 1. Supabase 설정

### 1.1 프로젝트 생성
1. [supabase.com](https://supabase.com) 접속
2. GitHub 계정으로 로그인
3. "New Project" 클릭
   - Project name: `memopatch-performance`
   - Database Password: 안전한 비밀번호 입력
   - Region: Northeast Asia (Tokyo)
4. 프로젝트 생성 완료 대기 (1-2분)

### 1.2 테이블 생성
1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. `SUPABASE_SETUP.md` 파일의 SQL 코드 복사/붙여넣기
3. **Run** 버튼 클릭

### 1.3 API 키 확인
1. 왼쪽 메뉴에서 **Settings** → **API** 클릭
2. 다음 값들을 메모:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: 대시보드용 (공개 가능)
   - **service_role**: GitHub Actions용 (비밀!)

---

## 2. Netlify 배포

### 2.1 Netlify 연결
1. [netlify.com](https://netlify.com) 접속
2. GitHub 계정으로 로그인
3. "Add new site" → "Import an existing project"
4. GitHub 연결 → 레포지토리 선택

### 2.2 빌드 설정
```
Base directory: E2E-자동화-테스트/performance-dashboard
Build command: npm run build
Publish directory: E2E-자동화-테스트/performance-dashboard/dist
```

### 2.3 환경 변수 설정
Site settings → Environment variables:
- `VITE_SUPABASE_URL`: Supabase Project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon public key

### 2.4 도메인 설정 (선택)
Site settings → Domain management:
- 기본: `random-name.netlify.app`
- 커스텀 서브도메인: `memopatch-perf.netlify.app`로 변경 가능

---

## 3. GitHub Secrets 설정

레포지토리 → Settings → Secrets and variables → Actions:

| Secret Name | 값 |
|-------------|-----|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | service_role 키 (비밀!) |

---

## 4. 테스트 및 확인

### 4.1 수동 테스트
```bash
# 성능 테스트 실행
npm run test:performance

# 로컬에서 업로드 테스트 (환경 변수 필요)
SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx npx ts-node utils/supabase-uploader.ts
```

### 4.2 대시보드 확인
- 배포된 URL 접속: `https://memopatch-perf.netlify.app`
- 데모 데이터로 UI 확인 가능 (Supabase 연결 전)
- Supabase 연결 후 실제 데이터 표시

### 4.3 GitHub Actions 확인
- 워크플로우 수동 실행 (workflow_dispatch)
- Slack 알림에 대시보드 링크 포함 확인

---

## 파일 구조

```
performance-dashboard/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx    # 메인 대시보드
│   │   └── Dashboard.css    # 스타일
│   ├── lib/
│   │   └── supabase.ts      # Supabase 클라이언트 + 타입
│   ├── App.tsx
│   └── main.tsx
├── netlify.toml             # Netlify 설정
├── .env.example             # 환경 변수 예시
├── SUPABASE_SETUP.md        # Supabase SQL
└── DEPLOY_GUIDE.md          # 이 파일

utils/
└── supabase-uploader.ts     # CI에서 데이터 업로드
```

---

## 문제 해결

### 대시보드에 데이터가 안 나와요
1. 브라우저 개발자 도구 → Console 확인
2. Supabase 환경 변수 설정 확인
3. Supabase 테이블 RLS 정책 확인

### GitHub Actions에서 업로드 실패
1. Secrets 설정 확인 (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`)
2. Actions 로그에서 오류 메시지 확인
3. Supabase 서비스 키 권한 확인

### 차트가 안 보여요
1. 데이터가 있는지 확인 (Supabase Table Editor)
2. 브라우저 새로고침
3. 하드 리프레시: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

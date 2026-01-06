# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인
4. "New Project" 생성
   - Organization: 선택 또는 생성
   - Project name: `memopatch-performance`
   - Database Password: 안전한 비밀번호 설정
   - Region: Northeast Asia (Tokyo) 권장

## 2. 데이터베이스 테이블 생성

Supabase 대시보드 > SQL Editor에서 아래 SQL 실행:

```sql
-- 성능 테스트 결과 테이블
CREATE TABLE performance_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  test_name VARCHAR(255) NOT NULL,
  action_name VARCHAR(255) NOT NULL,
  duration_ms NUMERIC NOT NULL,
  threshold_ms NUMERIC,
  status VARCHAR(20) CHECK (status IN ('pass', 'fail', 'warning')),
  run_id VARCHAR(100),
  commit_sha VARCHAR(40),
  branch VARCHAR(100),
  environment VARCHAR(50) DEFAULT 'qa'
);

-- 테스트 실행 요약 테이블
CREATE TABLE test_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_tests INTEGER,
  passed_tests INTEGER,
  failed_tests INTEGER,
  avg_duration_ms NUMERIC,
  commit_sha VARCHAR(40),
  branch VARCHAR(100),
  triggered_by VARCHAR(100)
);

-- 인덱스 생성 (쿼리 성능 향상)
CREATE INDEX idx_performance_results_created_at ON performance_results(created_at DESC);
CREATE INDEX idx_performance_results_run_id ON performance_results(run_id);
CREATE INDEX idx_test_runs_created_at ON test_runs(created_at DESC);

-- Row Level Security 비활성화 (공개 대시보드용)
ALTER TABLE performance_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;

-- 읽기 전용 정책 (누구나 조회 가능)
CREATE POLICY "Allow public read access" ON performance_results FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON test_runs FOR SELECT USING (true);

-- 서비스 키로만 삽입 가능
CREATE POLICY "Allow service role insert" ON performance_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role insert" ON test_runs FOR INSERT WITH CHECK (true);
```

## 3. API 키 확인

Supabase 대시보드 > Settings > API에서:

- **Project URL**: `https://xxxxx.supabase.co`
- **anon (public) key**: 대시보드에서 데이터 조회용
- **service_role key**: GitHub Actions에서 데이터 삽입용 (비밀로 관리!)

## 4. 환경 변수 설정

### 대시보드용 (.env)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### GitHub Actions용 (Repository Secrets)
- `SUPABASE_URL`: Project URL
- `SUPABASE_SERVICE_KEY`: service_role key

## 5. 확인

테이블이 정상 생성되었는지 확인:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Using demo mode.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// 타입 정의
export interface PerformanceResult {
  id: string;
  created_at: string;
  test_name: string;
  action_name: string;
  duration_ms: number;
  threshold_ms: number | null;
  status: 'pass' | 'fail' | 'warning';
  run_id: string;
  commit_sha: string | null;
  branch: string | null;
  environment: string;
}

export interface TestRun {
  id: string;
  run_id: string;
  created_at: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  avg_duration_ms: number;
  commit_sha: string | null;
  branch: string | null;
  triggered_by: string | null;
}

// API 함수들
export async function getRecentResults(limit = 100): Promise<PerformanceResult[]> {
  if (!supabase) return getDemoData();

  const { data, error } = await supabase
    .from('performance_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching results:', error);
    return getDemoData();
  }

  return data || [];
}

export async function getTestRuns(limit = 30): Promise<TestRun[]> {
  if (!supabase) return getDemoTestRuns();

  const { data, error } = await supabase
    .from('test_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching test runs:', error);
    return getDemoTestRuns();
  }

  return data || [];
}

export async function getResultsByRunId(runId: string): Promise<PerformanceResult[]> {
  if (!supabase) return getDemoData();

  const { data, error } = await supabase
    .from('performance_results')
    .select('*')
    .eq('run_id', runId)
    .order('test_name');

  if (error) {
    console.error('Error fetching results by run:', error);
    return [];
  }

  return data || [];
}

// 데모 데이터 (Supabase 연결 전 테스트용)
function getDemoData(): PerformanceResult[] {
  const now = new Date();
  const actions = [
    { test: 'Login Flow', action: '로그인 버튼 클릭 → 대시보드 로딩', threshold: 3000 },
    { test: 'Dashboard Load', action: '대시보드 페이지 로딩', threshold: 2000 },
    { test: 'Patient List', action: '환자 목록 조회', threshold: 1500 },
    { test: 'Chart Render', action: '심전도 차트 렌더링', threshold: 1000 },
    { test: 'Report Export', action: 'PDF 리포트 생성', threshold: 5000 },
  ];

  return Array.from({ length: 50 }, (_, i) => {
    const actionIndex = i % actions.length;
    const dayOffset = Math.floor(i / 5);
    const baseTime = actions[actionIndex].threshold;
    const variance = (Math.random() - 0.5) * baseTime * 0.4;
    const duration = Math.max(100, baseTime + variance);

    return {
      id: `demo-${i}`,
      created_at: new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000).toISOString(),
      test_name: actions[actionIndex].test,
      action_name: actions[actionIndex].action,
      duration_ms: Math.round(duration),
      threshold_ms: actions[actionIndex].threshold,
      status: duration <= actions[actionIndex].threshold ? 'pass' : 'fail',
      run_id: `run-${dayOffset}`,
      commit_sha: `abc${dayOffset}def`,
      branch: 'main',
      environment: 'qa',
    };
  });
}

function getDemoTestRuns(): TestRun[] {
  const now = new Date();
  return Array.from({ length: 10 }, (_, i) => ({
    id: `demo-run-${i}`,
    run_id: `run-${i}`,
    created_at: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
    total_tests: 5,
    passed_tests: 4 + Math.floor(Math.random() * 2),
    failed_tests: Math.floor(Math.random() * 2),
    avg_duration_ms: 1500 + Math.random() * 500,
    commit_sha: `abc${i}def`,
    branch: 'main',
    triggered_by: 'schedule',
  }));
}

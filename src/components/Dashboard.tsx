import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getRecentResults, getTestRuns } from '../lib/supabase';
import type { PerformanceResult, TestRun } from '../lib/supabase';
import './Dashboard.css';

type TabType = 'overview' | 'api-detail' | 'history';

export function Dashboard() {
  const [results, setResults] = useState<PerformanceResult[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedApi, setSelectedApi] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [resultsData, runsData] = await Promise.all([
        getRecentResults(500),
        getTestRuns(30),
      ]);
      setResults(resultsData);
      setTestRuns(runsData);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>데이터 로딩 중...</p>
      </div>
    );
  }

  // API 목록 추출
  const apiList = ['all', ...new Set(results.map((r) => r.action_name))];

  // 최근 테스트 실행 요약
  const latestRun = testRuns[0];

  // 성공률 계산
  const passRate = results.length > 0
    ? ((results.filter((r) => r.status === 'pass').length / results.length) * 100).toFixed(1)
    : '0';

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>MemoPatch 성능 대시보드</h1>
        <p className="subtitle">E2E 테스트 성능 모니터링</p>
      </header>

      {/* 탭 네비게이션 */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          개요
        </button>
        <button
          className={`tab-button ${activeTab === 'api-detail' ? 'active' : ''}`}
          onClick={() => setActiveTab('api-detail')}
        >
          API별 상세
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          실행 히스토리
        </button>
      </div>

      {/* 개요 탭 */}
      {activeTab === 'overview' && (
        <OverviewTab
          results={results}
          passRate={passRate}
          latestRun={latestRun}
        />
      )}

      {/* API별 상세 탭 */}
      {activeTab === 'api-detail' && (
        <ApiDetailTab
          results={results}
          apiList={apiList}
          selectedApi={selectedApi}
          setSelectedApi={setSelectedApi}
        />
      )}

      {/* 실행 히스토리 탭 */}
      {activeTab === 'history' && (
        <HistoryTab testRuns={testRuns} results={results} />
      )}

      <footer className="dashboard-footer">
        <p>MemoPatch E2E Performance Dashboard</p>
        <p className="updated">
          마지막 업데이트:{' '}
          {results[0]
            ? format(new Date(results[0].created_at), 'yyyy-MM-dd HH:mm:ss', { locale: ko })
            : '-'}
        </p>
      </footer>
    </div>
  );
}

// 개요 탭 컴포넌트
function OverviewTab({
  results,
  passRate,
  latestRun,
}: {
  results: PerformanceResult[];
  passRate: string;
  latestRun: TestRun | undefined;
}) {
  const trendData = prepareTrendData(results);
  const avgByApi = calculateAvgByApi(results);
  const statusData = [
    { name: '성공', value: results.filter((r) => r.status === 'pass').length, fill: '#82ca9d' },
    { name: '실패', value: results.filter((r) => r.status === 'fail').length, fill: '#ff6b6b' },
  ];

  return (
    <>
      {/* 요약 카드 */}
      <div className="summary-cards">
        <div className="card">
          <h3>총 테스트</h3>
          <p className="value">{results.length}</p>
        </div>
        <div className="card">
          <h3>성공률</h3>
          <p className="value success">{passRate}%</p>
        </div>
        <div className="card">
          <h3>평균 응답시간</h3>
          <p className="value">
            {results.length > 0
              ? Math.round(results.reduce((a, r) => a + r.duration_ms, 0) / results.length)
              : 0}
            ms
          </p>
        </div>
        <div className="card">
          <h3>최근 실행</h3>
          <p className="value small">
            {latestRun
              ? format(new Date(latestRun.created_at), 'MM/dd HH:mm', { locale: ko })
              : '-'}
          </p>
        </div>
      </div>

      <div className="chart-grid">
        {/* 트렌드 차트 */}
        <div className="chart-section">
          <h2>응답시간 트렌드</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis unit="ms" />
              <Tooltip
                formatter={(value) => [`${value}ms`, '응답시간']}
                labelFormatter={(label) => `날짜: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgDuration"
                stroke="#8884d8"
                name="평균"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="maxDuration"
                stroke="#ff7300"
                name="최대"
                strokeWidth={1}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 성공/실패 파이 차트 */}
        <div className="chart-section chart-small">
          <h2>테스트 결과 분포</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* API별 평균 성능 */}
      <div className="chart-section">
        <h2>API별 평균 응답시간</h2>
        <ResponsiveContainer width="100%" height={Math.max(300, avgByApi.length * 35)}>
          <BarChart data={avgByApi} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit="ms" />
            <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value}ms`, '평균 시간']} />
            <Bar dataKey="avg" name="평균 응답시간">
              {avgByApi.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.avg <= 500 ? '#82ca9d' : entry.avg <= 1000 ? '#ffc658' : '#ff6b6b'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// API별 상세 탭 컴포넌트
function ApiDetailTab({
  results,
  apiList,
  selectedApi,
  setSelectedApi,
}: {
  results: PerformanceResult[];
  apiList: string[];
  selectedApi: string;
  setSelectedApi: (api: string) => void;
}) {
  const filteredResults =
    selectedApi === 'all'
      ? results
      : results.filter((r) => r.action_name === selectedApi);

  // API별 통계 계산
  const apiStats = calculateApiStats(results);

  // 선택된 API의 상세 통계
  const selectedApiStats = selectedApi !== 'all'
    ? apiStats.find(s => s.name === selectedApi)
    : null;

  return (
    <>
      {/* API 선택 */}
      <div className="filter-section">
        <label>API 선택:</label>
        <select value={selectedApi} onChange={(e) => setSelectedApi(e.target.value)}>
          {apiList.map((api) => (
            <option key={api} value={api}>
              {api === 'all' ? '전체 API' : api}
            </option>
          ))}
        </select>
      </div>

      {/* 선택된 API 상세 정보 */}
      {selectedApiStats && (
        <div className="api-detail-card">
          <h2>{selectedApiStats.name}</h2>
          <div className="api-stats-grid">
            <div className="stat-item">
              <span className="stat-label">호출 횟수</span>
              <span className="stat-value">{selectedApiStats.count}회</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">평균 응답시간</span>
              <span className="stat-value">{selectedApiStats.avg}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">최소 응답시간</span>
              <span className="stat-value success">{selectedApiStats.min}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">최대 응답시간</span>
              <span className="stat-value warning">{selectedApiStats.max}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">P50 (중앙값)</span>
              <span className="stat-value">{selectedApiStats.p50}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">P95</span>
              <span className="stat-value">{selectedApiStats.p95}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">P99</span>
              <span className="stat-value">{selectedApiStats.p99}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">성공률</span>
              <span className={`stat-value ${selectedApiStats.successRate >= 95 ? 'success' : 'fail'}`}>
                {selectedApiStats.successRate}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* API 통계 테이블 */}
      <div className="table-section">
        <h2>API별 성능 통계</h2>
        <table className="api-stats-table">
          <thead>
            <tr>
              <th>API 이름</th>
              <th>호출 수</th>
              <th>평균</th>
              <th>최소</th>
              <th>최대</th>
              <th>P50</th>
              <th>P95</th>
              <th>P99</th>
              <th>성공률</th>
            </tr>
          </thead>
          <tbody>
            {apiStats.map((stat) => (
              <tr
                key={stat.name}
                className={selectedApi === stat.name ? 'selected' : ''}
                onClick={() => setSelectedApi(stat.name)}
              >
                <td className="api-name">{stat.name}</td>
                <td>{stat.count}</td>
                <td className={getSpeedClass(stat.avg)}>{stat.avg}ms</td>
                <td className="success">{stat.min}ms</td>
                <td className={getSpeedClass(stat.max)}>{stat.max}ms</td>
                <td>{stat.p50}ms</td>
                <td>{stat.p95}ms</td>
                <td>{stat.p99}ms</td>
                <td className={stat.successRate >= 95 ? 'success' : 'fail'}>
                  {stat.successRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 최근 호출 기록 */}
      <div className="table-section">
        <h2>최근 호출 기록 {selectedApi !== 'all' && `- ${selectedApi}`}</h2>
        <table>
          <thead>
            <tr>
              <th>시간</th>
              <th>API</th>
              <th>응답시간</th>
              <th>상태</th>
              <th>브랜치</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.slice(0, 30).map((result) => (
              <tr key={result.id} className={result.status}>
                <td>{format(new Date(result.created_at), 'MM/dd HH:mm:ss', { locale: ko })}</td>
                <td className="api-name">{result.action_name}</td>
                <td className={getSpeedClass(result.duration_ms)}>{result.duration_ms}ms</td>
                <td>
                  <span className={`status-badge ${result.status}`}>
                    {result.status === 'pass' ? '성공' : '실패'}
                  </span>
                </td>
                <td>{result.branch || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// 실행 히스토리 탭 컴포넌트
function HistoryTab({
  testRuns,
  results,
}: {
  testRuns: TestRun[];
  results: PerformanceResult[];
}) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // 선택된 실행의 상세 결과
  const selectedRunResults = selectedRunId
    ? results.filter((r) => r.run_id === selectedRunId)
    : [];

  return (
    <>
      {/* 실행 히스토리 테이블 */}
      <div className="table-section">
        <h2>테스트 실행 히스토리</h2>
        <table>
          <thead>
            <tr>
              <th>실행 시간</th>
              <th>실행 ID</th>
              <th>총 테스트</th>
              <th>성공</th>
              <th>실패</th>
              <th>평균 시간</th>
              <th>브랜치</th>
              <th>트리거</th>
            </tr>
          </thead>
          <tbody>
            {testRuns.map((run) => (
              <tr
                key={run.id}
                className={selectedRunId === run.run_id ? 'selected' : ''}
                onClick={() => setSelectedRunId(run.run_id)}
                style={{ cursor: 'pointer' }}
              >
                <td>{format(new Date(run.created_at), 'MM/dd HH:mm', { locale: ko })}</td>
                <td className="mono">{run.run_id.slice(0, 12)}</td>
                <td>{run.total_tests}</td>
                <td className="success">{run.passed_tests}</td>
                <td className={run.failed_tests > 0 ? 'fail' : ''}>{run.failed_tests}</td>
                <td>{Math.round(run.avg_duration_ms)}ms</td>
                <td>{run.branch || '-'}</td>
                <td>{run.triggered_by || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 선택된 실행의 상세 결과 */}
      {selectedRunId && selectedRunResults.length > 0 && (
        <div className="table-section">
          <h2>실행 상세 - {selectedRunId.slice(0, 12)}</h2>
          <table>
            <thead>
              <tr>
                <th>API</th>
                <th>응답시간</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {selectedRunResults.map((result) => (
                <tr key={result.id} className={result.status}>
                  <td>{result.action_name}</td>
                  <td className={getSpeedClass(result.duration_ms)}>{result.duration_ms}ms</td>
                  <td>
                    <span className={`status-badge ${result.status}`}>
                      {result.status === 'pass' ? '성공' : '실패'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// 유틸리티 함수들
function prepareTrendData(results: PerformanceResult[]) {
  const grouped = new Map<string, number[]>();

  results.forEach((r) => {
    const date = format(new Date(r.created_at), 'MM/dd');
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(r.duration_ms);
  });

  return Array.from(grouped.entries())
    .map(([date, durations]) => ({
      date,
      avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
    }))
    .reverse()
    .slice(-14);
}

function calculateAvgByApi(results: PerformanceResult[]) {
  const grouped = new Map<string, number[]>();

  results.forEach((r) => {
    if (!grouped.has(r.action_name)) {
      grouped.set(r.action_name, []);
    }
    grouped.get(r.action_name)!.push(r.duration_ms);
  });

  return Array.from(grouped.entries())
    .map(([name, durations]) => ({
      name,
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    }))
    .sort((a, b) => b.avg - a.avg);
}

function calculateApiStats(results: PerformanceResult[]) {
  const grouped = new Map<string, PerformanceResult[]>();

  results.forEach((r) => {
    if (!grouped.has(r.action_name)) {
      grouped.set(r.action_name, []);
    }
    grouped.get(r.action_name)!.push(r);
  });

  return Array.from(grouped.entries()).map(([name, items]) => {
    const durations = items.map((i) => i.duration_ms).sort((a, b) => a - b);
    const passCount = items.filter((i) => i.status === 'pass').length;

    return {
      name,
      count: items.length,
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min: durations[0],
      max: durations[durations.length - 1],
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)] || durations[durations.length - 1],
      p99: durations[Math.floor(durations.length * 0.99)] || durations[durations.length - 1],
      successRate: Math.round((passCount / items.length) * 100),
    };
  }).sort((a, b) => b.avg - a.avg);
}

function getSpeedClass(duration: number): string {
  if (duration <= 200) return 'speed-fast';
  if (duration <= 500) return 'speed-normal';
  if (duration <= 1000) return 'speed-slow';
  return 'speed-very-slow';
}

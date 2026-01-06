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
} from 'recharts';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getRecentResults, getTestRuns } from '../lib/supabase';
import type { PerformanceResult, TestRun } from '../lib/supabase';
import './Dashboard.css';

export function Dashboard() {
  const [results, setResults] = useState<PerformanceResult[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [resultsData, runsData] = await Promise.all([
        getRecentResults(200),
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

  // 테스트 이름 목록
  const testNames = ['all', ...new Set(results.map((r) => r.test_name))];

  // 필터링된 결과
  const filteredResults =
    selectedTest === 'all'
      ? results
      : results.filter((r) => r.test_name === selectedTest);

  // 시간별 트렌드 데이터
  const trendData = prepareTrendData(filteredResults);

  // 최근 테스트 실행 요약
  const latestRun = testRuns[0];

  // 테스트별 평균 성능
  const avgByTest = calculateAvgByTest(results);

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

      {/* 필터 */}
      <div className="filter-section">
        <label>테스트 선택:</label>
        <select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)}>
          {testNames.map((name) => (
            <option key={name} value={name}>
              {name === 'all' ? '전체' : name}
            </option>
          ))}
        </select>
      </div>

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
              name="평균 응답시간"
              strokeWidth={2}
              dot={{ fill: '#8884d8' }}
            />
            <Line
              type="monotone"
              dataKey="maxDuration"
              stroke="#ff7300"
              name="최대 응답시간"
              strokeWidth={1}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 테스트별 평균 성능 */}
      <div className="chart-section">
        <h2>테스트별 평균 성능</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={avgByTest} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit="ms" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip formatter={(value) => [`${value}ms`, '평균 시간']} />
            <Bar dataKey="avg" name="평균 응답시간">
              {avgByTest.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.avg <= (entry.threshold || Infinity) ? '#82ca9d' : '#ff6b6b'}
                />
              ))}
            </Bar>
            <Bar dataKey="threshold" name="임계값" fill="#8884d8" opacity={0.3} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 최근 테스트 결과 테이블 */}
      <div className="table-section">
        <h2>최근 테스트 결과</h2>
        <table>
          <thead>
            <tr>
              <th>시간</th>
              <th>테스트</th>
              <th>액션</th>
              <th>응답시간</th>
              <th>임계값</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.slice(0, 20).map((result) => (
              <tr key={result.id} className={result.status}>
                <td>{format(new Date(result.created_at), 'MM/dd HH:mm', { locale: ko })}</td>
                <td>{result.test_name}</td>
                <td>{result.action_name}</td>
                <td>{result.duration_ms}ms</td>
                <td>{result.threshold_ms ? `${result.threshold_ms}ms` : '-'}</td>
                <td>
                  <span className={`status-badge ${result.status}`}>
                    {result.status === 'pass' ? '통과' : result.status === 'fail' ? '실패' : '경고'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 테스트 실행 히스토리 */}
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
            </tr>
          </thead>
          <tbody>
            {testRuns.slice(0, 10).map((run) => (
              <tr key={run.id}>
                <td>{format(new Date(run.created_at), 'MM/dd HH:mm', { locale: ko })}</td>
                <td className="mono">{run.run_id.slice(0, 8)}</td>
                <td>{run.total_tests}</td>
                <td className="success">{run.passed_tests}</td>
                <td className={run.failed_tests > 0 ? 'fail' : ''}>{run.failed_tests}</td>
                <td>{Math.round(run.avg_duration_ms)}ms</td>
                <td>{run.branch || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

// 트렌드 데이터 준비
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
    .slice(-14); // 최근 14일
}

// 테스트별 평균 계산
function calculateAvgByTest(results: PerformanceResult[]) {
  const grouped = new Map<string, { durations: number[]; threshold: number | null }>();

  results.forEach((r) => {
    if (!grouped.has(r.test_name)) {
      grouped.set(r.test_name, { durations: [], threshold: r.threshold_ms });
    }
    grouped.get(r.test_name)!.durations.push(r.duration_ms);
  });

  return Array.from(grouped.entries()).map(([name, data]) => ({
    name,
    avg: Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length),
    threshold: data.threshold,
  }));
}

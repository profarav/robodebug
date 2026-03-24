'use client';
import { useState } from 'react';
import styles from './page.module.css';

const MOCK_CONTEXT = {
  rosVersion: 'ROS 2 Humble',
  nodes: [
    { name: '/apollo/navigation_controller', status: 'active' },
    { name: '/apollo/perception_node', status: 'active' },
    { name: '/apollo/arm_controller', status: 'active' },
    { name: '/apollo/lidar_driver', status: 'dead' },
    { name: '/apollo/imu_node', status: 'slow' },
  ],
  topics: [
    { name: '/cmd_vel', type: 'geometry_msgs/Twist', hasData: true },
    { name: '/odom', type: 'nav_msgs/Odometry', hasData: true },
    { name: '/scan', type: 'sensor_msgs/LaserScan', hasData: false },
    { name: '/joint_states', type: 'sensor_msgs/JointState', hasData: true },
    { name: '/camera/rgb', type: 'sensor_msgs/Image', hasData: true },
  ],
};

const SAMPLE_LOGS = [
  { id: 'e1', level: 'ERROR', msg: "TF lookup failed: /base_link → /map", full: "tf2.LookupException: 'base_link' passed to lookupTransform argument target_frame does not exist." },
  { id: 'w1', level: 'WARN', msg: 'IMU latency 340ms above threshold', full: '[apollo/imu_node] Sensor latency 340ms exceeds threshold of 100ms. Check USB connection or reduce publish rate.' },
  { id: 'e2', level: 'ERROR', msg: 'Costmap update timeout after 5.0s', full: '[nav2_costmap_2d] Costmap update loop missed its desired rate of 5.0Hz. Sensor data timeout exceeded.' },
  { id: 'i1', level: 'INFO', msg: 'Goal received: position (2.4, 1.1, 0.0)', full: '[navigation_controller] New goal received. Planning path to (2.4, 1.1, 0.0).' },
  { id: 'i2', level: 'INFO', msg: 'Navigation stack initialized', full: '[navigation_controller] All systems nominal. Nav stack ready.' },
];

export default function Home() {
  const [selectedLog, setSelectedLog] = useState(SAMPLE_LOGS[0]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [customError, setCustomError] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  async function analyze() {
    setLoading(true);
    setResult(null);
    const errorText = useCustom ? customError : selectedLog.full;
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorText, context: MOCK_CONTEXT }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ error: 'Request failed' });
    }
    setLoading(false);
  }

  const activeNodes = MOCK_CONTEXT.nodes.filter(n => n.status === 'active');
  const deadNodes = MOCK_CONTEXT.nodes.filter(n => n.status === 'dead');
  const slowNodes = MOCK_CONTEXT.nodes.filter(n => n.status === 'slow');
  const noDataTopics = MOCK_CONTEXT.topics.filter(t => !t.hasData);

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>⬡</div>
          <div>
            <div className={styles.logoText}>RoboDebug</div>
            <div className={styles.logoSub}>ROS-aware AI debugging</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.statusBadge}>
            <span className={styles.statusDot} />
            {MOCK_CONTEXT.rosVersion}
          </div>
          <div className={styles.nodeCount}>{activeNodes.length}/{MOCK_CONTEXT.nodes.length} nodes active</div>
        </div>
      </header>

      <div className={styles.main}>
        {/* Left: ROS Context */}
        <div className={styles.sidebar}>
          <section className={styles.section}>
            <div className={styles.sectionTitle}>ROS Nodes</div>
            {MOCK_CONTEXT.nodes.map(n => (
              <div key={n.name} className={styles.rosItem}>
                <span className={`${styles.dot} ${styles[n.status]}`} />
                <span className={styles.nodeName}>{n.name}</span>
                {n.status !== 'active' && <span className={styles.nodeTag}>{n.status.toUpperCase()}</span>}
              </div>
            ))}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>Topics</div>
            {MOCK_CONTEXT.topics.map(t => (
              <div key={t.name} className={styles.rosItem}>
                <span className={`${styles.dot} ${t.hasData ? styles.active : styles.dead}`} />
                <span className={styles.nodeName}>{t.name}</span>
                {!t.hasData && <span className={styles.nodeTag} style={{ color: 'var(--error)' }}>NO DATA</span>}
              </div>
            ))}
          </section>
        </div>

        {/* Center: Log selector + input */}
        <div className={styles.center}>
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Select Log Entry</div>
            <div className={styles.logList}>
              {SAMPLE_LOGS.map(log => (
                <div
                  key={log.id}
                  className={`${styles.logEntry} ${selectedLog.id === log.id ? styles.selected : ''} ${!useCustom && selectedLog.id === log.id ? styles.active : ''}`}
                  onClick={() => { setSelectedLog(log); setUseCustom(false); setResult(null); }}
                >
                  <span className={`${styles.badge} ${styles[`badge_${log.level}`]}`}>{log.level}</span>
                  <span className={styles.logMsg}>{log.msg}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>Or paste your own error</div>
            <textarea
              className={styles.textarea}
              placeholder="Paste any ROS error, stack trace, or log output..."
              value={customError}
              onChange={e => { setCustomError(e.target.value); setUseCustom(true); setResult(null); }}
            />
          </section>

          <div className={styles.analyzeWrap}>
            <div className={styles.selectedPreview}>
              <span className={styles.previewLabel}>Analyzing:</span>
              <span className={styles.previewText}>{useCustom ? customError.slice(0, 80) + (customError.length > 80 ? '...' : '') : selectedLog.msg}</span>
            </div>
            <button className={styles.analyzeBtn} onClick={analyze} disabled={loading}>
              {loading ? <><span className={styles.spinner} /> Analyzing...</> : '⬡ Analyze with RoboDebug'}
            </button>
          </div>
        </div>

        {/* Right: AI Result */}
        <div className={styles.resultPanel}>
          <div className={styles.sectionTitle} style={{ marginBottom: 16 }}>AI Analysis</div>

          {!result && !loading && (
            <div className={styles.idle}>
              <div className={styles.idleIcon}>⬡</div>
              <div className={styles.idleText}>Select a log entry and click<br /><strong>Analyze with RoboDebug</strong></div>
            </div>
          )}

          {loading && (
            <div className={styles.idle}>
              <div className={styles.loadingSpinner} />
              <div className={styles.idleText}>Pulling ROS context and analyzing...</div>
            </div>
          )}

          {result && !result.error && (
            <div className={styles.result}>
              {/* Context pills */}
              <div className={styles.contextRow}>
                <div className={styles.contextLabel}>Injected context</div>
                <div className={styles.pills}>
                  {activeNodes.slice(0, 2).map(n => <span key={n.name} className={`${styles.pill} ${styles.pillNode}`}>{n.name.split('/').pop()}</span>)}
                  {deadNodes.map(n => <span key={n.name} className={`${styles.pill} ${styles.pillDead}`}>{n.name.split('/').pop()} ✗</span>)}
                  {noDataTopics.map(t => <span key={t.name} className={`${styles.pill} ${styles.pillTopic}`}>{t.name} (no data)</span>)}
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.resultSection}>
                <div className={`${styles.resultLabel} ${styles.labelError}`}>⚠ What's happening</div>
                <div className={styles.resultText}>{result.what}</div>
              </div>

              <div className={styles.divider} />

              <div className={styles.resultSection}>
                <div className={`${styles.resultLabel} ${styles.labelWarn}`}>◈ Root cause</div>
                <div className={styles.resultText}>{result.cause}</div>
              </div>

              <div className={styles.divider} />

              <div className={styles.resultSection}>
                <div className={`${styles.resultLabel} ${styles.labelFix}`}>✦ Suggested fix</div>
                <pre className={styles.codeBlock}>{result.fix}</pre>
              </div>

              <div className={styles.confidenceBar}>
                <span className={styles.confLabel}>Confidence</span>
                <div className={styles.confTrack}>
                  <div className={styles.confFill} style={{ width: `${result.confidence}%` }} />
                </div>
                <span className={styles.confPct}>{result.confidence}%</span>
              </div>
            </div>
          )}

          {result?.error && (
            <div className={styles.idle} style={{ color: 'var(--error)' }}>{result.error}</div>
          )}
        </div>
      </div>
    </div>
  );
}

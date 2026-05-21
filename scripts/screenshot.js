const { chromium } = require('/Users/edy/.npm-global/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const OUTDIR = path.resolve(__dirname, '../docs/screenshots');
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

const VIEWPORT = { width: 1600, height: 1000 };
const BASE_URL = 'http://localhost:5173';

async function capture(page, name, opts = {}) {
  const file = path.join(OUTDIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false, ...opts });
  console.log(`✓ ${name}.png`);
}

async function waitForStore(page) {
  for (let i = 0; i < 20; i++) {
    const ready = await page.evaluate(() => typeof window.__workflowStore !== 'undefined');
    if (ready) return true;
    await page.waitForTimeout(300);
  }
  throw new Error('Store not exposed on window');
}

async function setWorkflowState(page, nodes, edges) {
  await page.evaluate((state) => {
    const store = window.__workflowStore;
    store.setState({
      nodes: state.nodes,
      edges: state.edges,
      selectedNodeId: null,
    });
  }, { nodes, edges });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  console.log('Capturing screenshots...\n');

  // ── 1. 首页 — 空画布 ──
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await waitForStore(page);
  await page.waitForTimeout(1200);
  await capture(page, '01-home-empty-canvas');

  // ── 2. 画布上添加工作流节点 ──
  const demoNodes = [
    {
      id: 'ref-1',
      type: 'ad-reference-search',
      position: { x: 80, y: 120 },
      data: { nodeType: 'ad-reference-search', config: { keywords: 'beauty skincare', count: 5, platform: 'all' }, status: 'idle' }
    },
    {
      id: 'style-1',
      type: 'image-generator',
      position: { x: 420, y: 60 },
      data: { nodeType: 'image-generator', config: { prompt: 'Cyberpunk style ad banner', aspectRatio: '16:9', count: 4 }, status: 'idle' }
    },
    {
      id: 'face-1',
      type: 'image-generator',
      position: { x: 420, y: 260 },
      data: { nodeType: 'image-generator', config: { prompt: 'Face swap with model', aspectRatio: '1:1', count: 2 }, status: 'idle' }
    },
    {
      id: 'product-1',
      type: 'image-generator',
      position: { x: 760, y: 160 },
      data: { nodeType: 'image-generator', config: { prompt: 'Product replacement on clean background', aspectRatio: '1:1', count: 3 }, status: 'idle' }
    },
    {
      id: 'layout-1',
      type: 'text-generator',
      position: { x: 1100, y: 160 },
      data: { nodeType: 'text-generator', config: { prompt: 'Generate ad copy for final export', style: 'marketing', count: 3 }, status: 'idle' }
    },
  ];

  const demoEdges = [
    { id: 'e1', source: 'ref-1', target: 'style-1', animated: true },
    { id: 'e2', source: 'ref-1', target: 'face-1', animated: true },
    { id: 'e3', source: 'style-1', target: 'product-1', animated: true },
    { id: 'e4', source: 'face-1', target: 'product-1', animated: true },
    { id: 'e5', source: 'product-1', target: 'layout-1', animated: true },
  ];

  await setWorkflowState(page, demoNodes, demoEdges);
  await page.waitForTimeout(1000);
  await capture(page, '02-workflow-with-nodes');

  // ── 3. 节点被选中（显示状态） ──
  await page.evaluate(() => {
    window.__workflowStore.setState({ selectedNodeId: 'product-1' });
  });
  await page.waitForTimeout(600);
  await capture(page, '03-node-selected');

  // ── 4. Agent 面板有对话消息 ──
  await page.evaluate(() => {
    window.__workflowStore.setState({ selectedNodeId: null });
  });

  // 在 AgentPanel 中注入消息（通过直接操作 React state 比较麻烦，
  // 改为通过页面交互：先点击一个 skill，但这样需要等待 API 响应。
  // 更简单：直接修改 DOM 或截图 skills 状态 + 模拟发送后的状态）

  // 先截图 skills 状态（已经是默认状态）
  // 然后发送一条消息来触发对话状态
  const agentInput = await page.$('input[placeholder*="描述你的需求"]');
  if (agentInput) {
    await agentInput.click();
    await agentInput.fill('帮我生成一组防晒霜的电商广告图');
    await agentInput.press('Enter');
    await page.waitForTimeout(4000); // 等待 API 响应
  }
  await capture(page, '04-agent-chat');

  // ── 5. 执行监控状态（模拟运行中） ──
  await page.evaluate(() => {
    if (window.__executionStore) {
      window.__executionStore.setState({
        isRunning: true,
        runId: 'demo-run-001',
        currentWave: 1,
        totalWaves: 4,
        nodeStatuses: {
          'ref-1': 'completed',
          'style-1': 'running',
          'face-1': 'completed',
          'product-1': 'idle',
          'layout-1': 'idle',
        },
        batchProgress: { completed: 2, total: 10 },
        errors: [],
      });
    }
  });
  await page.waitForTimeout(600);
  await capture(page, '05-execution-running');

  // ── 6. 执行完成状态 ──
  await page.evaluate(() => {
    if (window.__executionStore) {
      window.__executionStore.setState({
        isRunning: false,
        currentWave: 3,
        totalWaves: 4,
        nodeStatuses: {
          'ref-1': 'completed',
          'style-1': 'completed',
          'face-1': 'completed',
          'product-1': 'completed',
          'layout-1': 'completed',
        },
        batchProgress: { completed: 10, total: 10 },
        errors: [],
      });
    }
  });
  await page.waitForTimeout(600);
  await capture(page, '06-execution-complete');

  // ── 7. 批量上传对话框 ──
  await page.evaluate(() => {
    if (window.__executionStore) {
      window.__executionStore.setState({
        isRunning: false,
        nodeStatuses: {},
      });
    }
    window.__workflowStore.setState({ showBatchUpload: true });
  });
  await page.waitForTimeout(600);
  await capture(page, '07-batch-upload');

  await browser.close();
  console.log(`\nAll screenshots saved to: ${OUTDIR}`);
})();

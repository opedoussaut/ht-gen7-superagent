import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircuitBoard,
  ClipboardCheck,
  Database,
  FileInput,
  FileSearch,
  GitBranch,
  HardDrive,
  Layers3,
  LockKeyhole,
  PackageCheck,
  Route,
  SearchCheck,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react';
import { EXAMPLE_INTENTS, ORCHESTRATION_PATTERNS, detectPattern } from './data.js';

const nodeTypes = {
  architecture: ArchitectureNode,
  orchestrationBand: OrchestrationBand,
};

const KIND_META = {
  intent: { label: 'Intent', Icon: FileInput },
  data: { label: 'Data', Icon: Database },
  memory: { label: 'Memory / RAG', Icon: HardDrive },
  rules: { label: 'Rules', Icon: ClipboardCheck },
  super: { label: 'Super Agent', Icon: BrainCircuit },
  agent: { label: 'Specialized Agent', Icon: Bot },
  tool: { label: 'Tool / Service', Icon: ServerCog },
  llm: { label: 'LLM / Reasoning', Icon: CircuitBoard },
  harness: { label: 'Harness', Icon: ShieldCheck },
  outcome: { label: 'Outcome', Icon: PackageCheck },
};

const PATTERN_STYLES = {
  token: { accent: '#76b900', title: 'DSX AI Factory decision package' },
  requirements: { accent: '#20d3ff', title: 'Structured DSX requirements package' },
  simulation: { accent: '#f5a400', title: 'Simulation evidence package' },
  openusd: { accent: '#a855f7', title: 'Validated OpenUSD / SimReady package' },
  operations: { accent: '#ff5a4f', title: 'Approved mitigation plan' },
  interconnect: { accent: '#38bdf8', title: 'Interconnect readiness report' },
  robot: { accent: '#9be11f', title: 'Robot service work package' },
};

function ArchitectureNode({ data, selected }) {
  const meta = KIND_META[data.kind] ?? KIND_META.agent;
  const Icon = data.icon ?? meta.Icon;

  return (
    <div className={`arch-node arch-node--${data.kind} ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="left" className="handle" />
      <Handle type="target" position={Position.Top} id="top" className="handle" />
      <div className="arch-node__icon" aria-hidden="true">
        <Icon size={24} strokeWidth={2.35} />
      </div>
      <div className="arch-node__body">
        <div className="arch-node__kind">{meta.label}</div>
        <div className="arch-node__title">{data.title}</div>
        <div className="arch-node__subtitle">{data.subtitle}</div>
      </div>
      <Handle type="source" position={Position.Right} id="right" className="handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="handle" />
    </div>
  );
}

function OrchestrationBand({ data }) {
  return (
    <div className="orchestration-band">
      <div className="orchestration-band__bar" style={{ '--band-accent': data.accent }}>
        {data.title}
      </div>
      <div className="orchestration-band__caption">Agentic orchestration layer</div>
    </div>
  );
}

function iconForAgent(agentName) {
  const name = agentName.toLowerCase();
  if (name.includes('power') || name.includes('cooling') || name.includes('thermal')) return Zap;
  if (name.includes('network') || name.includes('interconnect')) return GitBranch;
  if (name.includes('simulation') || name.includes('physics')) return CircuitBoard;
  if (name.includes('requirements') || name.includes('requirement')) return FileSearch;
  if (name.includes('route') || name.includes('cabling')) return Route;
  if (name.includes('maintenance') || name.includes('procedure') || name.includes('parts')) return LockKeyhole;
  if (name.includes('dsx') || name.includes('openusd') || name.includes('simready')) return Layers3;
  if (name.includes('evidence')) return SearchCheck;
  return Bot;
}

function summarize(items, max = 3) {
  if (!items?.length) return 'Not selected';
  return items.slice(0, max).join(' · ') + (items.length > max ? ' · …' : '');
}

function memoryFor(pattern) {
  const common = ['Lessons learned memory', 'similar configuration retrieval'];
  if (pattern.short === 'Operations') return ['incident history', 'operating baseline', 'maintenance memory'];
  if (pattern.short === 'OpenUSD') return ['asset provenance memory', 'supplier exchange history', 'interface history'];
  if (pattern.short === 'Simulation') return ['model/run history', 'simulation assumptions', 'result lineage'];
  if (pattern.short === 'Requirements') return ['requirements memory', 'decision history', 'DSX mapping history'];
  return common;
}

function rulesFor(pattern) {
  const base = ['DSX rules', 'approval policy'];
  if (pattern.short === 'Interconnect') return ['DSX rules', 'OCP / cabling rules', 'bend-radius constraints'];
  if (pattern.short === 'Simulation') return ['simulation validity rules', 'model-input freeze', 'no invented result gate'];
  if (pattern.short === 'Operations') return ['operating envelope rules', 'maintenance policy', 'human approval'];
  if (pattern.short === 'OpenUSD') return ['SimReady metadata rules', 'supplier permission rules', 'asset provenance'];
  return [...base, 'deviation policy'];
}

function llmsFor(pattern) {
  if (pattern.short === 'Simulation') return ['NIM-hosted planning LLM', 'evidence summarization model', 'PhysicsNeMo candidate'];
  if (pattern.short === 'Operations') return ['NIM incident summarizer', 'domain reasoning model', 'report generation model'];
  if (pattern.short === 'Robot Twin') return ['NIM robot/domain LLM', 'procedure reasoning model', 'safety-check model'];
  if (pattern.short === 'OpenUSD') return ['NIM asset-request model', 'metadata validation summarizer'];
  return ['NIM-hosted reasoning model', 'structured JSON model', 'report generation model'];
}

function edge(id, source, target, label, options = {}) {
  const animated = options.animated ?? false;
  const kind = options.kind ?? 'default';
  const color = kind === 'green' ? '#76b900' : kind === 'orange' ? '#f5a400' : '#65727d';

  return {
    id,
    source,
    target,
    sourceHandle: options.sourceHandle,
    targetHandle: options.targetHandle,
    label,
    animated,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color },
    style: { stroke: color, strokeWidth: animated ? 2.5 : 1.75 },
    labelStyle: { fill: '#aab5bf', fontSize: 10.5, fontWeight: 800 },
    labelBgStyle: { fill: '#071018', fillOpacity: 0.9 },
    labelBgPadding: [6, 3],
  };
}

function node(id, kind, x, y, width, height, title, subtitle, details, extra = {}) {
  return {
    id,
    type: 'architecture',
    data: { kind, title, subtitle, details, ...extra.data },
    position: { x, y },
    width,
    height,
    style: { width, height },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    zIndex: extra.zIndex ?? 5,
  };
}

function buildGraph(pattern, resolvedKey) {
  const visibleAgents = pattern.agents.slice(0, 5);
  const style = PATTERN_STYLES[resolvedKey] ?? PATTERN_STYLES.token;

  const bandNode = {
    id: 'orchestration-band',
    type: 'orchestrationBand',
    data: {
      title: `${pattern.label.toUpperCase()} · AGENTIC ORCHESTRATION`,
      accent: style.accent,
    },
    position: { x: 20, y: 255 },
    width: 1480,
    height: 430,
    style: { width: 1480, height: 430 },
    draggable: false,
    selectable: false,
    zIndex: 0,
  };

  const agentX = [70, 360, 650, 940, 1230];
  const agentNodes = visibleAgents.map((agent, index) => node(
    `agent-${index}`,
    'agent',
    agentX[index],
    350,
    240,
    112,
    agent.name,
    agent.role,
    `${agent.role}\n\nInput: ${agent.input}\n\nOutput: ${agent.output}\n\nNVIDIA call: ${agent.nvidia}\n\nEvidence returned: ${agent.evidence}`,
    { data: { icon: iconForAgent(agent.name) } },
  ));

  const nodes = [
    bandNode,
    node(
      'intent',
      'intent',
      60,
      42,
      300,
      126,
      pattern.intentLabel,
      'Natural-language mission request',
      'One business or engineering intent starts the whole flow. The orchestration pattern is inferred from this intent unless manually selected.',
    ),
    node(
      'super',
      'super',
      605,
      36,
      320,
      138,
      'AI Factory Super Agent',
      'Planning and orchestration',
      'The Super Agent does not do all expert work itself. It decomposes the mission, selects specialized agents, calls NVIDIA tools/LLMs, applies rules and routes the result through the harness.',
      { data: { icon: Sparkles }, zIndex: 8 },
    ),
    node(
      'outcome',
      'outcome',
      1180,
      42,
      330,
      126,
      pattern.outcomeTitle,
      'Governed outcome package',
      pattern.outcome,
      { data: { icon: CheckCircle2 }, zIndex: 8 },
    ),
    ...agentNodes,
    node(
      'data',
      'data',
      80,
      540,
      205,
      112,
      'Data',
      summarize(pattern.context, 4),
      `Enterprise input sources used to ground the mission:\n${pattern.context.map((item) => `• ${item}`).join('\n')}`,
    ),
    node(
      'memory',
      'memory',
      310,
      540,
      205,
      112,
      'Memory / RAG',
      summarize(memoryFor(pattern), 3),
      `Reusable knowledge and retrieval memory:\n${memoryFor(pattern).map((item) => `• ${item}`).join('\n')}`,
      { data: { icon: HardDrive } },
    ),
    node(
      'rules',
      'rules',
      540,
      540,
      205,
      112,
      'Rules',
      summarize(rulesFor(pattern), 3),
      `Explicit constraints and decision rules:\n${rulesFor(pattern).map((item) => `• ${item}`).join('\n')}`,
      { data: { icon: ClipboardCheck } },
    ),
    node(
      'tools',
      'tool',
      770,
      540,
      205,
      112,
      'Tools / Services',
      summarize(pattern.tools.filter((tool) => !/NIM|LLM|NeMo/i.test(tool)), 3),
      `Deterministic or domain services selected for this orchestration:\n${pattern.tools.map((tool) => `• ${tool}`).join('\n')}`,
    ),
    node(
      'llms',
      'llm',
      1000,
      540,
      205,
      112,
      'LLMs',
      summarize(llmsFor(pattern), 2),
      `Reasoning and generation models used by the agents:\n${llmsFor(pattern).map((item) => `• ${item}`).join('\n')}`,
    ),
    node(
      'harness',
      'harness',
      1230,
      540,
      205,
      112,
      'Harness',
      'evidence · schema · approval · audit',
      `Mandatory controls:\n${pattern.gates.map((gate) => `• ${gate}`).join('\n')}`,
    ),
  ];

  const edges = [
    edge('intent-super', 'intent', 'super', 'mission', { sourceHandle: 'right', targetHandle: 'left', animated: true, kind: 'green' }),
    edge('super-outcome', 'super', 'outcome', 'governed package', { sourceHandle: 'right', targetHandle: 'left', animated: true, kind: 'green' }),
    edge('super-band', 'super', 'agent-2', 'plan / delegate', { sourceHandle: 'bottom', targetHandle: 'top', animated: true, kind: 'green' }),
    edge('data-memory', 'data', 'memory', 'index', { sourceHandle: 'right', targetHandle: 'left' }),
    edge('memory-rules', 'memory', 'rules', 'retrieve', { sourceHandle: 'right', targetHandle: 'left' }),
    edge('rules-tools', 'rules', 'tools', 'constrain', { sourceHandle: 'right', targetHandle: 'left' }),
    edge('tools-llms', 'tools', 'llms', 'call', { sourceHandle: 'right', targetHandle: 'left', kind: 'orange' }),
    edge('llms-harness', 'llms', 'harness', 'validate', { sourceHandle: 'right', targetHandle: 'left', kind: 'orange' }),
    edge('harness-outcome', 'harness', 'outcome', 'evidence-backed', { sourceHandle: 'right', targetHandle: 'bottom', animated: true, kind: 'green' }),
  ];

  visibleAgents.forEach((_, index) => {
    edges.push(edge(`super-agent-${index}`, 'super', `agent-${index}`, 'delegate', {
      sourceHandle: 'bottom',
      targetHandle: 'top',
      animated: index === 2,
      kind: 'green',
    }));
    edges.push(edge(`agent-harness-${index}`, `agent-${index}`, 'harness', 'evidence', {
      sourceHandle: 'bottom',
      targetHandle: 'top',
    }));
  });

  return { nodes, edges };
}

function ArchitectureFlow({ pattern, resolvedKey, refreshKey, onSelectNode }) {
  const reactFlow = useReactFlow();
  const graph = useMemo(() => buildGraph(pattern, resolvedKey), [pattern, resolvedKey]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  const fit = useCallback((duration = 650) => {
    requestAnimationFrame(() => {
      reactFlow.fitView({ padding: 0.12, duration, includeHiddenNodes: false, minZoom: 0.2, maxZoom: 1.4 });
    });
  }, [reactFlow]);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
    const t = window.setTimeout(() => fit(700), 80);
    return () => window.clearTimeout(t);
  }, [graph, fit, setEdges, setNodes, refreshKey]);

  useEffect(() => {
    const handleResize = () => fit(250);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fit]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, selected) => onSelectNode(selected.data)}
      onInit={() => fit(500)}
      fitView
      fitViewOptions={{ padding: 0.12, minZoom: 0.2, maxZoom: 1.4 }}
      minZoom={0.2}
      maxZoom={1.8}
      snapToGrid
      snapGrid={[12, 12]}
      proOptions={{ hideAttribution: true }}
      className="architecture-flow"
    >
      <Background color="#17212a" gap={30} size={1} />
      <Controls className="rf-controls" showInteractive={false} />
      <Panel position="top-left" className="diagram-panel">
        <button onClick={() => fit()} type="button">Fit view</button>
        <span>One intent → one Super Agent → one outcome · details in the side panel</span>
      </Panel>
    </ReactFlow>
  );
}

function nodeColor(kind) {
  return {
    intent: '#4c78ff',
    data: '#e67e22',
    memory: '#60707d',
    rules: '#f5a400',
    super: '#76b900',
    agent: '#ff5a4f',
    tool: '#f5a400',
    llm: '#a855f7',
    rag: '#60707d',
    harness: '#f5a400',
    outcome: '#76b900',
  }[kind] ?? '#60707d';
}

function AppShell() {
  const [intent, setIntent] = useState(EXAMPLE_INTENTS[0]);
  const [patternKey, setPatternKey] = useState('auto');
  const [selectedNode, setSelectedNode] = useState(null);
  const [toast, setToast] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const resolvedKey = patternKey === 'auto' ? detectPattern(intent) : patternKey;
  const pattern = ORCHESTRATION_PATTERNS[resolvedKey];

  useEffect(() => setSelectedNode(null), [resolvedKey]);

  const currentJson = useMemo(() => ({
    intent,
    overallContext: 'AI Factory Super Agent',
    orchestrationPattern: resolvedKey,
    topFlow: ['Intent', 'AI Factory Super Agent', 'Governed Outcome'],
    orchestrationBand: ['Specialized Agents', 'Data', 'Memory / RAG', 'Rules', 'Tools / Services', 'LLMs', 'Harness'],
    ...pattern,
  }), [intent, pattern, resolvedKey]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 1400);
  }

  async function copyJson() {
    const text = JSON.stringify(currentJson, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      showToast('JSON copied');
    } catch {
      showToast('Clipboard unavailable');
    }
  }

  function useExample() {
    setPatternKey('auto');
    setIntent(EXAMPLE_INTENTS[Math.floor(Math.random() * EXAMPLE_INTENTS.length)]);
    setRefreshKey((value) => value + 1);
    showToast('Example loaded');
  }

  function recompute() {
    setRefreshKey((value) => value + 1);
    showToast('Orchestration recomputed');
  }

  return (
    <main className="app">
      <section className="hero-grid">
        <div className="card hero-card">
          <div className="eyebrow"><Sparkles size={15} /> Executive architecture mockup</div>
          <h1>AI Factory Super Agent</h1>
          <p className="lead">One intent, one Super Agent, one governed outcome — with the orchestration layer made explicit.</p>
          <p className="note-line"><strong>Orchestration pattern</strong> is not the overall context. The overall context is always the AI Factory Super Agent. The pattern is the mission type inferred from the intent.</p>
          <div className="controls-grid">
            <label className="field field--intent">
              <span>Intent</span>
              <textarea value={intent} onChange={(event) => setIntent(event.target.value)} />
            </label>
            <label className="field">
              <span>Orchestration pattern</span>
              <select value={patternKey} onChange={(event) => setPatternKey(event.target.value)}>
                <option value="auto">Auto-detect from intent</option>
                {Object.entries(ORCHESTRATION_PATTERNS).map(([key, value]) => (
                  <option value={key} key={key}>{value.label}</option>
                ))}
              </select>
            </label>
            <button type="button" className="primary" onClick={recompute}>Recompute</button>
            <button type="button" className="secondary" onClick={useExample}>Example</button>
            <button type="button" className="secondary" onClick={copyJson}>Copy JSON</button>
          </div>
        </div>

        <div className="card summary-card">
          <h2>Selected orchestration</h2>
          <p>{pattern.summary}</p>
          <div className="metric-grid">
            <div><span>Pattern</span><strong>{pattern.short}</strong></div>
            <div><span>Agents</span><strong>{pattern.agents.length}</strong></div>
            <div><span>NVIDIA calls</span><strong>{pattern.tools.length}</strong></div>
            <div><span>Outcome</span><strong>{pattern.outcomeKind}</strong></div>
          </div>
          <div className="legend">
            {Object.entries(KIND_META).map(([kind, meta]) => (
              <span key={kind}><i style={{ background: nodeColor(kind) }} /> {meta.label}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="card diagram-card">
          <div className="diagram-header">
            <div>
              <h2>{pattern.label}</h2>
              <p>Intent → Super Agent → Outcome at the top. Below: Data, Memory/RAG, Rules, Agents, Tools, LLMs and Harness.</p>
            </div>
            <span className="active-badge">{pattern.short}</span>
          </div>
          <div className="flow-wrap">
            <ArchitectureFlow pattern={pattern} resolvedKey={resolvedKey} refreshKey={refreshKey} onSelectNode={setSelectedNode} />
          </div>
        </div>

        <aside className="side-panel">
          <section className="card side-card outcome-card">
            <h3>Outcome of this mission</h3>
            <p>{pattern.outcome}</p>
            <div className="pill-row">
              {pattern.pills.map((pill) => <span key={pill}>{pill}</span>)}
            </div>
          </section>

          <section className="card side-card selected-card">
            <h3>{selectedNode?.title ?? 'Selected block'}</h3>
            <p>{selectedNode?.details ?? 'Click a block in the diagram to inspect its role. The diagram stays clean; detailed role, input, output, NVIDIA call and evidence live here.'}</p>
          </section>

          <section className="card side-card">
            <h3>Specialized agents and NVIDIA calls</h3>
            <div className="agent-list">
              {pattern.agents.map((agent) => (
                <article key={agent.name}>
                  <strong>{agent.name}</strong>
                  <span>{agent.role}</span>
                  <em>{agent.nvidia}</em>
                </article>
              ))}
            </div>
          </section>

          <section className="card side-card two-col">
            <div>
              <h3>Work packages</h3>
              <ol>{pattern.work.map((item) => <li key={item}>{item}</li>)}</ol>
            </div>
            <div>
              <h3>Harness gates</h3>
              <ol>{pattern.gates.map((item) => <li key={item}>{item}</li>)}</ol>
            </div>
          </section>
        </aside>
      </section>

      <section className="card matrix-card">
        <h2>Outcome matrix for all orchestration patterns</h2>
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Primary outcome</th>
              <th>Specialized agents</th>
              <th>NVIDIA-centered calls</th>
              <th>Best use</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ORCHESTRATION_PATTERNS).map(([key, value]) => (
              <tr key={key} className={key === resolvedKey ? 'active-row' : ''}>
                <td><strong>{value.label}</strong></td>
                <td>{value.outcome}</td>
                <td>{value.agents.slice(0, 3).map((a) => a.name).join(', ')}{value.agents.length > 3 ? ', …' : ''}</td>
                <td>{value.tools.slice(0, 4).join(', ')}{value.tools.length > 4 ? ', …' : ''}</td>
                <td>{value.best}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppShell />
    </ReactFlowProvider>
  );
}

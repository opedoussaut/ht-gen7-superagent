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
  Database,
  FileSearch,
  Fingerprint,
  HardDrive,
  Network,
  PackageCheck,
  SearchCheck,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { EXAMPLE_INTENTS, ORCHESTRATION_PATTERNS, detectPattern } from './data.js';

const KIND_META = {
  intent: { label: 'Intent', Icon: Fingerprint, dot: '#4c78ff' },
  data: { label: 'Data', Icon: Database, dot: '#e67e22' },
  memory: { label: 'Memory / RAG', Icon: HardDrive, dot: '#60707d' },
  rules: { label: 'Rules', Icon: ShieldCheck, dot: '#f5a400' },
  super: { label: 'Super Agent', Icon: Sparkles, dot: '#76b900' },
  agent: { label: 'Specialized Agent', Icon: Bot, dot: '#ff5a4f' },
  tool: { label: 'Tools / Services', Icon: Wrench, dot: '#f5a400' },
  llm: { label: 'LLMs', Icon: BrainCircuit, dot: '#9b6cff' },
  harness: { label: 'Harness', Icon: CheckCircle2, dot: '#f5a400' },
  outcome: { label: 'Outcome', Icon: PackageCheck, dot: '#76b900' },
};

function ArchitectureNode({ data, selected }) {
  const meta = KIND_META[data.kind] ?? KIND_META.agent;
  const Icon = data.icon ?? meta.Icon;

  return (
    <div className={`arch-node arch-node--${data.kind} ${selected ? 'is-selected' : ''}`}>
      <Handle id="left" type="target" position={Position.Left} className="handle" />
      <Handle id="top" type="target" position={Position.Top} className="handle" />
      <div className="arch-node__icon" aria-hidden="true">
        <Icon size={24} strokeWidth={2.4} />
      </div>
      <div className="arch-node__body">
        <div className="arch-node__kind">{meta.label}</div>
        <div className="arch-node__title">{data.title}</div>
        <div className="arch-node__subtitle">{data.subtitle}</div>
      </div>
      <Handle id="right" type="source" position={Position.Right} className="handle" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="handle" />
    </div>
  );
}

function OrchestrationBandNode({ data }) {
  return (
    <div className="orchestration-band">
      <div className="orchestration-band__bar">{data.title}</div>
      <div className="orchestration-band__caption">Agentic orchestration layer</div>
    </div>
  );
}

function CaptionNode({ data }) {
  return <div className="caption-node">{data.title}</div>;
}

const nodeTypes = {
  architecture: ArchitectureNode,
  orchestrationBand: OrchestrationBandNode,
  caption: CaptionNode,
};

function iconForAgent(agentName) {
  const name = agentName.toLowerCase();
  if (name.includes('power') || name.includes('cooling') || name.includes('thermal')) return Zap;
  if (name.includes('network') || name.includes('interconnect')) return Network;
  if (name.includes('simulation') || name.includes('physics')) return SlidersHorizontal;
  if (name.includes('requirements') || name.includes('requirement')) return FileSearch;
  if (name.includes('maintenance') || name.includes('procedure') || name.includes('parts')) return Wrench;
  if (name.includes('evidence')) return SearchCheck;
  return Bot;
}

function visibleAgentName(name) {
  return name
    .replace('Requirement Extraction Agent', 'Requirement Extract')
    .replace('Requirements Agent', 'Requirements')
    .replace('Simulation Planner Agent', 'Simulation Planner')
    .replace('Power Simulation Agent', 'Power Simulation')
    .replace('Cooling / Thermal Agent', 'Cooling / Thermal')
    .replace('Interface Compatibility Agent', 'Interface Check')
    .replace('BOM / Lead-Time Agent', 'BOM / Lead Time')
    .replace('Compute / Network Agent', 'Compute / Network')
    .replace('Workload Impact Agent', 'Workload Impact')
    .replace('Cooling Envelope Agent', 'Cooling Envelope')
    .replace('Safety Gate Agent', 'Safety Gate')
    .replace('Robot Diagnostic Agent', 'Robot Diagnostic')
    .replace('OpenUSD Asset Agent', 'OpenUSD Asset')
    .replace('SimReady Metadata Agent', 'SimReady Metadata')
    .replace('Supplier A2A Agent', 'Supplier A2A')
    .replace(/ Agent$/, '');
}

function shortList(items, max = 3) {
  if (!items?.length) return 'not defined';
  return items.slice(0, max).join(' · ') + (items.length > max ? ' · …' : '');
}

function edge(id, source, target, options = {}) {
  const {
    label = '',
    animated = false,
    sourceHandle = 'right',
    targetHandle = 'left',
    color = animated ? '#76b900' : '#66727d',
  } = options;

  return {
    id,
    source,
    target,
    label,
    animated,
    sourceHandle,
    targetHandle,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color },
    style: { stroke: color, strokeWidth: animated ? 2.7 : 1.8 },
    labelStyle: { fill: '#edf6ff', fontSize: 10.5, fontWeight: 900 },
    labelBgStyle: { fill: '#071018', fillOpacity: 0.96 },
    labelBgPadding: [7, 4],
    labelShowBg: Boolean(label),
    zIndex: animated ? 5 : 3,
  };
}

function makeNode(id, kind, title, subtitle, details, x, y, opts = {}) {
  const size = opts.size ?? sizeForKind(kind);
  return {
    id,
    type: opts.type ?? 'architecture',
    data: { kind, title, subtitle, details, icon: opts.icon },
    position: { x, y },
    width: size.width,
    height: size.height,
    style: { width: size.width, height: size.height, zIndex: opts.zIndex ?? 2 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: opts.draggable ?? true,
    selectable: opts.selectable ?? true,
    focusable: opts.focusable ?? true,
  };
}

function buildGraph(pattern) {
  const visibleAgents = pattern.agents.slice(0, 5);
  const agentX = [20, 342, 664, 986, 1308];
  const supportX = [20, 300, 580, 860, 1140, 1420];

  const nodes = [
    {
      id: 'orchestration-band',
      type: 'orchestrationBand',
      data: { title: `${pattern.label} · Agentic Orchestration` },
      position: { x: -70, y: 300 },
      draggable: false,
      selectable: false,
      focusable: false,
      style: { width: 1830, height: 610, zIndex: 0 },
    },
    {
      id: 'delegate-caption',
      type: 'caption',
      data: { title: 'delegates to specialized agents' },
      position: { x: 710, y: 252 },
      draggable: false,
      selectable: false,
      focusable: false,
      style: { width: 270, height: 32, zIndex: 6 },
    },
    makeNode(
      'intent',
      'intent',
      pattern.intentLabel,
      'Natural-language mission request',
      'One intent starts the process. The Super Agent interprets it and selects the orchestration pattern, data, agents, tools, LLMs and harness controls.',
      20,
      35,
      { zIndex: 4 },
    ),
    makeNode(
      'super',
      'super',
      'AI Factory Super Agent',
      'Planning and orchestration',
      'The single mission orchestrator. It decomposes the intent, selects specialized agents, calls NVIDIA tools and LLM services, checks rules, and assembles the governed outcome package.',
      690,
      25,
      { icon: Sparkles, zIndex: 4 },
    ),
    makeNode(
      'outcome',
      'outcome',
      pattern.outcomeTitle,
      'Governed outcome package',
      pattern.outcome,
      1360,
      35,
      { icon: CheckCircle2, zIndex: 4 },
    ),
    ...visibleAgents.map((agent, index) =>
      makeNode(
        `agent-${index}`,
        'agent',
        visibleAgentName(agent.name),
        agent.role,
        `${agent.role}\n\nInput: ${agent.input}\n\nOutput: ${agent.output}\n\nNVIDIA call: ${agent.nvidia}\n\nEvidence returned: ${agent.evidence}`,
        agentX[index],
        440,
        { icon: iconForAgent(agent.name) },
      ),
    ),
    makeNode(
      'data',
      'data',
      'Data',
      shortList(pattern.context, 3),
      `Controlled enterprise/context data used to ground the mission:\n${pattern.context.map((item) => `• ${item}`).join('\n')}`,
      supportX[0],
      705,
    ),
    makeNode(
      'memory',
      'memory',
      'Memory / RAG',
      'prior cases · lessons · retrieval',
      'Long-lived reusable knowledge and retrieval layer: previous AI Factory records, lessons learned, indexed DSX content, similarity search and evidence reranking.',
      supportX[1],
      705,
    ),
    makeNode(
      'rules',
      'rules',
      'Rules',
      'DSX · OCP · deviations',
      'Explicit rules and constraints: DSX baseline logic, OCP or domain best practices, deviation policies and approval requirements.',
      supportX[2],
      705,
    ),
    makeNode(
      'tools',
      'tool',
      'Tools / Services',
      shortList(pattern.tools, 3),
      `Deterministic services, engineering tools or NVIDIA platform calls selected for this mission:\n${pattern.tools.map((tool) => `• ${tool}`).join('\n')}`,
      supportX[3],
      705,
    ),
    makeNode(
      'llms',
      'llm',
      'LLMs',
      'NIM reasoning · report generation',
      'Reasoning and generation models called by the specialized agents, typically exposed through NVIDIA NIM-hosted services or equivalent controlled endpoints.',
      supportX[4],
      705,
    ),
    makeNode(
      'harness',
      'harness',
      'Harness',
      'schema · evidence · approvals',
      `Mandatory controls for this mission:\n${pattern.gates.map((gate) => `• ${gate}`).join('\n')}`,
      supportX[5],
      705,
    ),
  ];

  const edges = [
    edge('intent-super', 'intent', 'super', { label: 'mission', animated: true }),
    edge('super-outcome', 'super', 'outcome', { label: 'governed package', animated: true }),
    edge('data-memory', 'data', 'memory', { label: 'index', color: '#f5a400' }),
    edge('memory-rules', 'memory', 'rules', { label: 'retrieve' }),
    edge('rules-tools', 'rules', 'tools', { label: 'constrain', color: '#f5a400' }),
    edge('tools-llms', 'tools', 'llms', { label: 'call', color: '#f5a400' }),
    edge('llms-harness', 'llms', 'harness', { label: 'validate' }),
    edge('harness-outcome', 'harness', 'outcome', {
      animated: true,
      sourceHandle: 'right',
      targetHandle: 'bottom',
      label: 'approve',
    }),
  ];

  visibleAgents.forEach((_, index) => {
    edges.push(
      edge(`super-agent-${index}`, 'super', `agent-${index}`, {
        animated: true,
        sourceHandle: 'bottom',
        targetHandle: 'top',
      }),
    );
  });

  edges.push(
    edge('agent-0-data', 'agent-0', 'data', { sourceHandle: 'bottom', targetHandle: 'top' }),
    edge('agent-1-memory', 'agent-1', 'memory', { sourceHandle: 'bottom', targetHandle: 'top' }),
    edge('agent-2-rules', 'agent-2', 'rules', { sourceHandle: 'bottom', targetHandle: 'top' }),
    edge('agent-3-tools', 'agent-3', 'tools', { sourceHandle: 'bottom', targetHandle: 'top' }),
    edge('agent-4-llms', 'agent-4', 'llms', { sourceHandle: 'bottom', targetHandle: 'top' }),
    edge('agent-4-harness', 'agent-4', 'harness', { sourceHandle: 'bottom', targetHandle: 'top' }),
  );

  return { nodes, edges };
}

function sizeForKind(kind) {
  if (kind === 'super' || kind === 'outcome') return { width: 360, height: 130 };
  if (kind === 'intent') return { width: 340, height: 118 };
  if (kind === 'agent') return { width: 292, height: 124 };
  if (kind === 'data' || kind === 'memory' || kind === 'rules' || kind === 'tool' || kind === 'llm' || kind === 'harness') {
    return { width: 250, height: 118 };
  }
  return { width: 300, height: 112 };
}

function ArchitectureFlow({ pattern, onSelectNode }) {
  const reactFlow = useReactFlow();
  const graph = useMemo(() => buildGraph(pattern), [pattern]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  const fit = useCallback(
    (duration = 500) => {
      requestAnimationFrame(() => {
        reactFlow.fitView({ padding: 0.08, duration, includeHiddenNodes: false, minZoom: 0.42, maxZoom: 0.92 });
      });
    },
    [reactFlow],
  );

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
    const t = window.setTimeout(() => fit(650), 120);
    return () => window.clearTimeout(t);
  }, [graph, fit, setEdges, setNodes]);

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
      onNodeClick={(_, selectedNode) => {
        if (selectedNode.data?.details) onSelectNode(selectedNode.data);
      }}
      fitView
      fitViewOptions={{ padding: 0.08, minZoom: 0.42, maxZoom: 0.92 }}
      minZoom={0.3}
      maxZoom={1.55}
      snapToGrid
      snapGrid={[12, 12]}
      proOptions={{ hideAttribution: true }}
      className="architecture-flow"
    >
      <Background color="#17212a" gap={28} size={1} />
      <Controls className="rf-controls" showInteractive={false} />
      <Panel position="top-left" className="diagram-panel">
        <button onClick={() => fit(550)} type="button">Fit view</button>
        <span>One intent → one Super Agent → one outcome · repeated edge labels removed</span>
      </Panel>
    </ReactFlow>
  );
}

function nodeColor(kind) {
  return KIND_META[kind]?.dot ?? '#60707d';
}

function AppShell() {
  const [intent, setIntent] = useState(EXAMPLE_INTENTS[0]);
  const [patternKey, setPatternKey] = useState('auto');
  const [selectedNode, setSelectedNode] = useState(null);
  const [toast, setToast] = useState('');

  const selectedKey = patternKey === 'auto' ? detectPattern(intent) : patternKey;
  const pattern = ORCHESTRATION_PATTERNS[selectedKey] ?? ORCHESTRATION_PATTERNS.token;
  const visibleAgents = pattern.agents.slice(0, 5);

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1500);
  }, []);

  const copyJson = useCallback(async () => {
    const payload = {
      intent,
      orchestrationPattern: selectedKey,
      outcome: pattern.outcomeTitle,
      specializedAgents: pattern.agents,
      data: pattern.context,
      toolsAndLLMs: pattern.tools,
      harnessGates: pattern.gates,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      showToast('JSON copied');
    } catch {
      showToast('Clipboard blocked');
    }
  }, [intent, pattern, selectedKey, showToast]);

  const loadExample = () => {
    setPatternKey('auto');
    setIntent(EXAMPLE_INTENTS[Math.floor(Math.random() * EXAMPLE_INTENTS.length)]);
    setSelectedNode(null);
  };

  return (
    <div className="app">
      <section className="hero-grid">
        <div className="card hero-card">
          <div className="eyebrow">AI Factory Super Agent</div>
          <h1>Intent-driven agentic orchestration</h1>
          <p className="lead">
            One intent, one Super Agent, one governed outcome. The orchestration layer underneath makes explicit what is an agent, data, memory, rules, tools, LLMs and harness.
          </p>
          <p className="note-line">
            <strong>Orchestration pattern</strong> is not the overall context. The overall context is always the AI Factory Super Agent; the pattern is the mission type inferred from the intent.
          </p>
          <div className="controls-grid">
            <label className="field">
              <span>Intent</span>
              <textarea value={intent} onChange={(event) => setIntent(event.target.value)} />
            </label>
            <label className="field">
              <span>Orchestration pattern</span>
              <select value={patternKey} onChange={(event) => setPatternKey(event.target.value)}>
                <option value="auto">Auto-detect from intent</option>
                {Object.entries(ORCHESTRATION_PATTERNS).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </label>
            <button className="primary" type="button" onClick={() => setSelectedNode(null)}>Recompute</button>
            <button className="secondary" type="button" onClick={loadExample}>Example</button>
            <button className="secondary" type="button" onClick={copyJson}>Copy JSON</button>
          </div>
        </div>

        <div className="card summary-card">
          <h2>Selected orchestration</h2>
          <p>{pattern.summary}</p>
          <div className="metric-grid">
            <div><span>Pattern</span><strong>{pattern.short}</strong></div>
            <div><span>Agents shown</span><strong>{visibleAgents.length}</strong></div>
            <div><span>NVIDIA calls</span><strong>{pattern.tools.length}</strong></div>
            <div><span>Outcome</span><strong>{pattern.outcomeKind}</strong></div>
          </div>
          <div className="legend">
            {Object.entries({ intent: 'Intent', data: 'Data', memory: 'Memory', rules: 'Rules', agent: 'Agent', tool: 'Tool', llm: 'LLM', harness: 'Harness', outcome: 'Outcome' }).map(([kind, label]) => (
              <span key={kind}><i style={{ background: nodeColor(kind) }} />{label}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="card diagram-card">
          <div className="diagram-header">
            <div>
              <h2>{pattern.label}</h2>
              <p>Intent → Super Agent → Outcome at the top. Below: specialized agents and support layers with minimal labels.</p>
            </div>
            <span className="active-badge">{pattern.short}</span>
          </div>
          <div className="flow-wrap">
            <ArchitectureFlow pattern={pattern} onSelectNode={setSelectedNode} />
          </div>
        </div>

        <aside className="side-panel">
          <div className="card side-card">
            <h3>Outcome of this mission</h3>
            <p>{pattern.outcome}</p>
            <div className="pill-row">
              {pattern.pills.map((pill) => <span key={pill}>{pill}</span>)}
            </div>
          </div>

          <div className="card side-card selected-card">
            <h3>{selectedNode?.title ?? 'Selected block'}</h3>
            <p>{selectedNode?.details ?? 'Click a block in the diagram to inspect its role, inputs, outputs, NVIDIA calls and evidence returned.'}</p>
          </div>

          <div className="card side-card">
            <h3>Specialized agents and NVIDIA calls</h3>
            <div className="agent-list">
              {visibleAgents.map((agent) => (
                <article key={agent.name}>
                  <strong>{agent.name}</strong>
                  <span>{agent.role}</span>
                  <em>{agent.nvidia}</em>
                </article>
              ))}
            </div>
          </div>

          <div className="card side-card">
            <h3>Harness / evidence gates</h3>
            <ul className="compact-list">
              {pattern.gates.map((gate) => <li key={gate}>{gate}</li>)}
            </ul>
          </div>
        </aside>
      </section>

      <section className="card matrix-card">
        <table>
          <thead>
            <tr>
              <th>Orchestration pattern</th>
              <th>Primary outcome</th>
              <th>Visible specialized agents</th>
              <th>NVIDIA-centered calls</th>
              <th>Best use</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ORCHESTRATION_PATTERNS).map(([key, value]) => (
              <tr key={key} className={key === selectedKey ? 'is-active' : ''}>
                <td><strong>{value.label}</strong></td>
                <td>{value.outcome}</td>
                <td>{value.agents.slice(0, 5).map((agent) => visibleAgentName(agent.name)).join(', ')}</td>
                <td>{shortList(value.tools, 4)}</td>
                <td>{value.best}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppShell />
    </ReactFlowProvider>
  );
}

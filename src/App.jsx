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

const SUPPORT_CONTENT = {
  token: {
    memory: ['AI Factory lessons memory', 'prior baselines · reusable decisions', 'Previous AI Factory records, reusable DSX baselines, lesson-learned vectors and precedent evidence.'],
    rules: ['DSX / expansion rules', 'DSX · water · Rubin expansion', 'DSX reference constraints, expansion rules, water/PUE targets, controlled deviation policies and approval criteria.'],
    llms: ['Planning LLMs', 'NIM reasoning · report generation', 'NIM-hosted reasoning model for mission planning plus controlled report-generation model for the decision package.'],
  },
  requirements: {
    memory: ['Requirements memory', 'DSX corpus · schemas · examples', 'Indexed RFP/OPR examples, approved requirement schemas, DSX corpus passages and historical clarification patterns.'],
    rules: ['Requirement rules', 'DSX mapping · deviation logic', 'Requirement schema, DSX rule mapping, missing-information policy and deviation approval logic.'],
    llms: ['Structured-output LLMs', 'NIM JSON extraction · clarification', 'NIM-hosted LLM constrained to structured JSON extraction, DSX mapping summaries and targeted clarification questions.'],
  },
  simulation: {
    memory: ['Simulation memory', 'prior runs · result lineage · catalog', 'Simulation catalogue, prior run records, accepted model assumptions, surrogate-model references and result-lineage index.'],
    rules: ['Simulation rules', 'input freeze · validity · no invented result', 'Simulation objective contract, input-freeze requirements, model-validity checks and no-invented-result gate.'],
    llms: ['Simulation planning LLMs', 'NIM run plan · evidence summary', 'NIM-hosted LLM used to draft the run plan, explain assumptions and summarize only available evidence.'],
  },
  openusd: {
    memory: ['Asset memory', 'asset registry · versions · provenance', 'Supplier asset registry, OpenUSD scene references, SimReady profiles, versions, provenance and prior integrations.'],
    rules: ['Asset rules', 'SimReady · interface · permissions', 'SimReady metadata requirements, interface compatibility rules, supplier permissions and registration criteria.'],
    llms: ['Asset-request LLMs', 'NIM request · validation summary', 'NIM-hosted LLM used for structured A2A request drafting and validation summaries grounded in asset metadata.'],
  },
  operations: {
    memory: ['Operations memory', 'incident history · operating twin', 'Incident history, operating twin state, workload placement history, maintenance windows and prior mitigation actions.'],
    rules: ['Operations rules', 'thermal envelope · policy · approval', 'Operating envelope, workload policy, safe intervention rules, spare-part policies and human approval threshold.'],
    llms: ['Operations LLMs', 'NIM incident summary · mitigation report', 'NIM-hosted LLM used for incident summarization, mitigation narrative and approval-ready package drafting.'],
  },
  interconnect: {
    memory: ['Interconnect memory', 'topology · catalog · prior routing', 'Logical topology memory, cable catalog, previous routing issues, OpenUSD connection points and OCP/DSX rule snippets.'],
    rules: ['Interconnect rules', 'bend radius · BOM · DSX compliance', 'Bend-radius rules, cable length thresholds, BOM/lead-time criteria, OCP guidance and DSX compliance checks.'],
    llms: ['Readiness-report LLMs', 'NIM structured readiness report', 'NIM-hosted LLM constrained to produce a traceable interconnect readiness report with cited rule evidence.'],
  },
  robot: {
    memory: ['Robot service memory', 'procedures · logs · configuration', 'Robot logs, service procedures, part configuration, prior interventions, safety constraints and simulation references.'],
    rules: ['Robot safety rules', 'approved procedure · safety gate', 'Approved procedure rules, safety boundary, part compatibility checks and technician approval requirements.'],
    llms: ['Robot-domain LLMs', 'NIM diagnosis · service report', 'NIM-hosted robot/domain LLM for diagnostic reasoning and service report generation under safety constraints.'],
  },
};

function ArchitectureNode({ data, selected }) {
  const meta = KIND_META[data.kind] ?? KIND_META.agent;
  const Icon = data.icon ?? meta.Icon;

  return (
    <div className={`arch-node arch-node--${data.kind} ${selected ? 'is-selected' : ''} ${data.dynamic ? 'is-dynamic' : ''}`}>
      <Handle id="left" type="target" position={Position.Left} className="handle" />
      <Handle id="top" type="target" position={Position.Top} className="handle" />
      {data.dynamic ? <div className="arch-node__flag">recomputed</div> : null}
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
  return <div className={`caption-node caption-node--${data.variant ?? 'default'}`}>{data.title}</div>;
}

function SupportBusNode({ data }) {
  return (
    <div className="support-bus-node">
      <div className="support-bus-node__line" />
      <div className="support-bus-node__label">{data.title}</div>
    </div>
  );
}

const nodeTypes = {
  architecture: ArchitectureNode,
  orchestrationBand: OrchestrationBandNode,
  caption: CaptionNode,
  supportBus: SupportBusNode,
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

function supportFor(patternKey, pattern) {
  const specific = SUPPORT_CONTENT[patternKey] ?? SUPPORT_CONTENT.token;
  return {
    data: [
      'Data',
      shortList(pattern.context, 3),
      `Controlled enterprise/context data selected for this mission:\n${pattern.context.map((item) => `• ${item}`).join('\n')}`,
    ],
    memory: specific.memory,
    rules: specific.rules,
    tools: [
      'Tools / Services',
      shortList(pattern.tools, 3),
      `Deterministic services, engineering tools or NVIDIA platform calls selected for this mission:\n${pattern.tools.map((tool) => `• ${tool}`).join('\n')}`,
    ],
    llms: specific.llms,
    harness: [
      'Harness',
      shortList(pattern.gates, 3),
      `Mandatory controls selected for this mission:\n${pattern.gates.map((gate) => `• ${gate}`).join('\n')}`,
    ],
  };
}

function edge(id, source, target, options = {}) {
  const {
    label = '',
    animated = false,
    sourceHandle = 'right',
    targetHandle = 'left',
    color = animated ? '#76b900' : '#66727d',
    zIndex = animated ? 1 : 3,
  } = options;

  return {
    id,
    source,
    target,
    label,
    animated,
    sourceHandle,
    targetHandle,
    type: 'straight',
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color },
    style: { stroke: color, strokeWidth: animated ? 2.6 : 1.8 },
    labelStyle: { fill: '#edf6ff', fontSize: 10.5, fontWeight: 900 },
    labelBgStyle: { fill: '#071018', fillOpacity: 0.96 },
    labelBgPadding: [7, 4],
    labelShowBg: Boolean(label),
    zIndex,
  };
}

function makeNode(id, kind, title, subtitle, details, x, y, opts = {}) {
  const size = opts.size ?? sizeForKind(kind);
  return {
    id,
    type: opts.type ?? 'architecture',
    data: {
      kind,
      title,
      subtitle,
      details,
      icon: opts.icon,
      dynamic: opts.dynamic ?? false,
    },
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

function makeCaption(id, title, x, y, width, variant = 'default') {
  return {
    id,
    type: 'caption',
    data: { title, variant },
    position: { x, y },
    draggable: false,
    selectable: false,
    focusable: false,
    style: { width, height: 32, zIndex: 12 },
  };
}

function buildGraph(pattern, patternKey) {
  const visibleAgents = pattern.agents.slice(0, 5);
  const support = supportFor(patternKey, pattern);
  const agentX = [30, 388, 746, 1104, 1462];
  const supportX = [30, 334, 638, 942, 1246, 1550];
  const agentY = 470;
  const supportY = 760;

  const nodes = [
    {
      id: 'orchestration-band',
      type: 'orchestrationBand',
      data: { title: `${pattern.label} · Agentic Orchestration` },
      position: { x: -70, y: 330 },
      draggable: false,
      selectable: false,
      focusable: false,
      style: { width: 1960, height: 650, zIndex: 6 },
    },
    makeCaption('delegate-caption', 'delegates to specialized agents', 795, 286, 310, 'green'),
    makeCaption('dynamic-caption', 'Data · Memory · Rules · Tools · LLMs · Harness are recomputed for this intent', 525, 692, 790, 'support'),
    {
      id: 'support-bus',
      type: 'supportBus',
      data: { title: 'shared support layer used by every specialized agent' },
      position: { x: 110, y: 714 },
      draggable: false,
      selectable: false,
      focusable: false,
      style: { width: 1630, height: 34, zIndex: 5 },
    },
    makeNode(
      'intent',
      'intent',
      pattern.intentLabel,
      'Natural-language mission request',
      'One intent starts the process. The Super Agent interprets it and selects the orchestration pattern, data, memory, rules, tools, LLMs and harness controls.',
      20,
      35,
      { zIndex: 10 },
    ),
    makeNode(
      'super',
      'super',
      'AI Factory Super Agent',
      'Planning and orchestration',
      'The single mission orchestrator. It decomposes the intent, selects specialized agents, calls NVIDIA tools and LLM services, checks rules, and assembles the governed outcome package.',
      760,
      25,
      { icon: Sparkles, zIndex: 10 },
    ),
    makeNode(
      'outcome',
      'outcome',
      pattern.outcomeTitle,
      'Governed outcome package',
      pattern.outcome,
      1510,
      35,
      { icon: CheckCircle2, zIndex: 10 },
    ),
    ...visibleAgents.map((agent, index) =>
      makeNode(
        `agent-${index}`,
        'agent',
        visibleAgentName(agent.name),
        agent.role,
        `${agent.role}\n\nInput: ${agent.input}\n\nOutput: ${agent.output}\n\nNVIDIA call: ${agent.nvidia}\n\nEvidence returned: ${agent.evidence}`,
        agentX[index],
        agentY,
        { icon: iconForAgent(agent.name), dynamic: true, zIndex: 10 },
      ),
    ),
    makeNode('data', 'data', support.data[0], support.data[1], support.data[2], supportX[0], supportY, { dynamic: true, zIndex: 10 }),
    makeNode('memory', 'memory', support.memory[0], support.memory[1], support.memory[2], supportX[1], supportY, { dynamic: true, zIndex: 10 }),
    makeNode('rules', 'rules', support.rules[0], support.rules[1], support.rules[2], supportX[2], supportY, { dynamic: true, zIndex: 10 }),
    makeNode('tools', 'tool', support.tools[0], support.tools[1], support.tools[2], supportX[3], supportY, { dynamic: true, zIndex: 10 }),
    makeNode('llms', 'llm', support.llms[0], support.llms[1], support.llms[2], supportX[4], supportY, { dynamic: true, zIndex: 10 }),
    makeNode('harness', 'harness', support.harness[0], support.harness[1], support.harness[2], supportX[5], supportY, { dynamic: true, zIndex: 10 }),
  ];

  const edges = [
    edge('intent-super', 'intent', 'super', { label: 'mission', animated: true, zIndex: 4 }),
    edge('super-outcome', 'super', 'outcome', { label: 'governed package', animated: true, zIndex: 4 }),
    edge('data-memory', 'data', 'memory', { label: 'index', color: '#f5a400', zIndex: 4 }),
    edge('memory-rules', 'memory', 'rules', { label: 'retrieve', zIndex: 4 }),
    edge('rules-tools', 'rules', 'tools', { label: 'constrain', color: '#f5a400', zIndex: 4 }),
    edge('tools-llms', 'tools', 'llms', { label: 'call', color: '#f5a400', zIndex: 4 }),
    edge('llms-harness', 'llms', 'harness', { label: 'validate', zIndex: 4 }),
    edge('harness-outcome', 'harness', 'outcome', {
      animated: true,
      sourceHandle: 'right',
      targetHandle: 'bottom',
      label: 'approve',
      zIndex: 4,
    }),
  ];

  visibleAgents.forEach((_, index) => {
    edges.push(
      edge(`super-agent-${index}`, 'super', `agent-${index}`, {
        animated: true,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        zIndex: 0,
      }),
    );
  });

  return { nodes, edges };
}

function sizeForKind(kind) {
  if (kind === 'super' || kind === 'outcome') return { width: 380, height: 130 };
  if (kind === 'intent') return { width: 360, height: 118 };
  if (kind === 'agent') return { width: 318, height: 126 };
  if (kind === 'data' || kind === 'memory' || kind === 'rules' || kind === 'tool' || kind === 'llm' || kind === 'harness') {
    return { width: 272, height: 120 };
  }
  return { width: 300, height: 112 };
}

function ArchitectureFlow({ pattern, patternKey, onSelectNode }) {
  const reactFlow = useReactFlow();
  const graph = useMemo(() => buildGraph(pattern, patternKey), [pattern, patternKey]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  const fit = useCallback(
    (duration = 500) => {
      requestAnimationFrame(() => {
        reactFlow.fitView({ padding: 0.05, duration, includeHiddenNodes: false, minZoom: 0.36, maxZoom: 0.88 });
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
      fitViewOptions={{ padding: 0.05, minZoom: 0.36, maxZoom: 0.88 }}
      minZoom={0.25}
      maxZoom={1.7}
      snapToGrid
      snapGrid={[12, 12]}
      proOptions={{ hideAttribution: true }}
      className="architecture-flow"
    >
      <Background color="#17212a" gap={28} size={1} />
      <Controls className="rf-controls" showInteractive={false} />
      <Panel position="top-left" className="diagram-panel">
        <button onClick={() => fit(550)} type="button">Fit view</button>
        <span>Dynamic nodes highlight what changes when the intent or orchestration pattern changes</span>
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
  const support = supportFor(selectedKey, pattern);

  useEffect(() => {
    setSelectedNode(null);
  }, [selectedKey]);

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
      memory: support.memory,
      rules: support.rules,
      toolsAndServices: pattern.tools,
      llms: support.llms,
      harnessGates: pattern.gates,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      showToast('JSON copied');
    } catch {
      showToast('Clipboard blocked');
    }
  }, [intent, pattern, selectedKey, showToast, support]);

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
              <p>Intent → Super Agent → Outcome at the top. Below: specialized agents and a dynamic support layer for data, memory, rules, tools, LLMs and harness.</p>
            </div>
            <span className="active-badge">{pattern.short}</span>
          </div>
          <div className="flow-wrap">
            <ArchitectureFlow pattern={pattern} patternKey={selectedKey} onSelectNode={setSelectedNode} />
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

          <div className="card side-card dynamic-card">
            <h3>What changes with this intent</h3>
            <ul className="dynamic-list">
              <li><strong>Data:</strong> {shortList(pattern.context, 4)}</li>
              <li><strong>Memory:</strong> {support.memory[1]}</li>
              <li><strong>Rules:</strong> {support.rules[1]}</li>
              <li><strong>Tools:</strong> {shortList(pattern.tools, 4)}</li>
              <li><strong>LLMs:</strong> {support.llms[1]}</li>
              <li><strong>Harness:</strong> {shortList(pattern.gates, 4)}</li>
            </ul>
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

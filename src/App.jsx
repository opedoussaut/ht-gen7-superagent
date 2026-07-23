import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import dagre from 'dagre';
import {
  Bot,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileSearch,
  Fingerprint,
  GitBranch,
  Network,
  PackageCheck,
  RadioTower,
  Route,
  SearchCheck,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react';
import { EXAMPLE_INTENTS, ORCHESTRATION_PATTERNS, detectPattern } from './data.js';

const nodeTypes = { architecture: ArchitectureNode };

const KIND_META = {
  intent: { label: 'Intent', Icon: Fingerprint },
  data: { label: 'Data', Icon: Database },
  super: { label: 'Super Agent', Icon: BrainCircuit },
  agent: { label: 'Specialized Agent', Icon: Bot },
  tool: { label: 'NVIDIA Tool / LLM', Icon: Boxes },
  rag: { label: 'RAG / Evidence', Icon: SearchCheck },
  harness: { label: 'Harness', Icon: ShieldCheck },
  outcome: { label: 'Outcome', Icon: PackageCheck },
};

function ArchitectureNode({ data, selected }) {
  const meta = KIND_META[data.kind] ?? KIND_META.agent;
  const Icon = data.icon ?? meta.Icon;
  return (
    <div className={`arch-node arch-node--${data.kind} ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="handle" />
      <div className="arch-node__icon" aria-hidden="true">
        <Icon size={24} strokeWidth={2.4} />
      </div>
      <div className="arch-node__body">
        <div className="arch-node__kind">{meta.label}</div>
        <div className="arch-node__title">{data.title}</div>
        <div className="arch-node__subtitle">{data.subtitle}</div>
      </div>
      <Handle type="source" position={Position.Right} className="handle" />
    </div>
  );
}

function iconForAgent(agentName) {
  const name = agentName.toLowerCase();
  if (name.includes('power') || name.includes('cooling')) return Zap;
  if (name.includes('network') || name.includes('interconnect')) return Network;
  if (name.includes('simulation') || name.includes('physics')) return SlidersHorizontal;
  if (name.includes('requirements') || name.includes('requirement')) return FileSearch;
  if (name.includes('route') || name.includes('cabling')) return Route;
  if (name.includes('maintenance') || name.includes('procedure') || name.includes('parts')) return Wrench;
  if (name.includes('dsx') || name.includes('openusd') || name.includes('simready')) return Boxes;
  return Bot;
}

function shortToolList(tools) {
  if (!tools?.length) return 'No tool selected';
  return tools.slice(0, 3).join(' · ') + (tools.length > 3 ? ' · …' : '');
}

function edge(id, source, target, label, animated = false) {
  return {
    id,
    source,
    target,
    label,
    animated,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    style: animated ? { stroke: '#76b900', strokeWidth: 2.4 } : { stroke: '#65727d', strokeWidth: 1.7 },
    labelStyle: { fill: '#aab5bf', fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: '#071018', fillOpacity: 0.86 },
    labelBgPadding: [6, 3],
  };
}

function buildGraph(pattern) {
  const visibleAgents = pattern.agents.slice(0, 5);
  const nodes = [
    {
      id: 'intent',
      type: 'architecture',
      data: {
        kind: 'intent',
        title: pattern.intentLabel,
        subtitle: 'Natural-language mission request',
        details: 'The business or engineering intent that starts the orchestration. Auto-detect selects the mission pattern from this text.',
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'context',
      type: 'architecture',
      data: {
        kind: 'data',
        title: 'Enterprise Context',
        subtitle: pattern.context.join(' · '),
        details: 'Controlled context package: documents, telemetry, previous records, baselines and approved rule sources used to ground the orchestration.',
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'super',
      type: 'architecture',
      data: {
        kind: 'super',
        icon: Sparkles,
        title: 'AI Factory Super Agent',
        subtitle: 'Mission orchestrator',
        details: 'Decomposes the intent, selects specialized agents, calls NVIDIA tools/LLMs, defines evidence gates and assembles the governed outcome package.',
      },
      position: { x: 0, y: 0 },
    },
    ...visibleAgents.map((agent, index) => ({
      id: `agent-${index}`,
      type: 'architecture',
      data: {
        kind: 'agent',
        icon: iconForAgent(agent.name),
        title: agent.name,
        subtitle: agent.role,
        details: `${agent.role}\n\nInput: ${agent.input}\n\nOutput: ${agent.output}\n\nNVIDIA call: ${agent.nvidia}\n\nEvidence returned: ${agent.evidence}`,
      },
      position: { x: 0, y: 0 },
    })),
    {
      id: 'tools',
      type: 'architecture',
      data: {
        kind: 'tool',
        title: 'NVIDIA Tools / LLMs',
        subtitle: shortToolList(pattern.tools),
        details: `Candidate calls selected for this pattern:\n${pattern.tools.map((tool) => `• ${tool}`).join('\n')}`,
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'rag',
      type: 'architecture',
      data: {
        kind: 'rag',
        title: 'RAG / Knowledge Layer',
        subtitle: 'NeMo Retriever · cuVS · reranking · grounded generation',
        details: 'Retrieval and grounding layer. It searches controlled enterprise/DSX/domain sources, ranks evidence, and feeds only traceable context to agents.',
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'harness',
      type: 'architecture',
      data: {
        kind: 'harness',
        title: 'Harness Controls',
        subtitle: 'schema · evidence · no invented results · approvals',
        details: `Mandatory controls:\n${pattern.gates.map((gate) => `• ${gate}`).join('\n')}`,
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'outcome',
      type: 'architecture',
      data: {
        kind: 'outcome',
        icon: CheckCircle2,
        title: pattern.outcomeTitle,
        subtitle: 'Governed decision package',
        details: pattern.outcome,
      },
      position: { x: 0, y: 0 },
    },
  ];

  const edges = [
    edge('intent-super', 'intent', 'super', 'mission', true),
    edge('context-super', 'context', 'super', 'grounding', false),
    edge('super-outcome', 'super', 'outcome', 'approved package', true),
    edge('super-tools', 'super', 'tools', 'select calls', false),
    edge('tools-rag', 'tools', 'rag', 'retrieve / index', false),
    edge('rag-harness', 'rag', 'evidence', 'evidence', false),
    edge('harness-outcome', 'harness', 'outcome', 'validate', true),
  ].filter((e) => e.target !== 'evidence');

  visibleAgents.forEach((_, index) => {
    edges.push(edge(`super-agent-${index}`, 'super', `agent-${index}`, 'delegate', true));
    edges.push(edge(`agent-tools-${index}`, `agent-${index}`, 'tools', 'call', false));
    edges.push(edge(`agent-rag-${index}`, `agent-${index}`, 'rag', 'evidence', false));
    edges.push(edge(`agent-harness-${index}`, `agent-${index}`, 'harness', 'check', false));
  });

  edges.push(edge('rag-harness-final', 'rag', 'harness', 'coverage', false));

  return layoutGraph(nodes, edges);
}

function layoutGraph(nodes, edges) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'LR', ranksep: 145, nodesep: 54, edgesep: 28, marginx: 40, marginy: 40 });

  nodes.forEach((node) => {
    const size = sizeForKind(node.data.kind);
    graph.setNode(node.id, size);
  });

  edges.forEach((e) => graph.setEdge(e.source, e.target));
  dagre.layout(graph);

  const layouted = nodes.map((node) => {
    const layout = graph.node(node.id);
    const size = sizeForKind(node.data.kind);
    return {
      ...node,
      width: size.width,
      height: size.height,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      position: {
        x: layout.x - size.width / 2,
        y: layout.y - size.height / 2,
      },
    };
  });

  return { nodes: layouted, edges };
}

function sizeForKind(kind) {
  if (kind === 'super' || kind === 'outcome') return { width: 285, height: 112 };
  if (kind === 'agent') return { width: 270, height: 108 };
  if (kind === 'tool' || kind === 'rag' || kind === 'harness') return { width: 290, height: 108 };
  return { width: 260, height: 100 };
}

function ArchitectureFlow({ pattern, onSelectNode }) {
  const reactFlow = useReactFlow();
  const graph = useMemo(() => buildGraph(pattern), [pattern]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
    const t = window.setTimeout(() => {
      reactFlow.fitView({ padding: 0.16, duration: 650, includeHiddenNodes: false });
    }, 80);
    return () => window.clearTimeout(t);
  }, [graph, reactFlow, setEdges, setNodes]);

  useEffect(() => {
    const handleResize = () => reactFlow.fitView({ padding: 0.18, duration: 350 });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [reactFlow]);

  const handleFit = useCallback(() => {
    reactFlow.fitView({ padding: 0.16, duration: 650, includeHiddenNodes: false });
  }, [reactFlow]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onSelectNode(node.data)}
      fitView
      fitViewOptions={{ padding: 0.16 }}
      minZoom={0.25}
      maxZoom={1.85}
      snapToGrid
      snapGrid={[12, 12]}
      proOptions={{ hideAttribution: true }}
      className="architecture-flow"
    >
      <Background color="#17212a" gap={28} size={1} />
      <MiniMap
        pannable
        zoomable
        nodeStrokeWidth={3}
        className="mini-map"
        nodeColor={(node) => nodeColor(node.data?.kind)}
      />
      <Controls className="rf-controls" showInteractive={false} />
      <Panel position="top-left" className="diagram-panel">
        <button onClick={handleFit} type="button">Fit view</button>
        <span>Drag nodes · pan canvas · zoom wheel</span>
      </Panel>
    </ReactFlow>
  );
}

function nodeColor(kind) {
  return {
    intent: '#4c78ff',
    data: '#e67e22',
    super: '#76b900',
    agent: '#ff5a4f',
    tool: '#f5a400',
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
  const shellRef = useRef(null);

  const resolvedKey = patternKey === 'auto' ? detectPattern(intent) : patternKey;
  const pattern = ORCHESTRATION_PATTERNS[resolvedKey];

  useEffect(() => setSelectedNode(null), [resolvedKey]);

  const currentJson = useMemo(() => ({ intent, resolvedPattern: resolvedKey, ...pattern }), [intent, pattern, resolvedKey]);

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
    showToast('Example loaded');
  }

  return (
    <main className="app" ref={shellRef}>
      <section className="hero-grid">
        <div className="card hero-card">
          <div className="eyebrow"><Sparkles size={15} /> VP-ready architecture mockup</div>
          <h1>AI Factory Super Agent</h1>
          <p className="lead">Intent-driven orchestration of specialized agents, NVIDIA tools, evidence and governed outcomes.</p>
          <p className="note-line"><strong>Orchestration pattern</strong> is not the overall context. The overall context is always the AI Factory Super Agent. The pattern is the mission type selected from the intent.</p>
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
            <button type="button" className="primary" onClick={() => showToast('Orchestration recomputed')}>Recompute</button>
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
              <p>Intent → AI Factory Super Agent → specialized agents → NVIDIA calls → RAG/evidence → harness → governed outcome.</p>
            </div>
            <span className="active-badge">{pattern.short}</span>
          </div>
          <div className="flow-wrap">
            <ArchitectureFlow pattern={pattern} onSelectNode={setSelectedNode} />
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
            <p>{selectedNode?.details ?? 'Click a block in the diagram to inspect its role, inputs, outputs, NVIDIA call and evidence requirement.'}</p>
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

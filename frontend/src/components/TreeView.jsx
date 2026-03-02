import { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const nodeColors = {
  thesis: { bg: '#00ff88', text: '#080b10', border: '#00ff88' },
  second_order: { bg: '#f59e0b', text: '#080b10', border: '#f59e0b' },
  third_order: { bg: '#8b5cf6', text: '#ffffff', border: '#8b5cf6' },
};

function buildFlowGraph(tree) {
  if (!tree) return { nodes: [], edges: [] };

  const nodes = [];
  const edges = [];
  let yOffset = 0;

  const addNode = (node, x, y, parentId) => {
    const colors = nodeColors[node.node_type] || nodeColors.thesis;
    const tickerStr = node.tickers?.map(t => t.symbol).join(', ') || '';

    nodes.push({
      id: String(node.id),
      position: { x, y },
      data: {
        label: node.label,
        nodeType: node.node_type,
        description: node.description,
        tickers: node.tickers || [],
        startupIdeas: node.startup_ideas || [],
      },
      style: {
        background: `${colors.bg}15`,
        border: `2px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '12px 16px',
        color: '#e6edf3',
        fontSize: '12px',
        fontFamily: "'JetBrains Mono', monospace",
        maxWidth: '220px',
        cursor: 'pointer',
      },
      type: 'default',
    });

    if (parentId != null) {
      edges.push({
        id: `e-${parentId}-${node.id}`,
        source: String(parentId),
        target: String(node.id),
        style: { stroke: colors.border, strokeWidth: 2 },
        animated: node.node_type === 'second_order',
      });
    }
  };

  // Layout: thesis on left, 2nd order in middle, 3rd order on right
  addNode(tree, 0, 250, null);

  const soChildren = tree.children || [];
  const soSpacing = Math.max(350, soChildren.length * 180);

  soChildren.forEach((so, i) => {
    const soY = i * soSpacing;
    addNode(so, 350, soY, tree.id);

    const toChildren = so.children || [];
    toChildren.forEach((to, j) => {
      const toY = soY + (j - 1) * 200;
      addNode(to, 700, toY, so.id);
    });
  });

  return { nodes, edges };
}

export default function TreeView({ tree, onNodeClick }) {
  const { nodes: initialNodes, edges: initialEdges } = buildFlowGraph(tree);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildFlowGraph(tree);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [tree]);

  const handleNodeClick = useCallback((_, node) => {
    if (onNodeClick) onNodeClick(node.data);
  }, [onNodeClick]);

  if (!tree) {
    return (
      <div className="flex items-center justify-center h-96 text-dim text-sm">
        No tree data available. Generate a tree to see the causal analysis.
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-bg rounded-xl border border-border overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Controls />
        <Background color="#1c2333" gap={20} />
      </ReactFlow>
    </div>
  );
}

import type { ViewPort } from "react-zoomable-ui/dist/ViewPort";
import type { CanvasDirection } from "reaflow/dist/layout/elkLayout";
import { create } from "zustand";
import { parser } from "src/containers/Editor/components/views/GraphView/lib/jsonParser";
import { getChildrenEdges } from "src/containers/Editor/components/views/GraphView/lib/utils/getChildrenEdges";
import { getOutgoers } from "src/containers/Editor/components/views/GraphView/lib/utils/getOutgoers";
import type { NodeData, EdgeData } from "src/types/graph";
import useJson from "../../../../../../store/useJson";

export interface Graph {
  viewPort: ViewPort | null;
  direction: CanvasDirection;
  loading: boolean;
  graphCollapsed: boolean;
  fullscreen: boolean;
  collapseAll: boolean;
  nodes: NodeData[];
  edges: EdgeData[];
  collapsedNodes: string[];
  collapsedEdges: string[];
  collapsedParents: string[];
  selectedNode: NodeData | null;
  path: string;
}

const initialStates: Graph = {
  viewPort: null,
  direction: "RIGHT",
  loading: true,
  graphCollapsed: false,
  fullscreen: false,
  collapseAll: false,
  nodes: [],
  edges: [],
  collapsedNodes: [],
  collapsedEdges: [],
  collapsedParents: [],
  selectedNode: null,
  path: "",
};

interface GraphActions {
  setGraph: (json?: string, options?: Partial<Graph>[]) => void;
  setLoading: (loading: boolean) => void;
  setDirection: (direction: CanvasDirection) => void;
  setViewPort: (ref: ViewPort) => void;
  setSelectedNode: (nodeData: NodeData) => void;
  focusFirstNode: () => void;
  focusSecondNode: () => void;
  expandNodes: (nodeId: string) => void;
  expandGraph: () => void;
  collapseNodes: (nodeId: string) => void;
  collapseGraph: () => void;
  getCollapsedNodeIds: () => string[];
  getCollapsedEdgeIds: () => string[];
  toggleFullscreen: (value: boolean) => void;
  toggleCollapseAll: (value: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  centerView: () => void;
  clearGraph: () => void;
  setZoomFactor: (zoomFactor: number) => void;
}

function parseTransform(transform) {
  const matrixRegex = /matrix\(([^)]+)\)/;
  const match = transform.match(matrixRegex);
  if (match) {
    const values = match[1].split(",");
    return {
      translateX: parseInt(values[4]),
      translateY: parseInt(values[5]),
      scaleX: parseInt(values[0]),
      scaleY: parseInt(values[3]),
      rotate: Math.atan2(values[1], values[0]) * (180 / Math.PI),
    };
  }
  return { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 };
}

const useGraph = create<Graph & GraphActions>((set, get) => ({
  ...initialStates,
  toggleCollapseAll: collapseAll => {
    set({ collapseAll });
    get().collapseGraph();
  },
  clearGraph: () => set({ nodes: [], edges: [], loading: false }),
  getCollapsedNodeIds: () => get().collapsedNodes,
  getCollapsedEdgeIds: () => get().collapsedEdges,
  setSelectedNode: nodeData => set({ selectedNode: nodeData }),
  setGraph: (data, options) => {
    const { nodes, edges } = parser(data ?? useJson.getState().json);

    if (get().collapseAll) {
      set({ nodes, edges, ...options });
      get().collapseGraph();
    } else {
      set({
        nodes,
        edges,
        collapsedParents: [],
        collapsedNodes: [],
        collapsedEdges: [],
        graphCollapsed: false,
        ...options,
      });
    }
  },
  setDirection: (direction = "RIGHT") => {
    set({ direction });
    setTimeout(() => get().centerView(), 200);
  },
  setLoading: loading => set({ loading }),
  expandNodes: nodeId => {
    const [childrenNodes, matchingNodes] = getOutgoers(
      nodeId,
      get().nodes,
      get().edges,
      get().collapsedParents
    );
    const childrenEdges = getChildrenEdges(childrenNodes, get().edges);

    const nodesConnectedToParent = childrenEdges.reduce((nodes: string[], edge) => {
      edge.from && !nodes.includes(edge.from) && nodes.push(edge.from);
      edge.to && !nodes.includes(edge.to) && nodes.push(edge.to);
      return nodes;
    }, []);
    const matchingNodesConnectedToParent = matchingNodes.filter(node =>
      nodesConnectedToParent.includes(node)
    );
    const nodeIds = childrenNodes.map(node => node.id).concat(matchingNodesConnectedToParent);
    const edgeIds = childrenEdges.map(edge => edge.id);

    const collapsedParents = get().collapsedParents.filter(cp => cp !== nodeId);
    const collapsedNodes = get().collapsedNodes.filter(nodeId => !nodeIds.includes(nodeId));
    const collapsedEdges = get().collapsedEdges.filter(edgeId => !edgeIds.includes(edgeId));

    set({
      collapsedParents,
      collapsedNodes,
      collapsedEdges,
      graphCollapsed: !!collapsedNodes.length,
    });
  },
  collapseNodes: nodeId => {
    const [childrenNodes] = getOutgoers(nodeId, get().nodes, get().edges);
    const childrenEdges = getChildrenEdges(childrenNodes, get().edges);

    const nodeIds = childrenNodes.map(node => node.id);
    const edgeIds = childrenEdges.map(edge => edge.id);

    set({
      collapsedParents: get().collapsedParents.concat(nodeId),
      collapsedNodes: get().collapsedNodes.concat(nodeIds),
      collapsedEdges: get().collapsedEdges.concat(edgeIds),
      graphCollapsed: !!get().collapsedNodes.concat(nodeIds).length,
    });
  },
  collapseGraph: () => {
    const edges = get().edges;
    const tos = edges.map(edge => edge.to);
    const froms = edges.map(edge => edge.from);
    const parentNodesIds = froms.filter(id => !tos.includes(id));
    const secondDegreeNodesIds = edges
      .filter(edge => parentNodesIds.includes(edge.from))
      .map(edge => edge.to);

    const collapsedParents = get()
      .nodes.filter(node => !parentNodesIds.includes(node.id) && node.data?.isParent)
      .map(node => node.id);

    const collapsedNodes = get()
      .nodes.filter(
        node => !parentNodesIds.includes(node.id) && !secondDegreeNodesIds.includes(node.id)
      )
      .map(node => node.id);

    const closestParentToRoot = Math.min(...collapsedParents.map(n => +n));
    const focusNodeId = `g[id*='node-${closestParentToRoot}']`;
    const rootNode = document.querySelector(focusNodeId);

    set({
      collapsedParents,
      collapsedNodes,
      collapsedEdges: get()
        .edges.filter(edge => !parentNodesIds.includes(edge.from))
        .map(edge => edge.id),
      graphCollapsed: true,
    });

    if (rootNode) {
      get().viewPort?.camera?.centerFitElementIntoView(rootNode as HTMLElement, {
        elementExtraMarginForZoom: 300,
      });
    }
  },
  expandGraph: () => {
    set({
      collapsedNodes: [],
      collapsedEdges: [],
      collapsedParents: [],
      graphCollapsed: false,
    });
  },
  focusFirstNode: () => {
    const rootNode = document.querySelector("g[id*='node-1']");
    get().viewPort?.camera?.centerFitElementIntoView(rootNode as HTMLElement, {
      elementExtraMarginForZoom: 100,
    });
  },
  /**
   * 定位到与根节点水平齐平的第二个节点
   */
  focusSecondNode: () => {
    const rootNode = document.querySelector("g[id*='node-1']") as HTMLElement;
    const styles = window.getComputedStyle(rootNode);
    // 第一个节点的水平区间
    const transform = styles?.getPropertyValue("transform");
    const { translateY: minTranslateY } = parseTransform(transform);
    const nodeHeight = parseFloat(rootNode.querySelector("rect")?.getAttribute("height") ?? "0");
    const maxTranslateY = minTranslateY + nodeHeight;

    // 获取和第一个节点在同一水平区间的节点
    const cen: Element[] = [];
    const allNodes = document.querySelectorAll("path[class*='_path_v5z62_8']");
    allNodes.forEach(node => {
      const d = node.getAttribute("d");
      const translateY = parseInt(d?.substring(d.lastIndexOf(",") + 1) ?? "0");
      if (translateY > minTranslateY && translateY < maxTranslateY) {
        cen.push(node);
      }
    });

    //console.log(cen);
    if (cen.length >= 2) {
      get().viewPort?.camera?.centerFitElementIntoView(cen[1] as HTMLElement, {
        elementExtraMarginForZoom: 100,
      });
      get().setZoomFactor(70 / 100);
      return;
    }

    get().centerView();
  },
  setZoomFactor: zoomFactor => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, zoomFactor);
  },
  zoomIn: () => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, viewPort.zoomFactor + 0.1);
  },
  zoomOut: () => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, viewPort.zoomFactor - 0.1);
  },
  centerView: () => {
    const viewPort = get().viewPort;
    viewPort?.updateContainerSize();

    const canvas = document.querySelector(".jsoncrack-canvas") as HTMLElement | null;
    if (canvas) {
      viewPort?.camera?.centerFitElementIntoView(canvas);
    }
  },
  toggleFullscreen: fullscreen => set({ fullscreen }),
  setViewPort: viewPort => set({ viewPort }),
}));

export default useGraph;

import { describe, it, expect } from 'vitest';
import { debugConvertMermaid } from '../../src/utils/mermaidToReactFlow';

describe('nested/multiple subgraphs layout', () => {
  it('lays out parent and child subgraphs with relative positions', async () => {
  const code = `graph TB
  subgraph ParentA[Parent A]
    A1[Node A1]
    A2[Node A2]
    subgraph ChildA1[Child A1]
      C1[Child 1]
      C2[Child 2]
    end
  end

  subgraph ParentB[Parent B]
    B1[Node B1]
  end

  A1 --> C1
  C2 --> B1
  `;
  const result = await debugConvertMermaid(code);
  const ids = result.reactFlowData.nodes.map((n:any) => n.id);
  expect(ids).toEqual(expect.arrayContaining([
    'subgraph-ParentA', 'subgraph-ParentB', 'subgraph-ChildA1', 'A1','A2','B1','C1','C2'
  ]));
  const child = result.reactFlowData.nodes.find((n:any)=>n.id==='subgraph-ChildA1');
  expect(child?.parentNode).toBe('subgraph-ParentA');
  const a1 = result.reactFlowData.nodes.find((n:any)=>n.id==='A1');
  expect(a1?.parentNode).toBe('subgraph-ParentA');
  // TB left alignment: x should be small positive
  expect((a1?.position.x ?? 999)).toBeGreaterThanOrEqual(0);
  // ParentB is separate top-level container
  const parentB = result.reactFlowData.nodes.find((n:any)=>n.id==='subgraph-ParentB');
  expect(parentB?.parentNode).toBeUndefined();
  });
});

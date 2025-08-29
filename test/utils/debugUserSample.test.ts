import { it, expect, describe } from 'vitest';
import { debugConvertMermaid } from '../../src/utils/mermaidToReactFlow';
describe('user sample conversion', () => {
it('preserves multi-word subgraph titles and assigns parents/positions', async () => {
  const code = `graph TD
    subgraph Overall System
        direction TB

        subgraph Component A
            direction LR

            A1["Node A1"] -- Edge 1 --> A2["Node A2"]

            subgraph Subcomponent B
                direction TB

                B1["Node B1"] -- Edge 3 --> B2["Node B2"]
            end

            A2 -- Edge 2 --> B1
        end

        subgraph Component C
            direction LR

            C1["Node C1"] -- Edge 4 --> C2["Node C2"]

            subgraph Subcomponent D
                direction TB

                D1["Node D1"] -- Edge 5 --> D2["Node D2"]
            end

            C2 -- Edge 6 --> D1
        end

        A1 -- Edge 7 --> C1
    end`;
  const result = await debugConvertMermaid(code);
  const titles = new Map(result.subgraphs.map((s:any)=>[s.id,s.title]));
  expect(Array.from(titles.values())).toEqual(
    expect.arrayContaining(['Overall System','Component A','Subcomponent B','Component C','Subcomponent D'])
  );
  const nodes = result.reactFlowData.nodes;
  const ids = nodes.map((n:any)=>n.id);
  // All expected subgraphs and leaf nodes exist
  expect(ids).toEqual(expect.arrayContaining([
    'subgraph-overall-system','subgraph-component-a','subgraph-subcomponent-b','subgraph-component-c','subgraph-subcomponent-d',
    'A1','A2','B1','B2','C1','C2','D1','D2'
  ]));
  // Parent chain checks
  const compA = nodes.find((n:any)=>n.id==='subgraph-component-a');
  const compC = nodes.find((n:any)=>n.id==='subgraph-component-c');
  expect(compA?.parentNode).toBe('subgraph-overall-system');
  expect(compC?.parentNode).toBe('subgraph-overall-system');
  const subB = nodes.find((n:any)=>n.id==='subgraph-subcomponent-b');
  expect(subB?.parentNode).toBe('subgraph-component-a');
  const subD = nodes.find((n:any)=>n.id==='subgraph-subcomponent-d');
  expect(subD?.parentNode).toBe('subgraph-component-c');
  // Position sanity: left alignment for TB subgraphs -> small x for children
  const a1 = nodes.find((n:any)=>n.id==='A1');
  const b1 = nodes.find((n:any)=>n.id==='B1');
  expect((a1?.position.x ?? 999)).toBeGreaterThanOrEqual(0);
  expect((b1?.position.x ?? 999)).toBeGreaterThanOrEqual(0);
});
});

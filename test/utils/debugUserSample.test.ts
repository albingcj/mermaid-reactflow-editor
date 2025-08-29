import { it } from 'vitest';
import { debugConvertMermaid } from '../../src/utils/mermaidToReactFlow';

it('debug user failing sample', async () => {
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
  console.log('\n=== USER SAMPLE DEBUG ===');
  console.log('subgraphLayouts:');
  Object.keys(result.subgraphLayouts).forEach(k => {
    const v = result.subgraphLayouts[k];
    console.log(`  ${k}: parent=${v.parentId} size=${v.width}x${v.height} nodes=${v.nodes.map((n:any)=>n.id).join(',')}`);
  });
  console.log('subgraphs parsed:', result.subgraphs.map((s: any) => ({ id: s.id, title: s.title, parentId: s.parentId })));
  console.log('parsed nodes (id -> subgraph):', result.nodes.map((n:any)=>({ id: n.id, subgraph: n.subgraph })));
  console.log('reactFlow nodes (id,parent,position,label):');
  result.reactFlowData.nodes.forEach((n: any) => {
    console.log(`  ${n.id} parent=${n.parentNode || 'none'} pos=${JSON.stringify(n.position)} title=${n.data?.label || n.data?.title || ''}`);
  });
});

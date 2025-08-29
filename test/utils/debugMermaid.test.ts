import { it } from 'vitest';
import { debugConvertMermaid } from '../../src/utils/mermaidToReactFlow';

it('debug nested/multiple subgraphs layout', async () => {
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
  // Print a compact summary to aid debugging in CI or local runs
  // Note: Vitest will capture console output; inspect test run logs
  console.log('\n=== DEBUG MERMAID LAYOUT ===');
  console.log('direction:', result.direction);
  console.log('subgraphLayouts keys:', Object.keys(result.subgraphLayouts));
  console.log('subgraphPositions:', result.subgraphPositions);
  console.log('standalonePositions:', result.standalonePositions);
  console.log('reactFlow nodes (id,parentNode,position):');
  result.reactFlowData.nodes.forEach((n: any) => {
    console.log(`  ${n.id} parent=${n.parentNode || 'none'} pos=${JSON.stringify(n.position)}`);
  });
});

import { describe, it, expect } from 'vitest';
import { parseMermaidCode } from '../../src/features/diagram/converter/mermaidToReactFlow';

describe('mermaidToReactFlow parsing', () => {
  it('should parse simple node definitions', () => {
    const code = 'graph LR\n' +
      'A[Node A] --> B(Node B)';
    const { nodes, edges } = parseMermaidCode(code);
    expect(nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'A', label: 'Node A' }),
        expect.objectContaining({ id: 'B', label: 'Node B' }),
      ])
    );
    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'A', target: 'B' }),
      ])
    );
  });

  it('should handle multiline labels', () => {
    const code = 'graph LR\n' +
      'C --> AI["Transactions Database\n(MySQL)"]';
    const { nodes } = parseMermaidCode(code);
    const aiNode = nodes.find(n => n.id === 'AI');
    expect(aiNode).toBeDefined();
  // After preprocessing, multiline labels are joined with a space
  expect(aiNode?.label).toBe('Transactions Database (MySQL)');
  });

  it('should parse subgraph nodes', () => {
    const code = 'graph LR\n' +
      'subgraph Test\n' +
      'X[Test Node]\n' +
      'end';
    const { nodes, subgraphs } = parseMermaidCode(code);
    expect(nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'X', label: 'Test Node' }),
      ])
    );
    // Subgraph IDs preserve original casing when no explicit slug is provided
    expect(subgraphs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'Test', title: 'Test' }),
      ])
    );
  });
});

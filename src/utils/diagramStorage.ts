import { Node, Edge } from 'reactflow';

export interface SavedDiagram {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  originalMermaidCode?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    description?: string;
    tags?: string[];
  };
}

const STORAGE_KEY = 'mermaid-reactflow-diagrams';

export function saveDiagram(diagram: Omit<SavedDiagram, 'id' | 'createdAt' | 'updatedAt'>): SavedDiagram {
  const savedDiagrams = getAllDiagrams();
  
  const newDiagram: SavedDiagram = {
    ...diagram,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  savedDiagrams.push(newDiagram);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDiagrams));
  
  return newDiagram;
}

export function updateDiagram(id: string, updates: Partial<SavedDiagram>): SavedDiagram | null {
  const savedDiagrams = getAllDiagrams();
  const index = savedDiagrams.findIndex(d => d.id === id);
  
  if (index === -1) return null;
  
  savedDiagrams[index] = {
    ...savedDiagrams[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDiagrams));
  return savedDiagrams[index];
}

export function getAllDiagrams(): SavedDiagram[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading diagrams:', error);
    return [];
  }
}

export function getDiagram(id: string): SavedDiagram | null {
  const diagrams = getAllDiagrams();
  return diagrams.find(d => d.id === id) || null;
}

export function deleteDiagram(id: string): boolean {
  const savedDiagrams = getAllDiagrams();
  const filtered = savedDiagrams.filter(d => d.id !== id);
  
  if (filtered.length === savedDiagrams.length) return false;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function exportDiagram(diagram: SavedDiagram): string {
  return JSON.stringify(diagram, null, 2);
}

export function importDiagram(jsonString: string): SavedDiagram | null {
  try {
    const parsed = JSON.parse(jsonString);
    // Validate the structure
    if (!parsed.nodes || !parsed.edges || !parsed.name) {
      throw new Error('Invalid diagram format');
    }
    
    // Create a new diagram with a new ID
    return saveDiagram({
      name: `${parsed.name} (Imported)`,
      nodes: parsed.nodes,
      edges: parsed.edges,
      originalMermaidCode: parsed.originalMermaidCode,
      metadata: parsed.metadata,
    });
  } catch (error) {
    console.error('Error importing diagram:', error);
    return null;
  }
}

export function exportToFile(diagram: SavedDiagram): void {
  const dataStr = exportDiagram(diagram);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${diagram.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_diagram.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateId(): string {
  return `diagram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
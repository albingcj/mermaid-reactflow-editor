import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ChevronRight, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Node, Edge } from "reactflow";
import { MermaidRenderer } from "@/features/diagram/MermaidRenderer";

interface SavedDiagram {
  id: string;
  name: string;
  mermaid: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
}

interface LoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  savedDiagrams: SavedDiagram[];
  setSavedDiagrams: (diagrams: SavedDiagram[]) => void;
  onLoadDiagram: (diagram: SavedDiagram) => void;
}

export function LoadDialog({
  isOpen,
  onClose,
  savedDiagrams,
  setSavedDiagrams,
  onLoadDiagram,
}: LoadDialogProps) {
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [importedDiagram, setImportedDiagram] = useState<SavedDiagram | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content) as SavedDiagram;
          
          // Validate required fields
          if (!parsed.id || !parsed.mermaid || !parsed.nodes || !parsed.edges) {
            throw new Error("Invalid diagram file format");
          }
          
          const imported: SavedDiagram = {
            id: "imported",
            name: parsed.name || "Imported Diagram",
            mermaid: parsed.mermaid,
            nodes: parsed.nodes,
            edges: parsed.edges,
            createdAt: parsed.createdAt || Date.now(),
            updatedAt: parsed.updatedAt || Date.now(),
          };
          
          setImportedDiagram(imported);
          setSelectedPreviewId("imported");
        } catch (err) {
          alert("Failed to load diagram: " + (err instanceof Error ? err.message : "Invalid file format"));
        }
      };
      reader.readAsText(file);
    },
    []
  );

  const loadImportedDiagram = useCallback(() => {
    if (importedDiagram) {
      onLoadDiagram(importedDiagram);
      onClose();
    }
  }, [importedDiagram, onLoadDiagram, onClose]);

  const loadSavedDiagram = useCallback((id: string) => {
    const item = savedDiagrams.find((d) => d.id === id);
    if (item) {
      onLoadDiagram(item);
      onClose();
    }
  }, [savedDiagrams, onLoadDiagram, onClose]);

  const deleteSavedDiagram = useCallback((id: string) => {
    const next = savedDiagrams.filter((d) => d.id !== id);
    setSavedDiagrams(next);
    if (selectedPreviewId === id) {
      setSelectedPreviewId(null);
    }
    setConfirmDeleteId(null);
  }, [savedDiagrams, selectedPreviewId, setSavedDiagrams]);

  const confirmDeleteSavedDiagram = useCallback(() => {
    if (confirmDeleteId) {
      deleteSavedDiagram(confirmDeleteId);
    }
  }, [confirmDeleteId, deleteSavedDiagram]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        // close when clicking on the backdrop (but not when clicking inside the modal)
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className="bg-card rounded-lg shadow-inner dark:ring-1 dark:ring-primary/40 max-w-4xl w-full max-h-[80vh] min-h-[480px] overflow-hidden flex flex-col">
        {/* Modal Header - common fixed header for both columns */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/5">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Saved Diagrams</h3>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="application/json" onChange={onFileInputChange} className="hidden" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="whitespace-nowrap"
            >
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (selectedPreviewId === 'imported') loadImportedDiagram();
                else if (selectedPreviewId) loadSavedDiagram(selectedPreviewId);
              }}
              disabled={!selectedPreviewId}
              className="whitespace-nowrap"
            >
              Load
            </Button>
          </div>
        </div>

        {/* Modal Body: left list and right preview. Only body scrolls. */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: list */}
          <div className="w-1/2 border-r p-4 overflow-y-auto custom-scrollbar">
            {/* Include importedDiagram at the top of the list when present */}
            {(importedDiagram ? [importedDiagram, ...savedDiagrams] : savedDiagrams).length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">
                <p>No saved diagrams found</p>
              </div>
            ) : (
              (importedDiagram ? [importedDiagram, ...savedDiagrams] : savedDiagrams).map((diagram) => (
                <div
                  key={diagram.id}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-colors mb-2 flex items-center justify-between",
                    selectedPreviewId === diagram.id ? "bg-accent/30 border-primary" : "hover:bg-accent"
                  )}
                  onClick={() => setSelectedPreviewId(diagram.id)}
                >
                  <div>
                    <h4 className="font-medium text-sm">{diagram.name}</h4>
                    <p className="text-xs text-muted-foreground">{new Date(diagram.createdAt || Date.now()).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {confirmDeleteId === diagram.id ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteSavedDiagram();
                            if (selectedPreviewId === diagram.id) setSelectedPreviewId(null);
                          }}
                        >
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        {diagram.id !== "imported" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0"
                            title="Delete saved diagram"
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(diagram.id); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: preview */}
          <div className="w-1/2 p-4 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="flex-1 border rounded p-3 bg-muted/10 overflow-auto">
              {selectedPreviewId ? (
                (() => {
                  let item = null as SavedDiagram | null;
                  if (selectedPreviewId === 'imported' && importedDiagram) item = importedDiagram;
                  if (!item) item = savedDiagrams.find((d) => d.id === selectedPreviewId) ?? null;
                  return item ? (
                    <div className="h-full flex flex-col">
                      <div className="mb-4">
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex-1 min-h-0">
                        <MermaidRenderer code={item.mermaid} className="w-full h-full min-h-0" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <p>Diagram not found</p>
                    </div>
                  );
                })()
              ) : (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                  <div>
                    <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select a diagram to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
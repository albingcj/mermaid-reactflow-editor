import React, { useState, useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';
import { AppHeader } from '@/components/AppHeader';
import { FlowDiagram } from '@/features/canvas/FlowDiagram';
import GeminiMermaidGenerator from '@/features/ai/GeminiMermaidGenerator';
import { convertMermaidToReactFlow } from '@/features/diagram/converter';
import { serviceRegistry } from '@/features/services';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui';
import { Sparkles, X } from 'lucide-react';
import type { UseThemeReturn } from '@/types';
import { AI_MODELS } from '@/constants/ai';

interface ArchitectureUIProps {
  appMode?: 'diagram' | 'architecture';
  onToggleMode?: () => void;
  theme: UseThemeReturn;
}

const AWS_ARCHITECTURE_PROMPT_PREFIX = `You are an AWS architecture diagram expert. Generate ONLY Mermaid flowchart syntax for AWS cloud architectures.

CRITICAL RULES:
1. Use ONLY AWS service names (S3, Lambda, EC2, RDS, DynamoDB, API Gateway, CloudFront, VPC, ALB, etc.)
2. Output ONLY raw Mermaid flowchart code - NO explanations, NO markdown fences
3. Use simple node labels with AWS service names
4. Keep it clean and parseable

Example format:
graph TD
  A[User] --> B[CloudFront]
  B --> C[S3]
  B --> D[API Gateway]
  D --> E[Lambda]
  E --> F[DynamoDB]

Now generate an AWS architecture diagram for the following request:

`;

export function ArchitectureUI({ appMode = 'architecture', onToggleMode, theme }: ArchitectureUIProps) {
  // AI settings state
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>(AI_MODELS.GEMINI_2_5_FLASH);
  const [userInput, setUserInput] = useState<string>('');
  
  // Diagram state
  const [flowData, setFlowData] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedMermaid, setGeneratedMermaid] = useState('');

  const flowMethodsRef = useRef<any>(null);

  // Register flow methods
  const registerFlowMethods = useCallback((methods: any) => {
    flowMethodsRef.current = methods;
  }, []);

  // Resolve AWS services and attach icons
  const resolveAWSServices = useCallback((nodes: Node[]): Node[] => {
    return nodes.map(node => {
      const label = node.data?.label || '';
      
      // Try to resolve the service
      const resolved = serviceRegistry.resolveService(label, 'aws');
      
      if (resolved && resolved.score > 0.3) {
        // Service matched! Attach icon and metadata
        return {
          ...node,
          data: {
            ...node.data,
            imageUrl: resolved.iconUrl || '',
            serviceId: resolved.id,
            serviceName: resolved.name,
            category: resolved.category,
            label: label, // Keep original label
          },
        };
      }
      
      // No match, return as-is
      return node;
    });
  }, []);

  // Handle AI generation complete
  const handleAIComplete = useCallback(async (code: string) => {
    setIsGenerating(false);
    setGeneratedMermaid(code);
    
    try {
      // Convert Mermaid to React Flow
      const converted = await convertMermaidToReactFlow(code);
      
      // Resolve AWS services
      const nodesWithServices = resolveAWSServices(converted.nodes);
      
      setFlowData({
        nodes: nodesWithServices,
        edges: converted.edges,
      });
    } catch (err) {
      console.error('Conversion error:', err);
    }
  }, [resolveAWSServices]);

  // Handle AI generation start
  const handleAIStart = useCallback(() => {
    setIsGenerating(true);
  }, []);

  // Handle AI generation stop
  const handleAIStop = useCallback(() => {
    setIsGenerating(false);
  }, []);

  // Handle nodes change
  const handleNodesChange = useCallback((nodes: Node[]) => {
    setFlowData(prev => ({ ...prev, nodes }));
  }, []);

  // Handle edges change
  const handleEdgesChange = useCallback((edges: Edge[]) => {
    setFlowData(prev => ({ ...prev, edges }));
  }, []);

  // Prepend AWS-specific instructions to user input
  const enhancedUserInput = userInput ? `${AWS_ARCHITECTURE_PROMPT_PREFIX}${userInput}` : '';

  return (
    <div className="architecture-ui h-screen w-screen flex flex-col bg-background">
      {/* Reuse the same header with shared theme */}
      <AppHeader
        theme={theme}
        panel={{ 
          visiblePanels: { code: showAIPanel, preview: showPreview, canvas: true },
          togglePanelVisibility: (panel: string) => {
            if (panel === 'code') setShowAIPanel(!showAIPanel);
            if (panel === 'preview') setShowPreview(!showPreview);
          },
          getDefaultPanelSize: () => 33,
          visiblePanelCount: (showAIPanel ? 1 : 0) + (showPreview ? 1 : 0) + 1
        }}
        onLoadDiagram={() => {}}
        onSaveDiagram={() => {}}
        onExportJSON={() => {}}
        onToggleMobileMenu={() => {}}
        isMobileMenuOpen={false}
        appMode={appMode}
        onToggleMode={onToggleMode}
      />
      
      {/* Main Content with Resizable Panels */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* AI Input Panel */}
          {showAIPanel && (
            <>
              <ResizablePanel
                defaultSize={33}
                minSize={20}
                className="border-r bg-card flex flex-col min-h-0"
              >
                <div className="p-2 border-b flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">AWS Architecture AI</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAIPanel(false)}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  <GeminiMermaidGenerator
                    onComplete={handleAIComplete}
                    onStart={handleAIStart}
                    onStop={handleAIStop}
                    apiKey={apiKey}
                    model={model}
                    userInput={enhancedUserInput}
                    onApiKeyChange={setApiKey}
                    onModelChange={setModel}
                    onUserInputChange={(value) => {
                      // Remove the prefix if it exists to get clean user input
                      if (value.startsWith(AWS_ARCHITECTURE_PROMPT_PREFIX)) {
                        setUserInput(value.slice(AWS_ARCHITECTURE_PROMPT_PREFIX.length));
                      } else {
                        setUserInput(value);
                      }
                    }}
                  />
                  
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-medium mb-2">Example Prompts:</h3>
                    <div className="space-y-2">
                      {[
                        'Build a scalable web app with S3, Lambda, and RDS',
                        'Create a serverless API with API Gateway, Lambda, and DynamoDB',
                        'Design a data pipeline with S3, Lambda, and Redshift',
                        'Set up a VPC with public and private subnets, ALB, EC2, and RDS',
                      ].map((example, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="w-full text-left justify-start h-auto py-2 px-3"
                          onClick={() => setUserInput(example)}
                        >
                          <span className="text-xs">{example}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </ResizablePanel>
              {(showPreview || flowData.nodes.length > 0) && <ResizableHandle withHandle />}
            </>
          )}

          {/* Preview Panel (Mermaid Code) */}
          {showPreview && generatedMermaid && (
            <>
              <ResizablePanel
                defaultSize={33}
                minSize={20}
                className="border-r bg-card flex flex-col min-h-0"
              >
                <div className="p-2 border-b flex items-center justify-between bg-muted/30">
                  <span className="font-medium text-sm">Generated Mermaid Code</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(false)}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-auto">
                    {generatedMermaid}
                  </pre>
                </div>
              </ResizablePanel>
              {flowData.nodes.length > 0 && <ResizableHandle withHandle />}
            </>
          )}

          {/* Canvas Panel */}
          {flowData.nodes.length > 0 ? (
            <ResizablePanel
              defaultSize={showAIPanel && showPreview ? 34 : showAIPanel || showPreview ? 67 : 100}
              minSize={30}
              className="flex flex-col min-h-0"
            >
              <div className="p-2 border-b flex items-center justify-between bg-muted/30">
                <span className="font-medium text-sm">Architecture Diagram</span>
                <div className="flex gap-2">
                  {!showPreview && generatedMermaid && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(true)}
                    >
                      Show Code
                    </Button>
                  )}
                  {!showAIPanel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAIPanel(true)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Show AI Panel
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <FlowDiagram
                  nodes={flowData.nodes}
                  edges={flowData.edges}
                  onNodesChange={handleNodesChange}
                  onEdgesChange={handleEdgesChange}
                  onRegisterMethods={registerFlowMethods}
                  interactive={!isGenerating}
                  theme={theme.effectiveTheme}
                />
              </div>
            </ResizablePanel>
          ) : (
            <ResizablePanel
              defaultSize={showAIPanel ? 67 : 100}
              minSize={30}
              className="flex flex-col min-h-0"
            >
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md px-4">
                  <div className="text-6xl">🏗️</div>
                  <h2 className="text-xl font-semibold">AWS Architecture Designer</h2>
                  <p className="text-muted-foreground">
                    Describe your AWS architecture in natural language, and AI will generate an interactive diagram with official AWS service icons.
                  </p>
                  {!showAIPanel && (
                    <div className="pt-4">
                      <Button onClick={() => setShowAIPanel(true)} size="lg">
                        <Sparkles className="h-5 w-5 mr-2" />
                        Get Started
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

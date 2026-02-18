import React, { useState, useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';
import { AppHeader } from '@/components/AppHeader';
import { FlowDiagram } from '@/features/canvas/FlowDiagram';
import GeminiMermaidGenerator from '@/features/ai/GeminiMermaidGenerator';
import { convertMermaidToReactFlow } from '@/features/diagram/converter';
import { serviceRegistry } from '@/features/services';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import type { UseThemeReturn } from '@/types';

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
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [userInput, setUserInput] = useState('');
  
  // Diagram state
  const [flowData, setFlowData] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);

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
          visiblePanels: { code: false, preview: false, canvas: false },
          togglePanelVisibility: () => {},
          getDefaultPanelSize: () => 50,
          visiblePanelCount: 0
        }}
        onLoadDiagram={() => {}}
        onSaveDiagram={() => {}}
        onExportJSON={() => {}}
        onToggleMobileMenu={() => {}}
        isMobileMenuOpen={false}
        appMode={appMode}
        onToggleMode={onToggleMode}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* AI Input Panel - Reuse GeminiMermaidGenerator */}
        {showAIPanel && (
          <div className="w-96 border-r bg-card overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AWS Architecture AI
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAIPanel(false)}
              >
                Hide
              </Button>
            </div>
            
            <div className="p-4">
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
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col">
          {!showAIPanel && (
            <div className="p-2 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIPanel(true)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Show AI Panel
              </Button>
            </div>
          )}

          {flowData.nodes.length > 0 ? (
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
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md px-4">
                <div className="text-6xl">🏗️</div>
                <h2 className="text-xl font-semibold">AWS Architecture Designer</h2>
                <p className="text-muted-foreground">
                  Describe your AWS architecture in natural language, and AI will generate an interactive diagram with official AWS service icons.
                </p>
                <div className="pt-4">
                  <Button onClick={() => setShowAIPanel(true)} size="lg">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Get Started
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

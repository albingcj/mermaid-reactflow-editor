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
import { AWS_ARCHITECTURE_PROMPT_PREFIX } from '@/constants/prompts';
import { generateClarifyingQuestions, type ClarifyingQuestion } from '@/features/ai/clarify';
import { ClarifyingQuestionsInline, type ClarifyingAnswers } from '@/components/ClarifyingQuestionsDialog';

interface ArchitectureUIProps {
  appMode?: 'diagram' | 'architecture';
  onToggleMode?: () => void;
  theme: UseThemeReturn;
}

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
  // True while a generation is in flight but no parseable node has streamed
  // in yet. Drives the canvas "generating your diagram..." placeholder so the
  // user isn't staring at an empty/unchanged screen while the model streams
  // its first tokens (which can take a few seconds).
  const [awaitingFirstNode, setAwaitingFirstNode] = useState(false);

  // Clarifying-questions state: before generating, we ask the model whether
  // the request is specific enough to design a properly layered architecture.
  // If not, we show a small AI-generated multiple-choice wizard and fold the
  // answers back into the prompt.
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [showClarifyQuestions, setShowClarifyQuestions] = useState(false);
  const [isCheckingClarity, setIsCheckingClarity] = useState(false);
  // Resolves the in-flight `beforeGenerate` promise once the user answers,
  // skips, or cancels the clarifying-questions flow.
  const clarifyResolveRef = useRef<((result: string | null) => void) | null>(null);
  const pendingUserInputRef = useRef<string>('');

  const flowMethodsRef = useRef<any>(null);

  // Register flow methods
  const registerFlowMethods = useCallback((methods: any) => {
    flowMethodsRef.current = methods;
  }, []);

  // Resolves a node's label (e.g. "Route 53") to an AWS service icon URL.
  // Passed into `convertMermaidToReactFlow` so icon resolution happens BEFORE
  // layout runs, letting the layout engine size these as compact icon nodes
  // from the start instead of sizing them for a text label and only
  // discovering afterward that they should have been icons (which is what
  // previously caused icon boxes to be oversized relative to the icon itself).
  const resolveNodeImageUrl = useCallback((label: string): string | null => {
    const resolved = serviceRegistry.resolveService(label, 'aws');
    if (resolved && resolved.score > 0.3) {
      return resolved.iconUrl || null;
    }
    return null;
  }, []);

  // Handle AI generation complete
  const handleAIComplete = useCallback(async (code: string) => {
    setIsGenerating(false);
    setGeneratedMermaid(code);
    
    try {
      const converted = await convertMermaidToReactFlow(code, resolveNodeImageUrl);
      setFlowData(converted);
      if (converted.nodes.length > 0) setAwaitingFirstNode(false);
    } catch (err) {
      console.error('Conversion error:', err);
    } finally {
      // Whether conversion succeeded or not, generation has finished — stop
      // showing the "generating" placeholder either way.
      setAwaitingFirstNode(false);
    }
  }, [resolveNodeImageUrl]);

  // Handle AI streaming chunks
  const handleAIChunk = useCallback(async (partial: string) => {
    setGeneratedMermaid(partial);
    
    try {
      // Convert partial Mermaid to React Flow for live preview
      const converted = await convertMermaidToReactFlow(partial, resolveNodeImageUrl);
      setFlowData(converted);
      // As soon as the streaming partial produces at least one renderable
      // node, drop the "generating" placeholder in favor of the live canvas
      // so the user sees the diagram build up in real time.
      if (converted.nodes.length > 0) setAwaitingFirstNode(false);
    } catch (err) {
      // Silently fail during streaming - partial code might not be valid yet
      console.debug('Streaming conversion error (expected during partial updates):', err);
    }
  }, [resolveNodeImageUrl]);

  // Runs before generation starts: ask the model if the request needs
  // clarification, and if so, pause generation and show the wizard. Returns
  // the (possibly answer-augmented) prompt to proceed with, or null to cancel.
  const handleBeforeGenerate = useCallback(
    async (input: string, key: string, mdl: string): Promise<string | null> => {
      setIsCheckingClarity(true);
      try {
        const questions = await generateClarifyingQuestions(key, mdl, input);
        setIsCheckingClarity(false);

        if (questions.length === 0) {
          return input;
        }

        pendingUserInputRef.current = input;
        setClarifyingQuestions(questions);
        setShowClarifyQuestions(true);

        // Suspend here until the dialog resolves (answers submitted, skipped, or cancelled).
        return new Promise<string | null>((resolve) => {
          clarifyResolveRef.current = resolve;
        });
      } catch (err) {
        // Never block generation because the clarifying step failed.
        setIsCheckingClarity(false);
        console.error('Clarifying-questions check failed, proceeding without it:', err);
        return input;
      }
    },
    []
  );

  const closeClarifyQuestions = useCallback(() => {
    setShowClarifyQuestions(false);
    setClarifyingQuestions([]);
  }, []);

  const handleClarifyComplete = useCallback((answers: ClarifyingAnswers) => {
    const qa = clarifyingQuestions
      .map((q) => {
        const selected = answers[q.id];
        if (!selected || selected.length === 0) return null;
        return `${q.question} ${selected.join(', ')}`;
      })
      .filter(Boolean)
      .join('\n');

    const augmented = qa
      ? `${pendingUserInputRef.current}\n\nAdditional context:\n${qa}`
      : pendingUserInputRef.current;

    closeClarifyQuestions();
    clarifyResolveRef.current?.(augmented);
    clarifyResolveRef.current = null;
  }, [clarifyingQuestions, closeClarifyQuestions]);

  const handleClarifySkip = useCallback(() => {
    const input = pendingUserInputRef.current;
    closeClarifyQuestions();
    clarifyResolveRef.current?.(input);
    clarifyResolveRef.current = null;
  }, [closeClarifyQuestions]);

  const handleClarifyBackToPrompt = useCallback(() => {
    closeClarifyQuestions();
    // Cancel generation entirely so the user can edit their prompt.
    clarifyResolveRef.current?.(null);
    clarifyResolveRef.current = null;
  }, [closeClarifyQuestions]);

  // Handle AI generation start
  const handleAIStart = useCallback(() => {
    setIsGenerating(true);
    // Clear any previous diagram and show the "generating" placeholder until
    // the first node from this new generation streams in.
    setFlowData({ nodes: [], edges: [] });
    setGeneratedMermaid('');
    setAwaitingFirstNode(true);
  }, []);

  // Handle AI generation stop
  const handleAIStop = useCallback(() => {
    setIsGenerating(false);
    setAwaitingFirstNode(false);
  }, []);

  // Handle nodes change
  const handleNodesChange = useCallback((nodes: Node[]) => {
    setFlowData(prev => ({ ...prev, nodes }));
  }, []);

  // Handle edges change
  const handleEdgesChange = useCallback((edges: Edge[]) => {
    setFlowData(prev => ({ ...prev, edges }));
  }, []);

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
        modeToggleDisabled={isGenerating}
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
                    disabled={isGenerating}
                    className="h-7 w-7 p-0 disabled:opacity-40"
                    title={isGenerating ? "Wait for generation to finish" : "Hide panel"}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {/* Conditionally show either the clarifying questions or the input */}
                  {showClarifyQuestions ? (
                    <ClarifyingQuestionsInline
                      questions={clarifyingQuestions}
                      onComplete={handleClarifyComplete}
                      onSkip={handleClarifySkip}
                      onBackToPrompt={handleClarifyBackToPrompt}
                    />
                  ) : (
                    <>
                      <GeminiMermaidGenerator
                        onComplete={handleAIComplete}
                        onChunk={handleAIChunk}
                        onStart={handleAIStart}
                        onStop={handleAIStop}
                        apiKey={apiKey}
                        model={model}
                        userInput={userInput}
                        onApiKeyChange={setApiKey}
                        onModelChange={setModel}
                        onUserInputChange={setUserInput}
                        beforeGenerate={handleBeforeGenerate}
                        transformPrompt={(input) => `${AWS_ARCHITECTURE_PROMPT_PREFIX}${input}`}
                        useFewShotExamples={false}
                      />
                      {isCheckingClarity && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                          Analyzing your request...
                        </div>
                      )}

                      {/* Example prompts section */}
                      <div className="pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Try an example:</p>
                        <div className="flex flex-col gap-1.5">
                          {[
                            'Build a scalable web app with S3, Lambda, and RDS',
                            'Create a serverless API with API Gateway, Lambda, and DynamoDB',
                            'Design a data pipeline with Kinesis, Lambda, S3, and Redshift',
                            'Set up a VPC with public and private subnets, ALB, EC2, and RDS',
                          ].map((example, i) => (
                            <button
                              key={i}
                              type="button"
                              disabled={isGenerating || isCheckingClarity}
                              className="w-full text-left text-xs px-3 py-2 rounded-md border border-border hover:bg-accent/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              onClick={() => setUserInput(example)}
                            >
                              {example}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ResizablePanel>
              {(showPreview || true) && <ResizableHandle withHandle />}
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
              <ResizableHandle withHandle />
            </>
          )}

          {/* Canvas Panel */}
          <ResizablePanel
            defaultSize={showAIPanel && showPreview ? 34 : showAIPanel || showPreview ? 67 : 100}
            minSize={30}
            className="flex flex-col min-h-0"
          >
            {flowData.nodes.length > 0 ? (
              <>
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
              </>
            ) : awaitingFirstNode ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md px-4">
                  <div className="relative mx-auto h-14 w-14">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">Designing your architecture...</h2>
                  <p className="text-sm text-muted-foreground">
                    The AI is analyzing your request and laying out the diagram. This can take a few seconds — the canvas will update live as services start appearing.
                  </p>
                </div>
              </div>
            ) : (
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
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

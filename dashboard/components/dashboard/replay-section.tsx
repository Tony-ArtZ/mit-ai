"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  RefreshCw,
  GitBranch,
  Pause,
  SkipForward,
  SkipBack,
  Clock,
  User,
  Bot,
  Wrench,
  AlertCircle,
  Database,
  Zap,
} from "lucide-react";
import { generateCounterfactualReplay } from "@/actions/generateReplay";
import type { DatabaseLogEntry } from "@/types/logger";

interface ReplaySectionProps {
  logs: DatabaseLogEntry[];
  uniqueSessions: string[];
}

interface CounterfactualResult {
  success: boolean;
  counterfactualResponse?: string;
  originalResponse?: string | null;
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
    systemPromptModification?: string;
    stepModifications?: {
      [stepNumber: number]: {
        type:
          | "user_input"
          | "tool_output"
          | "response"
          | "prompt"
          | "tool_input"
          | "tool_result";
        value: string | object;
      };
    };
  };
  messageCount?: number;
  error?: string;
}

export default function ReplaySection({
  logs,
  uniqueSessions,
}: ReplaySectionProps) {
  const [replaySession, setReplaySession] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms between steps
  const [counterfactualParams, setCounterfactualParams] = useState({
    temperature: 0.7,
    maxTokens: 2048,
    model: "gpt-4o",
    systemPromptModification: "",
  });
  const [stepModifications, setStepModifications] = useState<{
    [stepNumber: number]: {
      type:
        | "user_input"
        | "tool_output"
        | "response"
        | "prompt"
        | "tool_input"
        | "tool_result";
      value: string;
    };
  }>({});
  const [counterfactualResult, setCounterfactualResult] =
    useState<CounterfactualResult | null>(null);
  const [isGeneratingCounterfactual, setIsGeneratingCounterfactual] =
    useState(false);

  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  const sessionLogs = replaySession
    ? logs
        .filter((log) => log.session_id === replaySession)
        .sort((a, b) => a.sequence_number - b.sequence_number)
    : [];

  // Get the original model from the session logs
  const originalModel =
    sessionLogs.length > 0
      ? sessionLogs.find((log) => log.event_type === "agent_init" && log.model)
          ?.model ||
        sessionLogs.find((log) => log.model)?.model ||
        "gpt-4o"
      : "gpt-4o";

  // Update model when session changes
  useEffect(() => {
    if (replaySession && sessionLogs.length > 0) {
      setCounterfactualParams((prev) => ({
        ...prev,
        model: originalModel,
      }));
    }
  }, [replaySession, sessionLogs.length, originalModel]);

  // Auto-play functionality with proper cleanup
  useEffect(() => {
    if (isPlaying && currentStep < sessionLogs.length - 1) {
      autoplayRef.current = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, playbackSpeed);
    } else if (currentStep >= sessionLogs.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (autoplayRef.current) {
        clearTimeout(autoplayRef.current);
      }
    };
  }, [isPlaying, currentStep, sessionLogs.length, playbackSpeed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoplayRef.current) {
        clearTimeout(autoplayRef.current);
      }
    };
  }, []);

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setCounterfactualResult(null);
    if (autoplayRef.current) {
      clearTimeout(autoplayRef.current);
    }
  };

  const handleNextStep = () => {
    if (currentStep < sessionLogs.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const toggleAutoplay = () => {
    setIsPlaying(!isPlaying);
  };

  const getCurrentStepModifiableValue = () => {
    const currentLog = sessionLogs[currentStep];
    if (!currentLog) return null;

    switch (currentLog.event_type) {
      case "user_input":
        return {
          type: "user_input" as const,
          value: currentLog.user_input || "",
        };
      case "tool_call":
        // For tool calls, we need to determine if we're modifying input or output
        // Default to output for backward compatibility, but allow switching
        const currentModType = stepModifications[currentStep]?.type;
        if (currentModType === "tool_input") {
          return {
            type: "tool_input" as const,
            value: JSON.stringify(currentLog.tool_input, null, 2) || "{}",
          };
        } else {
          return {
            type: "tool_output" as const,
            value: JSON.stringify(currentLog.tool_output, null, 2) || "{}",
          };
        }
      case "response":
      case "agent_response":
        return { type: "response" as const, value: currentLog.response || "" };
      case "prompt":
        return { type: "prompt" as const, value: currentLog.prompt || "" };
      default:
        return null;
    }
  };

  const getModificationValue = () => {
    return (
      stepModifications[currentStep]?.value ||
      getCurrentStepModifiableValue()?.value ||
      ""
    );
  };

  const setModificationValue = (value: string) => {
    const modifiableData = getCurrentStepModifiableValue();
    if (!modifiableData) return;

    setStepModifications((prev) => ({
      ...prev,
      [currentStep]: {
        type: modifiableData.type,
        value,
      },
    }));
  };

  const clearStepModification = () => {
    setStepModifications((prev) => {
      const newMods = { ...prev };
      delete newMods[currentStep];
      return newMods;
    });
  };

  const handleCounterfactualReplay = async () => {
    if (!replaySession || currentStep === 0) return;

    setIsGeneratingCounterfactual(true);
    try {
      const result = await generateCounterfactualReplay(
        replaySession,
        currentStep,
        {
          ...counterfactualParams,
          stepModifications,
        }
      );
      setCounterfactualResult(result);
    } catch (error) {
      setCounterfactualResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setIsGeneratingCounterfactual(false);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "user_input":
        return <User className="h-4 w-4 text-blue-500" />;
      case "agent_response":
      case "response":
        return <Bot className="h-4 w-4 text-green-500" />;
      case "tool_call":
        return <Wrench className="h-4 w-4 text-purple-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "retrieval":
        return <Database className="h-4 w-4 text-orange-500" />;
      case "agent_init":
        return <Zap className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType) {
      case "user_input":
        return "bg-blue-100 text-blue-800";
      case "agent_response":
      case "response":
        return "bg-green-100 text-green-800";
      case "tool_call":
        return "bg-purple-100 text-purple-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "retrieval":
        return "bg-orange-100 text-orange-800";
      case "agent_init":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTimestamp = (timestamp: Date | null) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleTimeString();
  };

  const currentLog = sessionLogs[currentStep];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Session Replay
          </CardTitle>
          <CardDescription>
            Replay sessions step by step with detailed information and
            counterfactual analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={replaySession} onValueChange={setReplaySession}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select session to replay" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSessions.map((sessionId) => (
                    <SelectItem key={sessionId} value={sessionId}>
                      Session {sessionId.slice(0, 8)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button disabled={!replaySession} onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            {replaySession && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">
                    Replay: Session {replaySession.slice(0, 8)}...
                  </CardTitle>
                  <CardDescription>
                    Step through each event in chronological order (
                    {sessionLogs.length} total events)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePrevStep}
                        disabled={currentStep === 0}
                      >
                        <SkipBack className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        onClick={toggleAutoplay}
                        disabled={currentStep >= sessionLogs.length - 1}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Auto Play
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleNextStep}
                        disabled={currentStep >= sessionLogs.length - 1}
                      >
                        <SkipForward className="h-4 w-4 mr-2" />
                        Next
                      </Button>
                      <Select
                        value={playbackSpeed.toString()}
                        onValueChange={(value) =>
                          setPlaybackSpeed(Number(value))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="500">0.5x</SelectItem>
                          <SelectItem value="1000">1x</SelectItem>
                          <SelectItem value="2000">2x</SelectItem>
                          <SelectItem value="3000">3x</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            Step {currentStep + 1} of {sessionLogs.length}
                          </p>
                          {stepModifications[currentStep] && (
                            <Badge variant="outline" className="text-xs">
                              Modified
                            </Badge>
                          )}
                        </div>
                        <div className="w-full max-w-md mx-4">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${
                                  ((currentStep + 1) / sessionLogs.length) * 100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                        {currentLog && (
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(currentLog.timestamp)}
                          </p>
                        )}
                      </div>

                      {currentLog ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            {getEventIcon(currentLog.event_type)}
                            <Badge
                              className={getEventBadgeColor(
                                currentLog.event_type
                              )}
                            >
                              {currentLog.event_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              #{currentLog.sequence_number}
                            </span>
                            {currentLog.call_id && (
                              <span className="text-xs text-muted-foreground">
                                Call: {currentLog.call_id.slice(0, 8)}...
                              </span>
                            )}
                            {currentLog.elapsed_time && (
                              <span className="text-xs text-muted-foreground">
                                {currentLog.elapsed_time.toFixed(2)}s
                              </span>
                            )}
                          </div>

                          <Separator />

                          <div className="space-y-3">
                            {currentLog.agent_type && (
                              <div>
                                <span className="text-sm font-medium">
                                  Agent Type:
                                </span>
                                <span className="ml-2 text-sm">
                                  {currentLog.agent_type}
                                </span>
                              </div>
                            )}

                            {currentLog.model && (
                              <div>
                                <span className="text-sm font-medium">
                                  Model:
                                </span>
                                <span className="ml-2 text-sm">
                                  {currentLog.model}
                                </span>
                              </div>
                            )}

                            {currentLog.user_input && (
                              <div>
                                <span className="text-sm font-medium">
                                  User Input:
                                </span>
                                <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                                  {currentLog.user_input}
                                </div>
                              </div>
                            )}

                            {currentLog.prompt && (
                              <div>
                                <span className="text-sm font-medium">
                                  Prompt:
                                </span>
                                <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-sm max-h-32 overflow-y-auto">
                                  {currentLog.prompt}
                                </div>
                              </div>
                            )}

                            {currentLog.response && (
                              <div>
                                <span className="text-sm font-medium">
                                  Response:
                                </span>
                                <div className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm max-h-32 overflow-y-auto">
                                  {currentLog.response}
                                </div>
                              </div>
                            )}

                            {currentLog.tool_name && (
                              <div>
                                <span className="text-sm font-medium">
                                  Tool:
                                </span>
                                <span className="ml-2 text-sm">
                                  {currentLog.tool_name}
                                </span>
                                {currentLog.tool_input != null && (
                                  <div className="mt-1">
                                    <span className="text-xs font-medium">
                                      Input:
                                    </span>
                                    <pre className="mt-1 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs max-h-24 overflow-y-auto">
                                      {typeof currentLog.tool_input === "string"
                                        ? currentLog.tool_input
                                        : JSON.stringify(
                                            currentLog.tool_input,
                                            null,
                                            2
                                          )}
                                    </pre>
                                  </div>
                                )}
                                {currentLog.tool_output != null && (
                                  <div className="mt-1">
                                    <span className="text-xs font-medium">
                                      Output:
                                    </span>
                                    <pre className="mt-1 p-2 bg-purple-50 rounded text-xs max-h-24 overflow-y-auto">
                                      {typeof currentLog.tool_output ===
                                      "string"
                                        ? currentLog.tool_output
                                        : JSON.stringify(
                                            currentLog.tool_output,
                                            null,
                                            2
                                          )}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}

                            {currentLog.query && (
                              <div>
                                <span className="text-sm font-medium">
                                  Query:
                                </span>
                                <div className="mt-1 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-sm">
                                  {currentLog.query}
                                </div>
                                {currentLog.documents_count && (
                                  <span className="text-xs text-muted-foreground">
                                    Retrieved {currentLog.documents_count}{" "}
                                    documents
                                  </span>
                                )}
                              </div>
                            )}

                            {currentLog.action && (
                              <div>
                                <span className="text-sm font-medium">
                                  Action:
                                </span>
                                <div className="mt-1 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                                  {currentLog.action}
                                </div>
                                {currentLog.reasoning && (
                                  <div className="mt-1">
                                    <span className="text-xs font-medium">
                                      Reasoning:
                                    </span>
                                    <div className="mt-1 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
                                      {currentLog.reasoning}
                                    </div>
                                  </div>
                                )}
                                {currentLog.observation && (
                                  <div className="mt-1">
                                    <span className="text-xs font-medium">
                                      Observation:
                                    </span>
                                    <div className="mt-1 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
                                      {currentLog.observation}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {currentLog.error && (
                              <div>
                                <span className="text-sm font-medium text-red-600">
                                  Error:
                                </span>
                                <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300">
                                  {currentLog.error}
                                </div>
                                {currentLog.error_context != null && (
                                  <pre className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs max-h-24 overflow-y-auto">
                                    {typeof currentLog.error_context ===
                                    "string"
                                      ? currentLog.error_context
                                      : JSON.stringify(
                                          currentLog.error_context,
                                          null,
                                          2
                                        )}
                                  </pre>
                                )}
                              </div>
                            )}

                            {currentLog.llm_usage != null && (
                              <div>
                                <span className="text-sm font-medium">
                                  LLM Usage:
                                </span>
                                <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-xs">
                                  {typeof currentLog.llm_usage === "string"
                                    ? currentLog.llm_usage
                                    : JSON.stringify(
                                        currentLog.llm_usage,
                                        null,
                                        2
                                      )}
                                </pre>
                              </div>
                            )}

                            {currentLog.custom_data != null && (
                              <div>
                                <span className="text-sm font-medium">
                                  Custom Data:
                                </span>
                                <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-xs max-h-24 overflow-y-auto">
                                  {typeof currentLog.custom_data === "string"
                                    ? currentLog.custom_data
                                    : JSON.stringify(
                                        currentLog.custom_data,
                                        null,
                                        2
                                      )}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">
                            Ready to start replay...
                          </p>
                        </div>
                      )}
                    </div>

                    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
                      <CardHeader>
                        <CardTitle className="text-base text-orange-800 dark:text-orange-200">
                          <GitBranch className="h-4 w-4 inline mr-2" />
                          Counterfactual Replay
                        </CardTitle>
                        <CardDescription className="text-orange-700 dark:text-orange-300">
                          Modify parameters and compare outcomes at current step
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">
                                Model
                              </label>
                              <Select
                                value={counterfactualParams.model}
                                onValueChange={(value) =>
                                  setCounterfactualParams((prev) => ({
                                    ...prev,
                                    model: value,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="gemini-2.5-flash">
                                    Gemini 2.5 Flash
                                  </SelectItem>
                                  <SelectItem value="gpt-4o">
                                    GPT-4 Turbo
                                  </SelectItem>
                                  <SelectItem value="gpt-3.5-turbo">
                                    GPT-3.5 Turbo
                                  </SelectItem>
                                  <SelectItem value="gemini-1.5-pro">
                                    Gemini 1.5 Pro
                                  </SelectItem>
                                  <SelectItem value="gemini-1.5-flash">
                                    Gemini 1.5 Flash
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">
                                Temperature
                              </label>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="2"
                                value={counterfactualParams.temperature}
                                onChange={(e) =>
                                  setCounterfactualParams((prev) => ({
                                    ...prev,
                                    temperature: parseFloat(e.target.value),
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              Max Tokens
                            </label>
                            <Input
                              type="number"
                              value={counterfactualParams.maxTokens}
                              onChange={(e) =>
                                setCounterfactualParams((prev) => ({
                                  ...prev,
                                  maxTokens: parseInt(e.target.value),
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              System Prompt Modification
                            </label>
                            <Input
                              placeholder="Additional instructions or modifications..."
                              value={
                                counterfactualParams.systemPromptModification
                              }
                              onChange={(e) =>
                                setCounterfactualParams((prev) => ({
                                  ...prev,
                                  systemPromptModification: e.target.value,
                                }))
                              }
                            />
                          </div>

                          {getCurrentStepModifiableValue() && (
                            <div className="border-t pt-4">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium">
                                  Modify Current Step (
                                  {getCurrentStepModifiableValue()
                                    ?.type.replace("_", " ")
                                    .toUpperCase()}
                                  )
                                </label>
                                {stepModifications[currentStep] && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={clearStepModification}
                                  >
                                    Clear
                                  </Button>
                                )}
                              </div>

                              {/* Tool call selection for input vs output */}
                              {sessionLogs[currentStep]?.event_type ===
                                "tool_call" && (
                                <div className="mb-3">
                                  <label className="text-xs font-medium text-muted-foreground">
                                    Modification Target:
                                  </label>
                                  <div className="flex gap-2 mt-1">
                                    <Button
                                      size="sm"
                                      variant={
                                        getCurrentStepModifiableValue()
                                          ?.type === "tool_input"
                                          ? "default"
                                          : "outline"
                                      }
                                      onClick={() => {
                                        const currentLog =
                                          sessionLogs[currentStep];
                                        setStepModifications((prev) => ({
                                          ...prev,
                                          [currentStep]: {
                                            type: "tool_input",
                                            value:
                                              JSON.stringify(
                                                currentLog.tool_input,
                                                null,
                                                2
                                              ) || "{}",
                                          },
                                        }));
                                      }}
                                    >
                                      Tool Input
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={
                                        getCurrentStepModifiableValue()
                                          ?.type === "tool_output"
                                          ? "default"
                                          : "outline"
                                      }
                                      onClick={() => {
                                        const currentLog =
                                          sessionLogs[currentStep];
                                        setStepModifications((prev) => ({
                                          ...prev,
                                          [currentStep]: {
                                            type: "tool_output",
                                            value:
                                              JSON.stringify(
                                                currentLog.tool_output,
                                                null,
                                                2
                                              ) || "{}",
                                          },
                                        }));
                                      }}
                                    >
                                      Tool Output
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {getCurrentStepModifiableValue()?.type ===
                                "tool_output" ||
                              getCurrentStepModifiableValue()?.type ===
                                "tool_input" ? (
                                <textarea
                                  className="w-full p-2 border rounded text-sm font-mono"
                                  rows={4}
                                  placeholder={`Modify ${getCurrentStepModifiableValue()?.type.replace(
                                    "_",
                                    " "
                                  )} (JSON format)...`}
                                  value={getModificationValue()}
                                  onChange={(e) =>
                                    setModificationValue(e.target.value)
                                  }
                                />
                              ) : (
                                <Input
                                  placeholder={`Modify ${getCurrentStepModifiableValue()?.type.replace(
                                    "_",
                                    " "
                                  )}...`}
                                  value={getModificationValue()}
                                  onChange={(e) =>
                                    setModificationValue(e.target.value)
                                  }
                                />
                              )}

                              <p className="text-xs text-muted-foreground mt-1">
                                This will change the value for this specific
                                step and affect subsequent AI responses.
                              </p>
                            </div>
                          )}

                          <Button
                            onClick={handleCounterfactualReplay}
                            disabled={
                              !replaySession ||
                              currentStep === 0 ||
                              isGeneratingCounterfactual
                            }
                            className="w-full"
                          >
                            {isGeneratingCounterfactual ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <GitBranch className="h-4 w-4 mr-2" />
                                Run Counterfactual Replay
                              </>
                            )}
                          </Button>

                          {counterfactualResult && (
                            <div className="mt-4 space-y-3">
                              <Separator />
                              <div className="text-sm font-medium">
                                Results Comparison
                              </div>

                              {counterfactualResult.success ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Original Response
                                      </div>
                                      <div className="p-2 bg-white dark:bg-gray-800 rounded border text-sm max-h-32 overflow-y-auto">
                                        {counterfactualResult.originalResponse ||
                                          "No original response found"}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Counterfactual Response
                                      </div>
                                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border text-sm max-h-32 overflow-y-auto">
                                        {
                                          counterfactualResult.counterfactualResponse
                                        }
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Generated from{" "}
                                    {counterfactualResult.messageCount} messages
                                    using {counterfactualParams.model}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300">
                                  Error: {counterfactualResult.error}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

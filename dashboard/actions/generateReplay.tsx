"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { logEntries } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import type { DatabaseLogEntry } from "@/types/logger";
import db from "@/db";

interface CounterfactualParams {
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
}

interface ReplayMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateCounterfactualReplay(
  sessionId: string,
  currentStep: number,
  params: CounterfactualParams
) {
  try {
    // Get all logs up to the current step
    const sessionLogs = await db
      .select()
      .from(logEntries)
      .where(
        and(
          eq(logEntries.session_id, sessionId),
          lte(logEntries.sequence_number, currentStep)
        )
      )
      .orderBy(logEntries.sequence_number);

    // Convert logs to message format
    let messages = convertLogsToMessages(
      sessionLogs,
      params.systemPromptModification,
      params.stepModifications
    );

    console.log("Raw session logs count:", sessionLogs.length);
    console.log(
      "Session logs sample:",
      sessionLogs.slice(0, 3).map((log) => ({
        event_type: log.event_type,
        user_input: log.user_input,
        response: log.response,
        prompt: log.prompt,
        tool_name: log.tool_name,
      }))
    );
    console.log("Converted messages count:", messages.length);

    // Ensure we have at least one message with valid content to avoid empty content error
    if (messages.length === 0) {
      console.log("No messages found, adding default conversation");
      // Add a default system message if no valid messages exist
      messages.push({
        role: "system",
        content: "You are a helpful AI assistant.",
      });

      // Add a user message to have a conversation
      messages.push({
        role: "user",
        content: "Please provide a helpful response based on the context.",
      });
    }

    // Ensure Gemini has at least one user message (required by the API)
    const hasUserMessage = messages.some((msg) => msg.role === "user");
    if (!hasUserMessage) {
      console.log("No user message found, adding one for Gemini compatibility");
      messages.push({
        role: "user",
        content: "Please continue the conversation based on the context above.",
      });
    }

    console.log(
      "Messages to be sent to AI:",
      messages.map((m) => ({
        role: m.role,
        contentLength: m.content?.length || 0,
        contentPreview: m.content?.substring(0, 100) + "...",
      }))
    );

    // Determine which model to use based on the original logs or params
    const modelProvider = getModelProvider(sessionLogs, params.model);
    console.log("Using model provider:", modelProvider);

    // Additional validation for Gemini models
    const isGeminiModel =
      params.model?.includes("gemini") ||
      sessionLogs.some((log) => log.model?.includes("gemini"));

    if (isGeminiModel) {
      console.log(
        "Gemini model detected - modifying for counterfactual analysis"
      );

      // For counterfactual analysis, we need to restructure the conversation
      // Convert the conversation into a single user message that asks for analysis
      const conversationContext = messages
        .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join("\n\n");

      // Create a new conversation structure for counterfactual analysis
      messages = [
        {
          role: "user",
          content: `Please analyze this conversation and provide a counterfactual response - how could this interaction have gone differently or better?

ORIGINAL CONVERSATION:
${conversationContext}

Please provide an alternative response or approach that could have been taken in this situation. Focus on being helpful and constructive.`,
        },
      ];

      console.log(
        "Restructured conversation for Gemini counterfactual analysis"
      );
    }

    console.log(
      "Final messages before AI call:",
      JSON.stringify(messages, null, 2)
    );

    // Generate counterfactual response
    const { text } = await generateText({
      model: modelProvider,
      messages,
      temperature: params.temperature || 0.7,
    });

    // Get the original response for comparison
    const originalLog = sessionLogs.find(
      (log) =>
        log.sequence_number === currentStep &&
        (log.event_type === "response" || log.event_type === "agent_response")
    );

    return {
      success: true,
      counterfactualResponse: text,
      originalResponse: originalLog?.response || null,
      parameters: params,
      messageCount: messages.length,
    };
  } catch (error) {
    console.error("Error generating counterfactual replay:", error);

    // Provide more specific error messages
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage =
          "API key error. Please check your environment variables.";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

function convertLogsToMessages(
  logs: DatabaseLogEntry[],
  systemPromptModification?: string,
  stepModifications?: {
    [stepNumber: number]: { type: string; value: string | object };
  }
): ReplayMessage[] {
  const messages: ReplayMessage[] = [];

  console.log("Processing logs:", logs.length);

  // Add system message if there's a modification
  if (systemPromptModification?.trim()) {
    messages.push({
      role: "system",
      content: systemPromptModification.trim(),
    });
    console.log("Added system prompt modification");
  }

  // Process logs in sequence
  for (const log of logs) {
    console.log(`Processing log ${log.sequence_number}: ${log.event_type}`);

    // Check if this step has modifications
    const modification = stepModifications?.[log.sequence_number];

    switch (log.event_type) {
      case "agent_init":
        if (!systemPromptModification?.trim()) {
          const systemContent = `You are a ${
            log.agent_type || "assistant"
          } agent with access to ${
            log.tools_count || 0
          } tools. Maximum iterations: ${log.max_iterations || 10}`;
          messages.push({
            role: "system",
            content: systemContent,
          });
          console.log("Added agent_init system message");
        }
        break;

      case "user_input":
        console.log("User input:", log.user_input);
        if (log.user_input?.trim()) {
          const content =
            modification && modification.type === "user_input"
              ? String(modification.value).trim()
              : log.user_input.trim();
          if (content) {
            messages.push({
              role: "user",
              content,
            });
            console.log("Added user message");
          }
        }
        break;

      case "prompt":
        console.log("Prompt:", log.prompt);
        if (
          log.prompt?.trim() &&
          !messages.some((m) => m.content === log.prompt?.trim())
        ) {
          const content =
            modification && modification.type === "prompt"
              ? String(modification.value).trim()
              : log.prompt.trim();
          if (content) {
            messages.push({
              role: "user",
              content,
            });
            console.log("Added prompt message");
          }
        }
        break;

      case "response":
      case "agent_response":
        console.log("Response:", log.response);
        if (log.response?.trim()) {
          const content =
            modification && modification.type === "response"
              ? String(modification.value).trim()
              : log.response.trim();
          if (content) {
            messages.push({
              role: "assistant",
              content,
            });
            console.log("Added response message");
          }
        }
        break;

      case "tool_call":
        console.log(
          "Tool call:",
          log.tool_name,
          "input:",
          !!log.tool_input,
          "output:",
          !!log.tool_output
        );
        if (log.tool_name?.trim() && log.tool_input) {
          // Handle tool input modifications
          const toolInput =
            modification && modification.type === "tool_input"
              ? modification.value
              : log.tool_input;

          const toolContent = `Tool: ${log.tool_name}\nInput: ${JSON.stringify(
            toolInput,
            null,
            2
          )}`;

          let outputContent = toolContent;
          if (log.tool_output) {
            // Handle tool output/result modifications
            const toolOutput =
              modification &&
              (modification.type === "tool_output" ||
                modification.type === "tool_result")
                ? modification.value
                : log.tool_output;
            outputContent = `${toolContent}\nOutput: ${JSON.stringify(
              toolOutput,
              null,
              2
            )}`;
          }

          if (outputContent.trim()) {
            messages.push({
              role: "assistant",
              content: outputContent.trim(),
            });
            console.log("Added tool call message");
          }
        }
        break;

      case "agent_action":
        console.log("Agent action:", log.action);
        if (log.action?.trim()) {
          let actionContent = `Action: ${log.action}`;
          if (log.reasoning?.trim())
            actionContent += `\nReasoning: ${log.reasoning}`;
          if (log.observation?.trim())
            actionContent += `\nObservation: ${log.observation}`;

          if (actionContent.trim()) {
            messages.push({
              role: "assistant",
              content: actionContent.trim(),
            });
            console.log("Added agent action message");
          }
        }
        break;

      case "retrieval":
        console.log("Retrieval:", log.query, "docs:", !!log.documents);
        if (log.query?.trim() && log.documents) {
          const retrievalContent = `Retrieved documents for query: "${
            log.query
          }"\nDocuments: ${JSON.stringify(log.documents, null, 2)}`;
          if (retrievalContent.trim()) {
            messages.push({
              role: "assistant",
              content: retrievalContent.trim(),
            });
            console.log("Added retrieval message");
          }
        }
        break;

      default:
        console.log("Unhandled event type:", log.event_type);
        break;
    }
  }

  // Filter out any messages with empty content as a final safety check
  const filteredMessages = messages.filter(
    (msg) => msg.content && msg.content.trim().length > 0
  );

  console.log("Final filtered messages count:", filteredMessages.length);
  return filteredMessages;
}

function getModelProvider(logs: DatabaseLogEntry[], preferredModel?: string) {
  // If a preferred model is specified, use it
  if (preferredModel) {
    if (preferredModel.includes("gemini")) {
      return google(preferredModel);
    } else if (preferredModel.includes("gpt")) {
      return openai(preferredModel);
    }
  }

  // Otherwise, try to determine from the logs
  const modelLog = logs.find((log) => log.model);
  const modelName = modelLog?.model;

  if (modelName) {
    if (modelName.includes("gemini")) {
      return google(modelName);
    } else if (modelName.includes("gpt")) {
      return openai(modelName);
    }
  }

  // Default to GPT-4
  return openai("gpt-4o");
}

export async function getSessionDetails(sessionId: string) {
  try {
    const logs = await db
      .select()
      .from(logEntries)
      .where(eq(logEntries.session_id, sessionId))
      .orderBy(logEntries.sequence_number);

    return {
      success: true,
      logs,
      totalSteps: logs.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

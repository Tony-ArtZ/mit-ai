# Enhanced Session Replay Features

## Overview

The updated replay section provides comprehensive session debugging and counterfactual analysis capabilities with support for multiple AI models.

## Key Features

### 1. Enhanced Auto-Play Functionality

- **Fixed auto-play mechanism** with proper cleanup and timing control
- **Playback speed control**: 0.5x, 1x, 2x, 3x speeds
- **Progress bar visualization** showing current step position
- **Automatic pause** when reaching the end of the session

### 2. Detailed Step Information

Each replay step now shows comprehensive details:

- **Event metadata**: Type, sequence number, call ID, elapsed time
- **Visual icons** for different event types (User, Bot, Tool, Error, etc.)
- **Color-coded badges** for easy event identification
- **Expandable content areas** with syntax highlighting for JSON data
- **Timestamp information** for each event

### 3. Counterfactual Replay with Multi-Model Support

#### Supported Models

- **OpenAI Models**: GPT-4 Turbo, GPT-3.5 Turbo
- **Google Models**: Gemini 1.5 Pro, Gemini 1.5 Flash

#### Features

- **Parameter modification**: Temperature, max tokens, model selection
- **System prompt modification**: Add additional instructions or constraints
- **Message reconstruction**: Converts session logs into proper message format
- **Side-by-side comparison**: Original vs counterfactual responses
- **Automatic model detection**: Uses original session's model if not specified

### 4. Intelligent Message Conversion

The system converts various log entry types into coherent message streams:

- `agent_init` → System messages with agent configuration
- `user_input` → User messages
- `prompt` → User messages (deduplicated)
- `response`/`agent_response` → Assistant messages
- `tool_call` → Assistant messages with tool execution details
- `agent_action` → Assistant messages with reasoning and observations
- `retrieval` → Assistant messages with retrieved document context

## Usage

### Basic Replay

1. Select a session from the dropdown
2. Use navigation controls (Previous/Next) or Auto-Play
3. Adjust playback speed as needed
4. View detailed information for each step

### Counterfactual Analysis

1. Navigate to the step where you want to test alternative outcomes
2. Modify parameters in the Counterfactual Replay section:
   - Choose a different model
   - Adjust temperature for creativity control
   - Set max tokens for response length
   - Add system prompt modifications
3. Click "Run Counterfactual Replay"
4. Compare the original and alternative responses

## Technical Implementation

### Dependencies

```json
{
  "ai": "^5.0.8",
  "@ai-sdk/openai": "^2.0.8",
  "@ai-sdk/google": "^2.0.3"
}
```

### Environment Variables

```env
OPENAI_API_KEY="your_openai_api_key_here"
GOOGLE_GENERATIVE_AI_API_KEY="your_google_ai_api_key_here"
```

### Server Action

The `generateCounterfactualReplay` function:

- Retrieves session logs up to the current step
- Converts logs to message format
- Determines the appropriate model provider
- Generates alternative responses using the Vercel AI SDK
- Returns comparison results

### Model Provider Selection

The system automatically selects the appropriate model provider based on:

1. User-specified model preference
2. Original session's model (from logs)
3. Default fallback to GPT-4 Turbo

## Error Handling

- Graceful fallbacks for missing data
- Proper TypeScript type checking for unknown JSON fields
- User-friendly error messages for failed counterfactual generations
- Timeout and cleanup handling for auto-play functionality

## Future Enhancements

- Export replay data as video or GIF
- A/B testing with multiple counterfactual variations
- Integration with additional AI providers (Claude, etc.)
- Batch counterfactual analysis for multiple steps
- Performance metrics comparison between original and counterfactual runs

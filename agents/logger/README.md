# LangChain Agent Logger

A comprehensive logging solution for LangChain agents that automatically captures and logs all agent interactions including prompts, responses, tool calls, retrievals, parameters, and timestamps.

## Features

- 🔄 **Automatic Logging**: Integrates seamlessly with LangChain's callback system
- 📝 **Comprehensive Coverage**: Logs prompts, responses, tool calls, retrievals, errors, and custom events
- 📊 **Structured Format**: Uses JSON Lines format for easy parsing and analysis
- ⏱️ **Timestamp Tracking**: Includes precise timestamps and execution metrics
- 🔧 **Configurable**: Customizable log levels, file rotation, and filtering
- 📈 **Session Metrics**: Tracks call counts, errors, and session duration
- 🎯 **Easy Integration**: Simple setup with just a few lines of code

## Installation

```bash
pip install langchain-agent-logger
```

## Quick Start

```python
from langchain.agents import initialize_agent, AgentType
from langchain.llms import OpenAI
from langchain.tools import Tool
from logger import create_logger_with_callback

# Create logger and callback
logger, callback = create_logger_with_callback(
    log_file="my_agent.jsonl",
    log_level="INFO"
)

# Create your LangChain agent
llm = OpenAI(temperature=0)
tools = [...]  # Your tools here

agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    callbacks=[callback],  # Add the callback here
    verbose=True
)

# Use your agent normally
result = agent.run("What's the weather like today?")

# Get session summary
summary = logger.get_session_summary()
print(f"Total calls: {summary['total_calls']}")
print(f"Errors: {summary['error_count']}")
```

## Manual Logging

You can also log events manually:

```python
from logger import create_logger

logger = create_logger("custom_logs.jsonl")

# Log a prompt
logger.log_prompt("What is 2+2?", model="gpt-3.5-turbo")

# Log a response
logger.log_response("2+2 equals 4", model="gpt-3.5-turbo")

# Log a tool call
logger.log_tool_call(
    tool_name="calculator",
    tool_input="2+2",
    tool_output="4"
)

# Log custom events
logger.log_custom("user_action", {
    "action": "button_click",
    "button_id": "submit",
    "user_id": "user123"
})
```

## Log Format

All logs are saved in JSON Lines format with the following structure:

```json
{
  "session_id": "uuid-string",
  "event_type": "prompt|response|tool_call|retrieval|agent_action|error|custom",
  "call_id": "uuid-string",
  "sequence_number": 1,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "elapsed_time": 1.234,
  "prompt": "What's the weather?",
  "model": "gpt-3.5-turbo",
  "parameters": {...}
}
```

## Configuration Options

```python
logger = create_logger(
    log_file="agent_logs.jsonl",     # Log file path
    log_level="INFO",                # DEBUG, INFO, WARNING, ERROR, CRITICAL
    include_timestamps=True,         # Include timestamps
    include_parameters=True,         # Include model parameters
    max_log_size=100*1024*1024,     # Max file size (100MB)
    backup_count=5                   # Number of backup files
)
```

## Event Types

The logger captures the following event types:

- **prompt**: LLM prompts with model and parameters
- **response**: LLM responses with usage statistics
- **tool_call**: Tool executions with inputs and outputs
- **retrieval**: Document retrieval operations
- **agent_action**: Agent reasoning and actions
- **error**: Errors with context information
- **custom**: Custom events you define

## Log Analysis

Since logs are in JSON Lines format, you can easily analyze them:

```python
import json

# Read and analyze logs
with open("agent_logs.jsonl", "r") as f:
    for line in f:
        log_entry = json.loads(line)
        if log_entry["event_type"] == "error":
            print(f"Error at {log_entry['timestamp']}: {log_entry['error']}")
```

## Advanced Usage

### Custom Callback Handler

```python
from logger import AgentLogger, LangChainLoggerCallback

# Create logger with custom configuration
logger = AgentLogger(
    log_file="advanced_logs.jsonl",
    log_level="DEBUG",
    include_parameters=False
)

# Create custom callback
callback = LangChainLoggerCallback(logger)

# Use with your agent
agent = initialize_agent(
    tools=tools,
    llm=llm,
    callbacks=[callback]
)
```

### Filtering and Processing

```python
# Create logger that only logs errors
error_logger = create_logger("errors_only.jsonl", log_level="ERROR")

# Log retrieval operations
logger.log_retrieval(
    query="search term",
    documents=[{"content": "doc1"}, {"content": "doc2"}],
    retriever_type="vector_store"
)
```

## Development

To contribute to this project:

```bash
# Clone the repository
git clone https://github.com/yourusername/langchain-agent-logger.git
cd langchain-agent-logger

# Install development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black .

# Type checking
mypy .
```

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

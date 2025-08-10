# AI Agents Dashboard

A web-based interface for interacting with two specialized LangChain agents: a Customer Service Agent and a Workflow Automation Agent.

## Features

### 🛍️ Customer Service Agent

- Check order status
- Process refunds
- Provide product information
- Escalate complex issues to human support

### 📊 Workflow Agent

- Parse and summarize reports
- Run financial models (ROI, NPV calculations)
- Orchestrate multi-step workflows
- Analyze data and provide insights
- Generate workflow reports

### 📝 Comprehensive Logging

- **Automatic Logging**: All agent interactions are logged via LangChain callbacks
- **Console Output**: Structured JSON logs printed to console for easy monitoring
- **Detailed Tracking**: Logs prompts, responses, tool calls, errors, and custom events
- **Transport Ready**: Logger acts as transport mechanism for future integrations
- **Session Metrics**: Track call counts, errors, and execution times
- **Real-time Monitoring**: View logging status via `/logs/<agent_type>` endpoint

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Google Gemini API key
GOOGLE_API_KEY=your_actual_google_gemini_api_key_here
```

### 3. Run the Server

```bash
python server.py
```

The server will start on `http://localhost:5000`

## Usage

1. Open your web browser and navigate to `http://localhost:5000`
2. Choose which agent you want to interact with:
   - **Customer Service Agent**: For customer support tasks
   - **Workflow Agent**: For analytical and automation tasks
3. Start chatting with your selected agent

## Demo Mode

The application includes a demo mode that works even without the required packages installed. This allows you to test the interface and see example responses before setting up the full environment.

## Agent Capabilities

### Customer Service Agent Examples:

- "Check order status for #12345"
- "I need to return my laptop"
- "Tell me about your phone products"
- "I have a complex billing issue"

### Workflow Agent Examples:

- "Parse this sales report: [report data]"
- "Calculate ROI for investment of $1000 with returns of $1200"
- "Orchestrate workflow: data collection, analysis, reporting"
- "Analyze this dataset for patterns and insights"

## File Structure

```
agents/
├── server.py                 # Flask web server
├── requirements.txt          # Python dependencies
├── .env.example             # Environment variables template
├── customer-agent/
│   ├── __init__.py
│   └── main.py              # Customer service agent implementation
├── workflow-agent/
│   ├── __init__.py
│   └── main.py              # Workflow automation agent implementation
└── templates/
    └── index.html           # Web interface
```

## Troubleshooting

### Import Errors

If you see import errors, make sure all packages are installed:

```bash
pip install -r requirements.txt
```

### Google Gemini API Key Issues

- Make sure you have a valid Google Gemini API key
- Ensure the `.env` file is in the root directory
- Check that the key is correctly formatted in the `.env` file
- Get your API key from: https://ai.google.dev/

### Port Issues

If port 5000 is already in use, you can change it in the `.env` file:

```
PORT=8080
```

## API Endpoints

- `GET /` - Main web interface
- `POST /chat/customer` - Chat with customer service agent
- `POST /chat/workflow` - Chat with workflow agent
- `GET /health` - Health check and agent status
- `GET /logs/<agent_type>` - Get logging information for specified agent (customer or workflow)

## Logging and Analytics

All agent interactions are automatically logged using the integrated LangChain logger:

### Console Output

All logs are printed to the console in structured JSON format for easy monitoring and debugging.

### Log Analysis Examples

```bash
# Monitor real-time activity by watching console output
python server.py

# Get session summaries via API
curl http://localhost:5000/logs/customer
curl http://localhost:5000/logs/workflow
```

### What Gets Logged

- User inputs and agent responses
- Tool calls and outputs
- LLM prompts and completions
- Errors and exceptions
- Agent initialization and configuration
- Session metrics and timing

### Log Format

```json
{
  "session_id": "uuid-string",
  "event_type": "prompt|response|tool_call|user_input|agent_response|error",
  "call_id": "uuid-string",
  "sequence_number": 1,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "elapsed_time": 1.234,
  "data": "..."
}
```

## Contributing

Feel free to extend the agents with additional tools and capabilities based on your specific needs.

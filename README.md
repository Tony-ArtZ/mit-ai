# AgentOps Replay – Log, Visualize & Replay Agent Workflows

A comprehensive system for logging, visualizing, and replaying AI agent workflows for debugging and compliance. This project provides enterprises with the confidence that AI agents follow policy, use tools correctly, and make auditable decisions.

## 🎯 Project Overview

**Problem Statement**: Enterprises need confidence that AI agents follow policy, use tools correctly, and make auditable decisions. When something goes wrong, teams must replay what happened, step through decisions, and prove compliance.

**Solution**: A complete simulation and replay arena for AI agents that:

- ✅ Captures structured traces of each step (prompts, tool calls, retrieved docs, model I/O)
- ✅ Visualizes workflows and decisions in an interactive dashboard
- ✅ Enables deterministic replay for debugging and compliance review
- ✅ Provides compliance monitoring and audit reporting

## 🏗️ Architecture

![Architecture](/assets/architecture.png)

The system consists of four main components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Agents     │───▶│   Logger MCP    │───▶│   Dashboard     │
│   (Flask API)   │    │   Server        │    │   (Next.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ LangChain Agent │    │ File & HTTP     │    │ PostgreSQL      │
│ Logging System  │    │ Log Transport   │    │ Database        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
.
├── agents/                 # LangChain agents with integrated logging
│   ├── customer-agent/     # Customer service agent
│   ├── workflow-agent/     # Analytical workflow agent
│   ├── logger/            # Universal agent logger package
│   ├── server.py          # Flask web server for agent interactions
│   └── templates/         # Web interface templates
├── dashboard/             # Next.js dashboard for visualization
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   ├── db/               # Database schema and config
│   └── lib/              # Utility libraries
├── logger-mcp/           # MCP (Model Context Protocol) server
└── Problem.txt           # Original problem statement
```

## 🤖 Agent Types (Mocked)

### 1. Customer Service Agent (`agents/customer-agent/`)

- **Capabilities**: Order status checks, refund processing, product information, escalation to human support
- **Tools**: Order lookup, refund processing, product database, escalation system
- **Use Cases**: Customer support automation, ticket routing, policy compliance

### 2. Workflow Automation Agent (`agents/workflow-agent/`)

- **Capabilities**: Report parsing, financial modeling, multi-step workflow orchestration, data analysis
- **Tools**: Document parser, ROI/NPV calculator, workflow orchestrator, data analyzer
- **Use Cases**: Business process automation, financial analysis, reporting workflows

## 📊 Core Features

### Universal Agent Logger (`agents/logger/`)

- **Comprehensive Logging**: Captures prompts, responses, tool calls, retrievals, errors, and custom events
- **Structured Format**: JSON Lines format for easy parsing and analysis
- **LangChain Integration**: Seamless integration via callback system
- **Transport Flexibility**: File logging + HTTP POST to dashboard
- **Session Tracking**: Unique session IDs with call counts and metrics

### Visualization Dashboard (`dashboard/`)

- **Real-time Monitoring**: Live agent activity and performance metrics
- **Session Analytics**: Detailed breakdowns of agent sessions
- **Timeline Views**: Step-by-step visualization of agent workflows
- **Error Tracking**: Comprehensive error monitoring and analysis
- **Compliance Dashboard**: Policy violation tracking and audit reports

### Compliance & Audit System

- **Policy Engine**: Configurable compliance policies with different severity levels
- **Violation Detection**: Automatic scanning of logs for policy violations
- **Audit Reports**: Exportable compliance reports with detailed analysis
- **Data Privacy**: GDPR compliance checks and PII detection
- **Security Monitoring**: API key exposure and sensitive data protection

### MCP Integration (`logger-mcp/`)

- **Model Context Protocol**: Standardized logging interface for any MCP-compatible client
- **Tool Auto-logging**: Automatic logging of all tool calls with inputs/outputs/errors
- **Session Management**: Init-before-use pattern with session tracking
- **Multi-sink Support**: File and HTTP transport options

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+
- PostgreSQL database
- Google Gemini API key

### 1. Setup Agents

```bash
cd agents
pip install -r requirements.txt
cp .env.example .env
# Add your Google Gemini API key to .env
python server.py
```

### 2. Setup Dashboard

```bash
cd dashboard
npm install
# Configure DATABASE_URL in .env
npm run dev
```

### 3. Setup MCP Server (Optional)

```bash
cd logger-mcp
pip install -r requirements.txt
python main.py
```

## 💻 Usage Examples

### Agent Interaction

```bash
# Start the agent server
cd agents && python server.py

# Visit http://localhost:5000 to interact with agents
# Choose between Customer Service or Workflow agents
```

### API Examples

```bash
# Chat with customer agent
curl -X POST http://localhost:5000/chat/customer \
  -H "Content-Type: application/json" \
  -d '{"message": "Check order status for #12345"}'

# Chat with workflow agent
curl -X POST http://localhost:5000/chat/workflow \
  -H "Content-Type: application/json" \
  -d '{"message": "Calculate ROI for $1000 investment with $1200 returns"}'

# Get agent logs
curl http://localhost:5000/logs/customer
```

### Dashboard Views

- **Overview**: Agent performance metrics and session summaries
- **Sessions**: Detailed session breakdowns with timeline views
- **Errors**: Error tracking and analysis
- **Compliance**: Policy violations and audit reports
- **Analytics**: Performance trends and usage analytics

## 🔧 Configuration

### Logger Configuration

```python
from logger import create_logger_with_callback

logger, callback = create_logger_with_callback(
    log_level="INFO",
    include_timestamps=True,
    include_parameters=True,
    push_url="http://localhost:3000/api/logger/push"
)
```

### Compliance Policies

Policies are configurable via the dashboard or database:

- **Data Privacy**: PII detection, GDPR compliance
- **Security**: API key exposure, sensitive data handling
- **Regulatory**: Custom business rules and constraints
- **Operational**: Performance and usage policies

## 📋 Log Format

All logs follow a structured JSON Lines format:

```json
{
  "session_id": "uuid-string",
  "event_type": "prompt|response|tool_call|retrieval|error|custom",
  "call_id": "uuid-string",
  "sequence_number": 1,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "elapsed_time": 1.234,
  "data": "...",
  "agent_type": "customer|workflow",
  "model": "gemini-2.5-flash"
}
```

## 🎥 Deterministic Replay

The system supports replay functionality through:

- **Complete Session Capture**: All inputs, outputs, and intermediate states
- **Structured Storage**: PostgreSQL database with full audit trail
- **Timeline Reconstruction**: Step-by-step replay of agent decisions
- **Parameter Preservation**: Original model parameters and configurations

## 📈 Evaluation Criteria

### ✅ Coverage

- Logs all relevant agent steps including prompts, tool calls, retrievals, and responses
- Captures errors, timeouts, and edge cases
- Records model parameters and configuration

### ✅ Replay Fidelity

- Matches original outputs through structured data capture
- Preserves agent state and decision context
- Enables deterministic replay for debugging

### ✅ UX Clarity

- Intuitive dashboard with timeline and graph views
- Click-through inspection of each step
- Clear visualization of agent workflows

### ✅ Compliance

- Policy violation detection and reporting
- Audit trail generation and export
- GDPR and security compliance checks

## 🛠️ Development

### Running Tests

```bash
# Test agents
cd agents && python -m pytest

# Test dashboard
cd dashboard && npm test
```

### Database Migrations

```bash
cd dashboard
npx drizzle-kit push
npm run seed-policies  # Seed default compliance policies
```

### Adding New Agents

1. Create agent in `agents/` directory
2. Integrate logger with LangChain callbacks
3. Add routes to `server.py`
4. Update dashboard for new agent type

## 🔒 Security & Compliance

- **Data Privacy**: PII detection and anonymization
- **API Security**: Secure API key handling
- **Audit Logging**: Complete audit trail for all operations
- **GDPR Compliance**: Data handling and retention policies
- **Access Control**: Role-based access to sensitive data

## 📊 Metrics & Analytics

The system tracks comprehensive metrics:

- **Session Metrics**: Duration, success rate, error count
- **Agent Performance**: Tool usage, iteration counts, efficiency
- **Compliance Metrics**: Violation rates, resolution times
- **Usage Analytics**: User interactions, popular workflows

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🌟 Why It Matters

Without clear logs and replay tools, agent behavior is a black box—making it hard to debug failures, audit decisions, or prove compliance. This system empowers teams to turn opaque AI workflows into transparent, reproducible processes, enabling safer deployment and faster iteration in enterprise environments.

The combination of comprehensive logging, interactive visualization, and compliance monitoring makes this an essential tool for any organization deploying AI agents in production environments.

from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import sys
import importlib.util
from datetime import datetime

# Import agents using importlib to avoid path conflicts
create_customer_agent = None
create_workflow_agent = None

def import_agent_module(agent_name, file_path):
    """Import an agent module from a specific file path."""
    try:
        spec = importlib.util.spec_from_file_location(f"{agent_name}_main", file_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    except Exception as e:
        print(f"✗ Failed to import {agent_name}: {e}")
        return None

# Import customer agent
customer_module = import_agent_module(
    "customer", 
    os.path.join(os.path.dirname(__file__), 'customer-agent', 'main.py')
)
if customer_module and hasattr(customer_module, 'create_customer_agent'):
    create_customer_agent = customer_module.create_customer_agent
    print("✓ Customer agent imported successfully")
else:
    print("✗ Customer agent import failed")

# Import workflow agent
workflow_module = import_agent_module(
    "workflow",
    os.path.join(os.path.dirname(__file__), 'workflow-agent', 'main.py')
)
if workflow_module and hasattr(workflow_module, 'create_workflow_agent'):
    create_workflow_agent = workflow_module.create_workflow_agent
    print("✓ Workflow agent imported successfully")
else:
    print("✗ Workflow agent import failed")

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

# Initialize agents (will be None if imports failed)
customer_agent = None
workflow_agent = None
agents_initialized = False

def initialize_agents():
    """Initialize the agents if possible."""
    global customer_agent, workflow_agent, agents_initialized
    
    # Prevent multiple initializations
    if agents_initialized:
        print("Agents already initialized, skipping...")
        return
    
    try:
        # Logger push URL - configure this as needed
        push_url = "http://localhost:3000/api/logger/push"
        
        if create_customer_agent:
            # Create customer agent with logging enabled
            customer_agent = create_customer_agent(enable_logging=True, push_url=push_url)
        if create_workflow_agent:
            # Create workflow agent with logging enabled
            workflow_agent = create_workflow_agent(enable_logging=True, push_url=push_url)
        
        agents_initialized = True
        print("Agents initialized successfully with logging!")
    except Exception as e:
        print(f"Error initializing agents: {e}")
        print("The server will run in demo mode.")

@app.route('/')
def index():
    """Serve the main page with agent selection."""
    return render_template('index.html')

@app.route('/chat/<agent_type>', methods=['POST'])
def chat(agent_type):
    """Handle chat requests for the specified agent."""
    try:
        user_message = request.json.get('message', '')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Route to appropriate agent
        if agent_type == 'customer':
            if customer_agent:
                response = customer_agent.get_response(user_message)
            else:
                response = demo_customer_response(user_message)
        elif agent_type == 'workflow':
            if workflow_agent:
                response = workflow_agent.get_response(user_message)
            else:
                response = demo_workflow_response(user_message)
        else:
            return jsonify({'error': 'Invalid agent type'}), 400
        
        return jsonify({
            'response': response,
            'agent': agent_type,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': f'Error processing request: {str(e)}'}), 500

def demo_customer_response(message):
    """Demo response for customer agent when LangChain is not available."""
    message_lower = message.lower()
    
    if 'order' in message_lower and any(word in message_lower for word in ['status', 'track', 'where']):
        return "I can help you track your order! Please provide your order number (e.g., 12345) and I'll check the status for you. [Demo Mode - Install requirements and set up Gemini API key to use full LangChain agent]"
    elif 'refund' in message_lower:
        return "I understand you'd like to process a refund. I can help you with that! Please provide your order number and the reason for the refund. [Demo Mode - Install requirements and set up Gemini API key to use full LangChain agent]"
    elif 'product' in message_lower:
        return "I can provide information about our products! What specific product are you interested in? (laptop, phone, headphones) [Demo Mode - Install requirements and set up Gemini API key to use full LangChain agent]"
    else:
        return "Hello! I'm your customer service agent. I can help you with order status, refunds, product information, and more. How can I assist you today? [Demo Mode - Install requirements and set up Gemini API key to use full LangChain agent]"

def demo_workflow_response(message):
    """Demo response for workflow agent when LangChain is not available."""
    message_lower = message.lower()
    
    if 'report' in message_lower and 'parse' in message_lower:
        return "I can parse and analyze reports for you! Please provide the report data and I'll extract key metrics and generate a summary. [Demo Mode - Install requirements and set up Gemini API key to use full LangChain agent]"
    elif 'financial' in message_lower or 'roi' in message_lower or 'npv' in message_lower:
        return "I can run financial models including ROI and NPV calculations. Please provide the model type and parameters (investment amount, returns, discount rate, etc.). [Demo Mode - Install requirements and set up Gemini API key to use full LangChain agent]"
    elif 'workflow' in message_lower:
        return "I can orchestrate multi-step workflows for you! Describe the workflow steps you need to automate, and I'll coordinate the entire process. [Demo Mode - Install requirements and set up Gemini API key to use full LangChain agent]"
    elif 'analyze' in message_lower or 'data' in message_lower:
        return "I can analyze data and provide insights! Share your data and I'll identify patterns, anomalies, and provide recommendations. [Demo Mode - Install requirements and set up Gemini API key to use full LangChain agent]"
    else:
        return "Hello! I'm your workflow automation agent. I specialize in parsing reports, running financial models, orchestrating workflows, and data analysis. What process would you like me to help automate? [Demo Mode - Install requirements and set up Gemini API key to use full LangChain agent]"

@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'agents_available': {
            'customer': customer_agent is not None,
            'workflow': workflow_agent is not None
        },
        'timestamp': datetime.now().isoformat()
    })

@app.route('/logs/<agent_type>')
def get_logs(agent_type):
    """Get logging information for the specified agent."""
    try:
        if agent_type == 'customer' and customer_agent and hasattr(customer_agent, 'logger') and customer_agent.logger:
            summary = customer_agent.logger.get_session_summary()
            return jsonify({
                'agent_type': 'customer',
                'logging_enabled': True,
                'session_summary': summary
            })
        elif agent_type == 'workflow' and workflow_agent and hasattr(workflow_agent, 'logger') and workflow_agent.logger:
            summary = workflow_agent.logger.get_session_summary()
            return jsonify({
                'agent_type': 'workflow', 
                'logging_enabled': True,
                'session_summary': summary
            })
        else:
            return jsonify({
                'agent_type': agent_type,
                'logging_enabled': False,
                'message': 'Agent not available or logging not enabled'
            })
    except Exception as e:
        return jsonify({'error': f'Error getting logs: {str(e)}'}), 500

if __name__ == '__main__':
    # Try to initialize agents
    initialize_agents()
    
    # Get port from environment or default to 5000
    port = int(os.environ.get('PORT', 5000))
    
    # Configure debug and reloader settings
    debug_mode = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    use_reloader = os.environ.get('FLASK_USE_RELOADER', 'False').lower() == 'true'
    
    print(f"Starting server on port {port}")
    print(f"Debug mode: {debug_mode}, Auto-reload: {use_reloader}")
    print("Agent status:")
    print(f"  Customer Agent: {'✓ Loaded' if customer_agent else '✗ Demo Mode'}")
    print(f"  Workflow Agent: {'✓ Loaded' if workflow_agent else '✗ Demo Mode'}")
    print(f"\nOpen http://localhost:{port} in your browser")
    print("\nNote: To enable auto-reload during development, set FLASK_USE_RELOADER=true")
    
    # Use configurable debug mode and reloader
    app.run(host='0.0.0.0', port=port, debug=debug_mode, use_reloader=use_reloader)
from langchain.agents import initialize_agent, AgentType
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferMemory
from langchain.tools import Tool
from langchain.schema import HumanMessage, SystemMessage
import os
import json
import csv
import sys
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Add the logger to the path
sys.path.insert(0, str(Path(__file__).parent.parent / "logger"))

try:
    from logger import create_logger_with_callback
    LOGGER_AVAILABLE = True
except ImportError:
    LOGGER_AVAILABLE = False
    print("Logger not available - running without logging")

load_dotenv()

class WorkflowAgent:
    def __init__(self, enable_logging=True, push_url=None):
        """Initialize the Workflow Agent for structured process automation."""
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.3,  # Lower temperature for more structured outputs
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )
        
        # Initialize logger if available and enabled
        self.logger = None
        self.callback = None
        if enable_logging and LOGGER_AVAILABLE:
            try:
                self.logger, self.callback = create_logger_with_callback(
                    log_level="INFO",
                    include_timestamps=True,
                    include_parameters=True,
                    push_url=push_url
                )
                print(f"Workflow Agent logger initialized with session: {self.logger.session_id}")
            except Exception as e:
                print(f"Failed to initialize logger: {e}")
                self.logger = None
                self.callback = None
        
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        # Define workflow automation tools
        self.tools = self._create_tools()
        
        # Prepare callbacks list
        callbacks = []
        if self.callback:
            callbacks.append(self.callback)
        
        # Initialize the agent with logging callback
        self.agent = initialize_agent(
            tools=self.tools,
            llm=self.llm,
            agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
            memory=self.memory,
            callbacks=callbacks,
            verbose=True,
            max_iterations=5
        )
        
        # Log agent initialization
        if self.logger:
            self.logger.log_custom("agent_init", {
                "agent_type": "workflow_automation",
                "tools_count": len(self.tools),
                "model": "gemini-pro",
                "max_iterations": 5
            })
    
    def _create_tools(self):
        """Create tools for workflow automation operations."""
        
        def parse_report(report_data: str) -> str:
            """Parse and summarize a report in structured format."""
            try:
                # Mock report parsing - in real implementation, this would handle various formats
                lines = report_data.strip().split('\n')
                summary = {
                    "total_lines": len(lines),
                    "timestamp": datetime.now().isoformat(),
                    "key_metrics": [],
                    "summary": ""
                }
                
                # Extract key information (mock implementation)
                for line in lines[:5]:  # First 5 lines for demo
                    if any(keyword in line.lower() for keyword in ['total', 'revenue', 'profit', 'loss', 'sales']):
                        summary["key_metrics"].append(line.strip())
                
                summary["summary"] = f"Report contains {len(lines)} lines of data with {len(summary['key_metrics'])} key metrics identified."
                
                return json.dumps(summary, indent=2)
            except Exception as e:
                return f"Error parsing report: {str(e)}"
        
        def run_financial_model(model_type: str, parameters: str) -> str:
            """Run financial models with given parameters."""
            try:
                params = json.loads(parameters) if parameters.startswith('{') else {"value": parameters}
                
                # Mock financial calculations
                results = {
                    "model_type": model_type,
                    "input_parameters": params,
                    "timestamp": datetime.now().isoformat(),
                    "results": {}
                }
                
                if model_type.lower() == "roi":
                    investment = float(params.get("investment", 1000))
                    returns = float(params.get("returns", 1200))
                    roi = ((returns - investment) / investment) * 100
                    results["results"] = {
                        "roi_percentage": round(roi, 2),
                        "profit": returns - investment,
                        "interpretation": "Positive" if roi > 0 else "Negative"
                    }
                elif model_type.lower() == "npv":
                    cash_flows = params.get("cash_flows", [1000, 1200, 1400])
                    discount_rate = float(params.get("discount_rate", 0.1))
                    npv = sum(cf / (1 + discount_rate) ** i for i, cf in enumerate(cash_flows))
                    results["results"] = {
                        "npv": round(npv, 2),
                        "interpretation": "Positive" if npv > 0 else "Negative"
                    }
                else:
                    results["results"] = {"message": f"Model {model_type} calculated successfully with given parameters"}
                
                return json.dumps(results, indent=2)
            except Exception as e:
                return f"Error running financial model: {str(e)}"
        
        def orchestrate_workflow(workflow_steps: str) -> str:
            """Orchestrate a multi-step workflow process."""
            try:
                steps = workflow_steps.split(',') if ',' in workflow_steps else [workflow_steps]
                
                workflow_result = {
                    "workflow_id": f"WF_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    "total_steps": len(steps),
                    "executed_steps": [],
                    "status": "completed",
                    "timestamp": datetime.now().isoformat()
                }
                
                for i, step in enumerate(steps, 1):
                    step_result = {
                        "step_number": i,
                        "step_name": step.strip(),
                        "status": "completed",
                        "execution_time": f"{i * 0.5:.1f}s"
                    }
                    workflow_result["executed_steps"].append(step_result)
                
                return json.dumps(workflow_result, indent=2)
            except Exception as e:
                return f"Error orchestrating workflow: {str(e)}"
        
        def analyze_data(data_input: str) -> str:
            """Analyze data and provide insights."""
            try:
                # Mock data analysis
                lines = data_input.strip().split('\n')
                analysis = {
                    "data_points": len(lines),
                    "analysis_timestamp": datetime.now().isoformat(),
                    "insights": [],
                    "recommendations": []
                }
                
                # Simple analysis (mock)
                if len(lines) > 10:
                    analysis["insights"].append("Large dataset detected - consider data sampling")
                if any('error' in line.lower() for line in lines):
                    analysis["insights"].append("Error patterns detected in data")
                    analysis["recommendations"].append("Review data quality and error handling")
                
                analysis["insights"].append(f"Dataset contains {len(lines)} entries")
                analysis["recommendations"].append("Consider automated processing for efficiency")
                
                return json.dumps(analysis, indent=2)
            except Exception as e:
                return f"Error analyzing data: {str(e)}"
        
        def generate_workflow_report(workflow_data: str) -> str:
            """Generate a comprehensive workflow report."""
            report = {
                "report_id": f"RPT_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "generated_at": datetime.now().isoformat(),
                "workflow_summary": workflow_data,
                "status": "completed",
                "next_actions": [
                    "Review generated insights",
                    "Implement recommended optimizations",
                    "Schedule follow-up analysis"
                ]
            }
            
            return json.dumps(report, indent=2)
        
        return [
            Tool(
                name="parse_report",
                description="Parse and summarize reports in structured format. Input should be report content.",
                func=parse_report
            ),
            Tool(
                name="run_financial_model",
                description="Run financial models (ROI, NPV, etc.) with parameters. Format: model_type, parameters as JSON",
                func=run_financial_model
            ),
            Tool(
                name="orchestrate_workflow",
                description="Orchestrate multi-step workflows. Input should be comma-separated workflow steps.",
                func=orchestrate_workflow
            ),
            Tool(
                name="analyze_data",
                description="Analyze data and provide insights and recommendations.",
                func=analyze_data
            ),
            Tool(
                name="generate_workflow_report",
                description="Generate comprehensive workflow reports with summaries and next actions.",
                func=generate_workflow_report
            )
        ]
    
    def get_response(self, user_input: str) -> str:
        """Get a response from the workflow automation agent."""
        try:
            # Log the user input
            if self.logger:
                self.logger.log_custom("user_input", {
                    "input": user_input,
                    "agent_type": "workflow_automation"
                })
            
            system_prompt = """You are an analytical workflow automation agent. You specialize in:
            - Parsing and summarizing reports
            - Running financial models (ROI, NPV, etc.)
            - Orchestrating multi-step workflows
            - Data analysis and insights generation
            - Workflow reporting and documentation
            
            Always provide structured, detailed responses with clear next steps.
            When processing requests, break down complex tasks into manageable steps.
            Use appropriate tools to automate processes and provide actionable insights."""
            
            response = self.agent.run(f"{system_prompt}\n\nUser Request: {user_input}")
            
            # Log the response
            if self.logger:
                self.logger.log_custom("agent_response", {
                    "response": response,
                    "agent_type": "workflow_automation",
                    "user_input": user_input
                })
            
            return response
        except Exception as e:
            error_msg = f"I apologize, but I encountered an error processing your workflow request. Error: {str(e)}"
            
            # Log the error
            if self.logger:
                self.logger.log_error(str(e), {
                    "agent_type": "workflow_automation",
                    "user_input": user_input,
                    "context": "get_response_failed"
                })
            
            return error_msg

def create_workflow_agent(enable_logging=True, push_url=None):
    """Factory function to create a workflow agent instance."""
    return WorkflowAgent(enable_logging=enable_logging, push_url=push_url)
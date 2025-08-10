from langchain.agents import initialize_agent, AgentType
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferMemory
from langchain.tools import Tool
from langchain.schema import HumanMessage, SystemMessage
import os
import sys
from pathlib import Path
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

class CustomerAgent:
    def __init__(self, enable_logging=True, push_url=None):
        """Initialize the Customer Service Agent with Google Gemini integration."""
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.7,
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
                print(f"Customer Agent logger initialized with session: {self.logger.session_id}")
            except Exception as e:
                print(f"Failed to initialize logger: {e}")
                self.logger = None
                self.callback = None
        
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        # Define customer service tools
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
            max_iterations=3
        )
        
        # Log agent initialization
        if self.logger:
            self.logger.log_custom("agent_init", {
                "agent_type": "customer_service",
                "tools_count": len(self.tools),
                "model": "gemini-pro",
                "max_iterations": 3
            })
    
    def _create_tools(self):
        """Create tools for customer service operations."""
        
        def check_order_status(order_id: str) -> str:
            """Check the status of a customer order."""
            # Mock order status check
            mock_statuses = {
                "12345": "Shipped - Arriving Tuesday",
                "67890": "Processing - Will ship tomorrow",
                "54321": "Delivered on Monday"
            }
            return mock_statuses.get(order_id, "Order not found. Please check your order ID.")
        
        def process_refund(order_id: str, reason: str) -> str:
            """Process a refund request for an order."""
            # Mock refund processing
            return f"Refund request for order {order_id} has been submitted. Reason: {reason}. You will receive confirmation within 24 hours."
        
        def get_product_info(product_name: str) -> str:
            """Get information about a product."""
            # Mock product information
            mock_products = {
                "laptop": "15-inch Display Laptop - $999, In Stock, Free Shipping",
                "phone": "Latest Smartphone - $699, Limited Stock, Express Shipping Available",
                "headphones": "Wireless Noise-Canceling Headphones - $199, In Stock"
            }
            return mock_products.get(product_name.lower(), "Product not found. Please check the product name.")
        
        def escalate_to_human(issue: str) -> str:
            """Escalate complex issues to human support."""
            return f"Your issue has been escalated to our human support team. Ticket created: {hash(issue) % 10000}. Someone will contact you within 2 hours."
        
        return [
            Tool(
                name="check_order_status",
                description="Check the status of a customer order by order ID",
                func=check_order_status
            ),
            Tool(
                name="process_refund",
                description="Process a refund request for an order",
                func=process_refund
            ),
            Tool(
                name="get_product_info",
                description="Get information about a product including price and availability",
                func=get_product_info
            ),
            Tool(
                name="escalate_to_human",
                description="Escalate complex issues to human support when the agent cannot resolve them",
                func=escalate_to_human
            )
        ]
    
    def get_response(self, user_input: str) -> str:
        """Get a response from the customer service agent."""
        try:
            # Log the user input
            if self.logger:
                self.logger.log_custom("user_input", {
                    "input": user_input,
                    "agent_type": "customer_service"
                })
            
            system_prompt = """You are a helpful customer service agent. You can help with:
            - Checking order status
            - Processing refunds
            - Providing product information
            - Escalating complex issues to human support
            
            Always be polite, helpful, and professional. If you cannot help with something, 
            use the escalate_to_human tool to connect the customer with human support."""
            
            response = self.agent.run(f"{system_prompt}\n\nCustomer: {user_input}")
            
            # Log the response
            if self.logger:
                self.logger.log_custom("agent_response", {
                    "response": response,
                    "agent_type": "customer_service",
                    "user_input": user_input
                })
            
            return response
        except Exception as e:
            error_msg = f"I apologize, but I'm experiencing technical difficulties. Please try again or contact human support. Error: {str(e)}"
            
            # Log the error
            if self.logger:
                self.logger.log_error(str(e), {
                    "agent_type": "customer_service",
                    "user_input": user_input,
                    "context": "get_response_failed"
                })
            
            return error_msg

def create_customer_agent(enable_logging=True, push_url=None):
    """Factory function to create a customer agent instance."""
    return CustomerAgent(enable_logging=enable_logging, push_url=push_url)
"""
Example usage of the LangChain Agent Logger package.
"""

from langchain.agents import initialize_agent, AgentType
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.tools import Tool
from langchain.memory import ConversationBufferMemory
import os
import sys
from pathlib import Path

# Add the logger to the path
sys.path.insert(0, str(Path(__file__).parent))

from logger import create_logger_with_callback


def example_tool_function(query: str) -> str:
    """Example tool that reverses a string."""
    return f"Reversed: {query[::-1]}"


def main():
    """Demonstrate the logger functionality."""
    
    # Create logger and callback
    logger, callback = create_logger_with_callback(
        log_level="INFO",
        include_timestamps=True,
        include_parameters=True
    )
    
    print(f"Logger created with session ID: {logger.session_id}")
    print("All logs will be printed to console")
    
    # Manual logging examples
    logger.log_custom("session_start", {
        "user_id": "example_user",
        "session_type": "demo"
    })
    
    # Create a simple tool
    reverse_tool = Tool(
        name="string_reverser",
        description="Reverses the input string",
        func=example_tool_function
    )
    
    # Check if we have a Gemini API key
    if os.getenv("GOOGLE_API_KEY"):
        print("Using Gemini API for LLM")
        
        # Create LLM
        llm = ChatGoogleGenerativeAI(
            model="gemini-pro",
            temperature=0.3,
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )
        
        # Create memory
        memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        # Create agent with logger callback
        agent = initialize_agent(
            tools=[reverse_tool],
            llm=llm,
            agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
            memory=memory,
            callbacks=[callback],  # This enables automatic logging!
            verbose=True
        )
        
        # Test the agent
        print("\n" + "="*50)
        print("Testing agent with automatic logging...")
        print("="*50)
        
        try:
            result = agent.run("Please reverse the string 'Hello World'")
            print(f"Agent result: {result}")
        except Exception as e:
            logger.log_error(str(e), {"context": "agent_run_failed"})
            print(f"Agent error: {e}")
            
    else:
        print("No GOOGLE_API_KEY found, demonstrating manual logging only")
        
        # Manual logging demonstration
        logger.log_prompt(
            prompt="Please reverse the string 'Hello World'",
            model="gemini-pro",
            parameters={"temperature": 0.3}
        )
        
        logger.log_tool_call(
            tool_name="string_reverser",
            tool_input="Hello World",
            tool_output="Reversed: dlroW olleH"
        )
        
        logger.log_response(
            response="I used the string reverser tool to reverse 'Hello World' and got 'dlroW olleH'",
            model="gemini-pro",
            usage={"prompt_tokens": 25, "completion_tokens": 20, "total_tokens": 45}
        )
    
    # Log session end
    logger.log_custom("session_end", {
        "user_id": "example_user",
        "reason": "demo_completed"
    })
    
    # Get and display session summary
    summary = logger.get_session_summary()
    print("\n" + "="*50)
    print("Session Summary:")
    print("="*50)
    for key, value in summary.items():
        print(f"{key}: {value}")
    
    print(f"\nCheck the console output above for all logged events.")
    print("The logger is now acting as a transport mechanism, printing structured JSON logs.")


if __name__ == "__main__":
    main()

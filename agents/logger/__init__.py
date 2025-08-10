"""
LangChain Agent Logger

A comprehensive logging package for LangChain agents that provides:
- Automatic logging through LangChain callbacks
- Detailed logging of prompts, responses, tool calls, and retrievals
- Console output for easy monitoring and debugging
- Session tracking and metrics
- Configurable log levels

Usage:
    from logger import create_logger_with_callback
    
    # Create logger and callback
    logger, callback = create_logger_with_callback(log_level="INFO")
    
    # Use with LangChain agent
    agent = initialize_agent(
        tools=tools,
        llm=llm,
        callbacks=[callback]
    )
"""

from .main import (
    AgentLogger,
    LangChainLoggerCallback,
    create_logger,
    create_callback,
    create_logger_with_callback,
)

__version__ = "0.1.0"
__author__ = "Your Name"
__email__ = "your.email@example.com"

__all__ = [
    "AgentLogger",
    "LangChainLoggerCallback", 
    "create_logger",
    "create_callback",
    "create_logger_with_callback",
]
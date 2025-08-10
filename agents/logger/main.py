"""
LangChain Agent Logger - A comprehensive logging solution for LangChain agents.

This module provides logging capabilities for LangChain agents including:
- Prompts and responses
- Tool calls and outputs
- Retrievals and embeddings
- Parameters and configurations
- Timestamps and execution metrics
- File and HTTP sink support
"""

import json
import time
import os
import requests
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from uuid import uuid4

from langchain.callbacks.base import BaseCallbackHandler
from langchain.schema import AgentAction, AgentFinish, LLMResult


class AgentLogger:
    """Main logger class for LangChain agents with file and HTTP sink support."""
    
    def __init__(
        self,
        log_level: str = "INFO",
        include_timestamps: bool = True,
        include_parameters: bool = True,
        log_file_path: str = None,
        push_url: str = None,
    ):
        """
        Initialize the agent logger.
        
        Args:
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            include_timestamps: Whether to include timestamps in logs
            include_parameters: Whether to log parameters
            log_file_path: Path to log file (defaults to logs/agent_{session_id}.log)
            push_url: URL to push logs via HTTP POST (optional)
        """
        self.session_id = str(uuid4())
        self.include_timestamps = include_timestamps
        self.include_parameters = include_parameters
        self.log_level = log_level.upper()
        self.push_url = push_url
        
        # Setup file logging
        if log_file_path is None:
            os.makedirs("logs", exist_ok=True)
            log_file_path = f"logs/agent_{self.session_id}.log"
        self.log_file_path = log_file_path
        
        # Track metrics
        self.start_time = time.time()
        self.call_count = 0
        self.error_count = 0
        
        print(f"[LOGGER] Agent Logger initialized - Session ID: {self.session_id}")
        print(f"[LOGGER] File sink: {self.log_file_path}")
        if self.push_url:
            print(f"[LOGGER] HTTP sink: {self.push_url}")
        
    def _create_base_log(self, event_type: str, **kwargs) -> Dict[str, Any]:
        """Create base log entry with common fields."""
        self.call_count += 1
        
        log_entry = {
            "session_id": self.session_id,
            "event_type": event_type,
            "call_id": str(uuid4()),
            "sequence_number": self.call_count,
        }
        
        if self.include_timestamps:
            log_entry["timestamp"] = datetime.now().isoformat()
            log_entry["elapsed_time"] = time.time() - self.start_time
            
        log_entry.update(kwargs)
        return log_entry
    
    def _should_log(self, level: str) -> bool:
        """Check if message should be logged based on log level."""
        levels = {"DEBUG": 0, "INFO": 1, "WARNING": 2, "ERROR": 3, "CRITICAL": 4}
        return levels.get(level, 1) >= levels.get(self.log_level, 1)
    
    def _write_to_file(self, log_entry: Dict[str, Any]):
        """Write log entry to file."""
        try:
            with open(self.log_file_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
        except Exception as e:
            print(f"[LOGGER ERROR] Failed to write to file: {e}")
    
    def _push_to_url(self, log_entry: Dict[str, Any]):
        """Push log entry to URL via HTTP POST."""
        if not self.push_url:
            return
            
        try:
            response = requests.post(
                self.push_url,
                json=log_entry,
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            if response.status_code != 200:
                print(f"[LOGGER WARNING] HTTP push failed with status {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"[LOGGER WARNING] HTTP push failed: {e}")
    
    def _log_to_sinks(self, log_entry: Dict[str, Any], level: str = "INFO"):
        """Log entry to all configured sinks."""
        if self._should_log(level):
            # Console sink (always enabled)
            print(f"[{level}] {json.dumps(log_entry, ensure_ascii=False)}")
            
            # File sink (always enabled)
            self._write_to_file(log_entry)
            
            # HTTP sink (if configured)
            self._push_to_url(log_entry)
    
    def log_prompt(self, prompt: str, model: str = None, parameters: Dict[str, Any] = None):
        """Log a prompt sent to the LLM."""
        log_data = {
            "prompt": prompt,
            "model": model,
        }
        
        if self.include_parameters and parameters:
            log_data["parameters"] = parameters
            
        log_entry = self._create_base_log("prompt", **log_data)
        self._log_to_sinks(log_entry, "INFO")
    
    def log_response(self, response: str, model: str = None, usage: Dict[str, Any] = None):
        """Log a response from the LLM."""
        log_data = {
            "response": response,
            "model": model,
        }
        
        if usage:
            log_data["usage"] = usage
            
        log_entry = self._create_base_log("response", **log_data)
        self._log_to_sinks(log_entry, "INFO")
    
    def log_tool_call(self, tool_name: str, tool_input: Any, tool_output: Any = None, error: str = None):
        """Log a tool call and its result."""
        log_data = {
            "tool_name": tool_name,
            "tool_input": tool_input,
        }
        
        if tool_output is not None:
            log_data["tool_output"] = tool_output
            
        if error:
            log_data["error"] = error
            self.error_count += 1
            
        log_entry = self._create_base_log("tool_call", **log_data)
        level = "ERROR" if error else "INFO"
        self._log_to_sinks(log_entry, level)
    
    def log_retrieval(self, query: str, documents: List[Dict[str, Any]], retriever_type: str = None):
        """Log document retrieval operations."""
        log_data = {
            "query": query,
            "documents_count": len(documents),
            "documents": documents,
            "retriever_type": retriever_type,
        }
        
        log_entry = self._create_base_log("retrieval", **log_data)
        self._log_to_sinks(log_entry, "INFO")
    
    def log_agent_action(self, action: str, reasoning: str = None, observation: str = None):
        """Log agent actions and reasoning."""
        log_data = {
            "action": action,
            "reasoning": reasoning,
            "observation": observation,
        }
        
        log_entry = self._create_base_log("agent_action", **log_data)
        self._log_to_sinks(log_entry, "INFO")
    
    def log_error(self, error: str, context: Dict[str, Any] = None):
        """Log errors with context."""
        self.error_count += 1
        
        log_data = {
            "error": error,
            "context": context or {},
        }
        
        log_entry = self._create_base_log("error", **log_data)
        self._log_to_sinks(log_entry, "ERROR")
    
    def log_custom(self, event_type: str, data: Dict[str, Any]):
        """Log custom events."""
        log_entry = self._create_base_log(event_type, **data)
        self._log_to_sinks(log_entry, "INFO")
    
    def get_session_summary(self) -> Dict[str, Any]:
        """Get summary of the current session."""
        return {
            "session_id": self.session_id,
            "start_time": datetime.fromtimestamp(self.start_time).isoformat(),
            "duration": time.time() - self.start_time,
            "total_calls": self.call_count,
            "error_count": self.error_count,
        }


class LangChainLoggerCallback(BaseCallbackHandler):
    """LangChain callback handler for automatic logging."""
    
    def __init__(self, logger: AgentLogger):
        """Initialize with an AgentLogger instance."""
        super().__init__()
        self.logger = logger
        self.run_start_times = {}
    
    def on_llm_start(
        self, 
        serialized: Dict[str, Any], 
        prompts: List[str], 
        **kwargs: Any
    ) -> Any:
        """Log when LLM starts processing."""
        run_id = kwargs.get('run_id', str(uuid4()))
        self.run_start_times[run_id] = time.time()
        
        for prompt in prompts:
            self.logger.log_prompt(
                prompt=prompt,
                model=serialized.get('name', 'unknown'),
                parameters=serialized.get('kwargs', {}) if self.logger.include_parameters else None
            )
    
    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> Any:
        """Log when LLM finishes processing."""
        run_id = kwargs.get('run_id')
        
        for generation_list in response.generations:
            for generation in generation_list:
                usage = getattr(response, 'llm_output', {}).get('usage', {})
                self.logger.log_response(
                    response=generation.text,
                    usage=usage
                )
    
    def on_llm_error(self, error: Union[Exception, KeyboardInterrupt], **kwargs: Any) -> Any:
        """Log LLM errors."""
        self.logger.log_error(
            error=str(error),
            context={"component": "llm", "kwargs": kwargs}
        )
    
    def on_tool_start(
        self, 
        serialized: Dict[str, Any], 
        input_str: str, 
        **kwargs: Any
    ) -> Any:
        """Log when a tool starts."""
        # Store tool start for later correlation
        run_id = kwargs.get('run_id', str(uuid4()))
        self.run_start_times[run_id] = {
            'start_time': time.time(),
            'tool_name': serialized.get('name', 'unknown'),
            'input': input_str
        }
    
    def on_tool_end(self, output: str, **kwargs: Any) -> Any:
        """Log when a tool finishes."""
        run_id = kwargs.get('run_id')
        tool_info = self.run_start_times.get(run_id, {})
        
        self.logger.log_tool_call(
            tool_name=tool_info.get('tool_name', 'unknown'),
            tool_input=tool_info.get('input', ''),
            tool_output=output
        )
        
        # Clean up
        if run_id in self.run_start_times:
            del self.run_start_times[run_id]
    
    def on_tool_error(self, error: Union[Exception, KeyboardInterrupt], **kwargs: Any) -> Any:
        """Log tool errors."""
        run_id = kwargs.get('run_id')
        tool_info = self.run_start_times.get(run_id, {})
        
        self.logger.log_tool_call(
            tool_name=tool_info.get('tool_name', 'unknown'),
            tool_input=tool_info.get('input', ''),
            error=str(error)
        )
        
        # Clean up
        if run_id in self.run_start_times:
            del self.run_start_times[run_id]
    
    def on_agent_action(self, action: AgentAction, **kwargs: Any) -> Any:
        """Log agent actions."""
        self.logger.log_agent_action(
            action=f"{action.tool}: {action.tool_input}",
            reasoning=action.log
        )
    
    def on_agent_finish(self, finish: AgentFinish, **kwargs: Any) -> Any:
        """Log when agent finishes."""
        self.logger.log_agent_action(
            action="agent_finish",
            reasoning=finish.log,
            observation=str(finish.return_values)
        )


# Convenience functions
def create_logger(
    log_level: str = "INFO",
    push_url: str = None,
    **kwargs
) -> AgentLogger:
    """Create a new AgentLogger instance."""
    return AgentLogger(log_level=log_level, push_url=push_url, **kwargs)


def create_callback(logger: AgentLogger) -> LangChainLoggerCallback:
    """Create a LangChain callback handler."""
    return LangChainLoggerCallback(logger)


def create_logger_with_callback(
    log_level: str = "INFO",
    push_url: str = None,
    **kwargs
) -> tuple[AgentLogger, LangChainLoggerCallback]:
    """Create both logger and callback handler."""
    logger = create_logger(log_level=log_level, push_url=push_url, **kwargs)
    callback = create_callback(logger)
    return logger, callback
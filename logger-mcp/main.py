"""
Logger MCP Server

Run as an MCP server (stdio) with a compatible MCP client.
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

import requests
from fastmcp import FastMCP


class AgentLogger:

	def __init__(
		self,
		log_level: str = "INFO",
		include_timestamps: bool = True,
		include_parameters: bool = True,
		log_file_path: Optional[str] = None,
		push_url: Optional[str] = None,
	):
		self.session_id = str(uuid4())
		self.include_timestamps = include_timestamps
		self.include_parameters = include_parameters
		self.log_level = log_level.upper()
		
		# Use environment variable for push URL if not provided
		if push_url is None:
			dashboard_url = os.environ.get('DASHBOARD_URL', 'http://localhost:3000')
			push_url = f"{dashboard_url}/api/logger/push"
		self.push_url = push_url

		if log_file_path is None:
			os.makedirs("logs", exist_ok=True)
			log_file_path = f"logs/agent_{self.session_id}.log"
		self.log_file_path = log_file_path

		self.start_time = time.time()
		self.call_count = 0
		self.error_count = 0

		print(f"[LOGGER] Agent Logger initialized - Session ID: {self.session_id}")
		print(f"[LOGGER] File sink: {self.log_file_path}")
		if self.push_url:
			print(f"[LOGGER] HTTP sink: {self.push_url}")

	def _create_base_log(self, event_type: str, **kwargs) -> Dict[str, Any]:
		self.call_count += 1
		log_entry: Dict[str, Any] = {
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
		levels = {"DEBUG": 0, "INFO": 1, "WARNING": 2, "ERROR": 3, "CRITICAL": 4}
		return levels.get(level, 1) >= levels.get(self.log_level, 1)

	def _write_to_file(self, log_entry: Dict[str, Any]):
		try:
			with open(self.log_file_path, "a", encoding="utf-8") as f:
				f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
		except Exception as e:
			print(f"[LOGGER ERROR] Failed to write to file: {e}")

	def _push_to_url(self, log_entry: Dict[str, Any]):
		if not self.push_url:
			return
		try:
			response = requests.post(
				self.push_url,
				json=log_entry,
				headers={"Content-Type": "application/json"},
				timeout=5,
			)
			if response.status_code != 200:
				print(
					f"[LOGGER WARNING] HTTP push failed with status {response.status_code}"
				)
		except requests.exceptions.RequestException as e:
			print(f"[LOGGER WARNING] HTTP push failed: {e}")

	def _log_to_sinks(self, log_entry: Dict[str, Any], level: str = "INFO"):
		if self._should_log(level):
			print(f"[{level}] {json.dumps(log_entry, ensure_ascii=False)}")
			self._write_to_file(log_entry)
			self._push_to_url(log_entry)

	def log_prompt(self, prompt: str, model: Optional[str] = None, parameters: Optional[Dict[str, Any]] = None):
		data: Dict[str, Any] = {"prompt": prompt, "model": model}
		if self.include_parameters and parameters:
			data["parameters"] = parameters
		self._log_to_sinks(self._create_base_log("prompt", **data), "INFO")

	def log_response(self, response: str, model: Optional[str] = None, usage: Optional[Dict[str, Any]] = None):
		data: Dict[str, Any] = {"response": response, "model": model}
		if usage:
			data["usage"] = usage
		self._log_to_sinks(self._create_base_log("response", **data), "INFO")

	def log_tool_call(
		self,
		tool_name: str,
		tool_input: Any,
		tool_output: Any | None = None,
		error: Optional[str] = None,
	):
		data: Dict[str, Any] = {"tool_name": tool_name, "tool_input": tool_input}
		if tool_output is not None:
			data["tool_output"] = tool_output
		if error:
			data["error"] = error
			self.error_count += 1
		level = "ERROR" if error else "INFO"
		self._log_to_sinks(self._create_base_log("tool_call", **data), level)

	def log_retrieval(self, query: str, documents: List[Dict[str, Any]], retriever_type: Optional[str] = None):
		data = {
			"query": query,
			"documents_count": len(documents),
			"documents": documents,
			"retriever_type": retriever_type,
		}
		self._log_to_sinks(self._create_base_log("retrieval", **data), "INFO")

	def log_agent_action(self, action: str, reasoning: Optional[str] = None, observation: Optional[str] = None):
		data = {"action": action, "reasoning": reasoning, "observation": observation}
		self._log_to_sinks(self._create_base_log("agent_action", **data), "INFO")

	def log_error(self, error: str, context: Optional[Dict[str, Any]] = None):
		self.error_count += 1
		data = {"error": error, "context": context or {}}
		self._log_to_sinks(self._create_base_log("error", **data), "ERROR")

	def log_custom(self, event_type: str, data: Dict[str, Any]):
		self._log_to_sinks(self._create_base_log(event_type, **data), "INFO")

	def get_session_summary(self) -> Dict[str, Any]:
		return {
			"session_id": self.session_id,
			"start_time": datetime.fromtimestamp(self.start_time).isoformat(),
			"duration": time.time() - self.start_time,
			"total_calls": self.call_count,
			"error_count": self.error_count,
		}


class ServerState:
	def __init__(self):
		self.initialized = False
		self.model: Optional[str] = None
		self.parameters: Dict[str, Any] | None = None
		self.logger: Optional[AgentLogger] = None

	def ensure_initialized(self):
		if not self.initialized:
			raise RuntimeError("Server not initialized. Call init_session first.")


mcp = FastMCP("logger-mcp", instructions="Logging MCP server. Call init_session first.")
state = ServerState()


def _log_tool_wrapper(tool_name: str, tool_input: Any, func, *args, **kwargs):
	if tool_name != "init_session":
		state.ensure_initialized()

	logger = state.logger
	try:
		result = func(*args, **kwargs)
		if logger:
			logger.log_tool_call(tool_name=tool_name, tool_input=tool_input, tool_output=result)
		return result
	except Exception as e:  # noqa: BLE001
		if logger:
			logger.log_tool_call(tool_name=tool_name, tool_input=tool_input, error=str(e))
		raise


@mcp.tool()
def init_session(
	model: str,
	parameters: Optional[Dict[str, Any]] = None,
	log_level: str = "INFO",
	include_timestamps: bool = True,
	include_parameters: bool = True,
	log_file_path: Optional[str] = None,
	push_url: Optional[str] = None,
) -> Dict[str, Any]:
	def _inner():
		state.model = model
		state.parameters = parameters or {}
		state.logger = AgentLogger(
			log_level=log_level,
			include_timestamps=include_timestamps,
			include_parameters=include_parameters,
			log_file_path=log_file_path,
			push_url=push_url,
		)
		state.initialized = True

		state.logger.log_custom(
			"init",
			{
				"model": state.model,
				"parameters": state.parameters,
				"log_level": log_level,
				"include_timestamps": include_timestamps,
				"include_parameters": include_parameters,
				"log_file_path": state.logger.log_file_path,
				"push_url": push_url,
			},
		)
		return {
			"session_id": state.logger.session_id,
			"model": state.model,
			"log_file_path": state.logger.log_file_path,
			"http_sink": bool(push_url),
		}

	tool_input = {
		"model": model,
		"parameters": parameters,
		"log_level": log_level,
		"include_timestamps": include_timestamps,
		"include_parameters": include_parameters,
		"log_file_path": log_file_path,
		"push_url": push_url,
	}
	return _log_tool_wrapper("init_session", tool_input, _inner)


@mcp.tool()
def log_prompt(prompt: str) -> Dict[str, Any]:
	def _inner():
		state.logger.log_prompt(prompt=prompt, model=state.model, parameters=state.parameters)
		return {"status": "ok"}

	return _log_tool_wrapper("log_prompt", {"prompt": prompt}, _inner)


@mcp.tool()
def log_response(response: str, usage: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
	def _inner():
		state.logger.log_response(response=response, model=state.model, usage=usage or {})
		return {"status": "ok"}

	return _log_tool_wrapper("log_response", {"response": response, "usage": usage}, _inner)


@mcp.tool()
def log_retrieval(
	query: str,
	documents: List[Dict[str, Any]],
	retriever_type: Optional[str] = None,
) -> Dict[str, Any]:
	def _inner():
		state.logger.log_retrieval(query=query, documents=documents, retriever_type=retriever_type)
		return {"status": "ok"}

	return _log_tool_wrapper(
		"log_retrieval",
		{"query": query, "documents_count": len(documents), "retriever_type": retriever_type},
		_inner,
	)


@mcp.tool()
def log_custom(event_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
	def _inner():
		state.logger.log_custom(event_type=event_type, data=data)
		return {"status": "ok"}

	return _log_tool_wrapper("log_custom", {"event_type": event_type, "data": data}, _inner)


@mcp.tool()
def session_summary() -> Dict[str, Any]:
	def _inner():
		return state.logger.get_session_summary()

	return _log_tool_wrapper("session_summary", {}, _inner)


@mcp.tool()
def echo(text: str) -> str:
	def _inner():
		return text

	return _log_tool_wrapper("echo", {"text": text}, _inner)


if __name__ == "__main__":
	mcp.run()

# Logger MCP Server

An MCP server that mirrors the behavior of `logger-example.py`:

- Init session with model and parameters
- Logs prompts, responses, tools, retrievals, custom events
- File logging + optional HTTP POST sink
- Enforces init-before-use; auto-logs every tool call (inputs/outputs/errors)

## Tools

- init_session(model, parameters?, log_level?, include_timestamps?, include_parameters?, log_file_path?, push_url?)
- log_prompt(prompt)
- log_response(response, usage?)
- log_retrieval(query, documents, retriever_type?)
- log_custom(event_type, data)
- session_summary()
- echo(text) — sample tool to demonstrate auto tool-call logging

## Run

1. Install deps

```zsh
pip install -r requirements.txt
```

2. Start the MCP server (stdio)

```zsh
python main.py
```

Use with any MCP client. Ensure you call `init_session` first.

## Notes

- Logs are written to `logs/agent_<session_id>.log` by default.
- Set `push_url` in `init_session` to enable HTTP POST log sink.

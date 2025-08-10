// Simple test script to verify the logger API endpoint
async function testLogger() {
  const testLogEntry = {
    session_id: "test-session-123",
    event_type: "user_input",
    call_id: "call-456",
    sequence_number: 1,
    timestamp: new Date().toISOString(),
    input: "Hello, this is a test message",
    agent_type: "customer_service"
  };

  try {
    const response = await fetch('http://localhost:3001/api/logger/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testLogEntry)
    });

    const result = await response.json();
    console.log('Response:', result);
    console.log('Status:', response.status);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test different log entry types
async function testDifferentLogTypes() {
  const testEntries = [
    {
      session_id: "test-session-123",
      event_type: "agent_init",
      call_id: "call-001",
      sequence_number: 1,
      agent_type: "customer_service",
      tools_count: 5,
      model: "gpt-4",
      max_iterations: 10
    },
    {
      session_id: "test-session-123",
      event_type: "prompt",
      call_id: "call-002",
      sequence_number: 2,
      prompt: "What can I help you with today?",
      model: "gpt-4",
      parameters: {
        temperature: 0.7,
        max_tokens: 1000
      }
    },
    {
      session_id: "test-session-123",
      event_type: "tool_call",
      call_id: "call-003",
      sequence_number: 3,
      tool_name: "search_database",
      tool_input: { query: "customer orders" },
      tool_output: { results: ["order1", "order2"] }
    },
    {
      session_id: "test-session-123",
      event_type: "error",
      call_id: "call-004",
      sequence_number: 4,
      error: "Database connection failed",
      context: {
        component: "database",
        user_input: "search orders"
      }
    }
  ];

  for (const entry of testEntries) {
    try {
      console.log(`\nTesting ${entry.event_type} log entry...`);
      const response = await fetch('http://localhost:3001/api/logger/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry)
      });

      const result = await response.json();
      console.log('Response:', result);
      console.log('Status:', response.status);
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

console.log('Starting logger tests...');
testDifferentLogTypes();

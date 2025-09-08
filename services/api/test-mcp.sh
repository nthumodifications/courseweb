#!/bin/bash

# Simple test script to validate MCP server JSON-RPC responses

echo "Testing MCP Server JSON-RPC endpoints..."

# Test 1: Initialize
echo -e "\n1. Testing initialize method:"
curl_data='{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {},
  "id": 1
}'

echo "Request: $curl_data"
echo "Expected: Should return protocol version and capabilities"

# Test 2: List tools
echo -e "\n2. Testing tools/list method:"
curl_data='{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "params": {},
  "id": 2
}'

echo "Request: $curl_data" 
echo "Expected: Should return list of available tools"

# Test 3: List resources
echo -e "\n3. Testing resources/list method:"
curl_data='{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "params": {},
  "id": 3
}'

echo "Request: $curl_data"
echo "Expected: Should return list of available resources"

echo -e "\nTo test the actual endpoints, deploy the service and use:"
echo 'curl -X POST https://api.nthumods.com/mcp -H "Content-Type: application/json" -d '"'"'$curl_data'"'"

echo -e "\nSearch endpoint test:"
echo 'curl "https://api.nthumods.com/search?q=machine%20learning&limit=5"'

echo -e "\nMCP Server info:"
echo 'curl "https://api.nthumods.com/mcp"'
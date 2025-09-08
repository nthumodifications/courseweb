#!/bin/bash

# Comprehensive test script for MCP server and Search API endpoints

echo "🧪 Testing CourseWeb MCP Server and Search API"
echo "=============================================="

# Test endpoints (change these to match your deployment)
MCP_ENDPOINT="https://api.nthumods.com/mcp"
SEARCH_ENDPOINT="https://api.nthumods.com/search"

echo -e "\n📋 Available Tests:"
echo "1. MCP Server Info (GET)"
echo "2. MCP Initialize" 
echo "3. MCP Tools List"
echo "4. MCP Resources List"
echo "5. MCP Tool Call - Search Courses"
echo "6. Search API - GET endpoint"
echo "7. Search API - POST endpoint"
echo "8. Search API - Info endpoint"

echo -e "\n🔧 Validation Tests (no network required):"
echo "9. Run MCP structure validation"
echo "10. Run Search API validation"

echo -e "\nSelect test to run (1-10) or 'all' for all network tests:"
read -r choice

run_mcp_info() {
    echo -e "\n🔍 Test 1: MCP Server Info"
    echo "curl -X GET $MCP_ENDPOINT"
    echo "Expected: Server capabilities and info"
    # curl -X GET "$MCP_ENDPOINT" | jq '.' 2>/dev/null || echo "❌ Failed or jq not available"
}

run_mcp_initialize() {
    echo -e "\n🚀 Test 2: MCP Initialize"
    local request='{
        "jsonrpc": "2.0",
        "method": "initialize", 
        "params": {},
        "id": 1
    }'
    echo "curl -X POST $MCP_ENDPOINT -H 'Content-Type: application/json' -d '$request'"
    echo "Expected: Protocol version and capabilities"
    # curl -X POST "$MCP_ENDPOINT" -H "Content-Type: application/json" -d "$request" | jq '.' 2>/dev/null || echo "❌ Failed or jq not available"
}

run_mcp_tools_list() {
    echo -e "\n🔧 Test 3: MCP Tools List"
    local request='{
        "jsonrpc": "2.0",
        "method": "tools/list",
        "params": {},
        "id": 2
    }'
    echo "curl -X POST $MCP_ENDPOINT -H 'Content-Type: application/json' -d '$request'"
    echo "Expected: List of 4 available tools"
    # curl -X POST "$MCP_ENDPOINT" -H "Content-Type: application/json" -d "$request" | jq '.' 2>/dev/null || echo "❌ Failed or jq not available"
}

run_mcp_resources_list() {
    echo -e "\n📚 Test 4: MCP Resources List"
    local request='{
        "jsonrpc": "2.0",
        "method": "resources/list",
        "params": {},
        "id": 3
    }'
    echo "curl -X POST $MCP_ENDPOINT -H 'Content-Type: application/json' -d '$request'"
    echo "Expected: List of 2 available resources"
    # curl -X POST "$MCP_ENDPOINT" -H "Content-Type: application/json" -d "$request" | jq '.' 2>/dev/null || echo "❌ Failed or jq not available"
}

run_mcp_search_tool() {
    echo -e "\n🔍 Test 5: MCP Search Tool Call"
    local request='{
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "search_courses",
            "arguments": {
                "query": "machine learning",
                "limit": 3
            }
        },
        "id": 4
    }'
    echo "curl -X POST $MCP_ENDPOINT -H 'Content-Type: application/json' -d '$request'"
    echo "Expected: Search results with course information"
    # curl -X POST "$MCP_ENDPOINT" -H "Content-Type: application/json" -d "$request" | jq '.' 2>/dev/null || echo "❌ Failed or jq not available"
}

run_search_get() {
    echo -e "\n🔎 Test 6: Search API GET"
    local url="$SEARCH_ENDPOINT?q=machine%20learning&limit=5"
    echo "curl '$url'"
    echo "Expected: Algolia search results"
    # curl "$url" | jq '.' 2>/dev/null || echo "❌ Failed or jq not available"
}

run_search_post() {
    echo -e "\n📤 Test 7: Search API POST"
    local request='{
        "query": "artificial intelligence",
        "limit": 3,
        "filters": "department:\"Computer Science\""
    }'
    echo "curl -X POST $SEARCH_ENDPOINT -H 'Content-Type: application/json' -d '$request'"
    echo "Expected: Filtered search results"
    # curl -X POST "$SEARCH_ENDPOINT" -H "Content-Type: application/json" -d "$request" | jq '.' 2>/dev/null || echo "❌ Failed or jq not available"
}

run_search_info() {
    echo -e "\n📋 Test 8: Search API Info"
    echo "curl -X GET $SEARCH_ENDPOINT/info"
    echo "Expected: API documentation and examples"
    # curl -X GET "$SEARCH_ENDPOINT/info" | jq '.' 2>/dev/null || echo "❌ Failed or jq not available"
}

run_mcp_validation() {
    echo -e "\n✅ Test 9: MCP Structure Validation"
    if [ -f "test-mcp-validation.js" ]; then
        node test-mcp-validation.js
    else
        echo "❌ test-mcp-validation.js not found"
    fi
}

run_search_validation() {
    echo -e "\n✅ Test 10: Search API Validation"
    if [ -f "test-search-validation.js" ]; then
        node test-search-validation.js
    else
        echo "❌ test-search-validation.js not found"
    fi
}

run_all_network_tests() {
    echo -e "\n🌐 Running all network tests..."
    run_mcp_info
    run_mcp_initialize
    run_mcp_tools_list
    run_mcp_resources_list
    run_mcp_search_tool
    run_search_get
    run_search_post
    run_search_info
}

# Execute based on user choice
case $choice in
    1) run_mcp_info ;;
    2) run_mcp_initialize ;;
    3) run_mcp_tools_list ;;
    4) run_mcp_resources_list ;;
    5) run_mcp_search_tool ;;
    6) run_search_get ;;
    7) run_search_post ;;
    8) run_search_info ;;
    9) run_mcp_validation ;;
    10) run_search_validation ;;
    all) run_all_network_tests ;;
    *) echo "❌ Invalid choice. Please run again with a valid option." ;;
esac

echo -e "\n📝 Notes:"
echo "- Uncomment curl commands in script to run actual network tests"
echo "- Install jq for pretty JSON formatting: sudo apt install jq"
echo "- Update endpoints at top of script for your deployment"
echo "- Validation tests (9-10) work without network connection"

echo -e "\n🔗 Quick References:"
echo "- MCP Documentation: https://modelcontextprotocol.io/"
echo "- JSON-RPC 2.0 Spec: https://www.jsonrpc.org/specification"
echo "- Usage Guide: ./MCP_USAGE_GUIDE.md"
echo "- Example Client: node mcp-client-example.cjs"
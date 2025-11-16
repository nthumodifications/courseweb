# NTHUMods AI Assistant

An intelligent AI-powered chatbot for course planning at National Tsing Hua University, integrated directly into NTHUMods.

## Features

### 🤖 Multi-Provider AI Support
- **Google Gemini** (Free Tier) - Default provider
- **OpenAI GPT-4o-mini** - Advanced language understanding
- **Anthropic Claude** - Excellent reasoning capabilities

### 🔧 MCP Tool Integration
The chatbot has access to the following tools via the MCP (Model Context Protocol) server:

1. **search_courses** - Search for courses by topic, name, or instructor
2. **get_course_details** - Get comprehensive course information
3. **get_course_syllabus** - Access detailed syllabus and grading information
4. **get_multiple_courses** - Fetch information for multiple courses at once
5. **bulk_search_courses** - Search across multiple topics with filters

### 🎓 Course Planning Capabilities
- Find courses matching your interests
- Get course recommendations based on requirements
- Check prerequisites and restrictions
- Compare courses across different topics
- Plan semester schedules
- Explore graduation requirements (when provided)

## Getting Started

### For Users

1. **Navigate to the Chatbot**
   - Click on the "AI Assistant" button in the sidebar
   - Or access it from the mobile navigation menu

2. **Configure API Key** (Optional)
   - Click the Settings icon in the chatbot header
   - Select your preferred AI provider
   - Enter your API key
   - Keys are stored securely in your browser's localStorage

3. **Start Chatting**
   - Ask questions about courses
   - Request course recommendations
   - Get help with course planning

### Example Queries

- "What machine learning courses are available?"
- "Help me plan my CS courses for next semester"
- "Find English-taught CS courses"
- "What are the prerequisites for deep learning courses?"
- "Compare data science and artificial intelligence courses"
- "Show me courses taught by Professor Wang"

## Configuration

### Environment Variables

Add these to your `.env.local` file (optional - users can provide their own keys via UI):

```env
# AI Provider API Keys (Optional - users can provide via UI)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# MCP Server URL (defaults to production)
NEXT_PUBLIC_MCP_SERVER_URL=https://api.nthumods.com/mcp
```

### Getting API Keys

#### Google Gemini (Free Tier)
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy and paste into the chatbot settings

#### OpenAI
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account or sign in
3. Generate a new API key
4. Add billing information (pay-as-you-go)
5. Copy and paste into the chatbot settings

#### Anthropic Claude
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Generate a new key
5. Copy and paste into the chatbot settings

## Architecture

### Technology Stack
- **Frontend**: React with Next.js 14
- **AI SDK**: Vercel AI SDK
- **UI Components**: Radix UI + Tailwind CSS
- **State Management**: React hooks
- **API Communication**: MCP (Model Context Protocol)

### Data Flow

```
User → Chat UI → /api/chat → AI Provider (Gemini/OpenAI/Claude)
                     ↓
                MCP Server → Course Database → Response
                     ↓
                Chat UI ← Formatted Response
```

### Security

- API keys are stored in browser localStorage (client-side only)
- Keys are never sent to our servers (except when making AI requests)
- Server-side API keys (if configured) are stored in environment variables
- MCP server communication uses HTTPS

## Cost Structure

### Free Tier (Default)
- **Google Gemini**: 1,500 requests/day (free tier)
- No cost for NTHUMods
- No cost for users with default configuration

### With Custom Keys
- Users bring their own API keys
- Costs vary by provider:
  - Google Gemini: Free tier available
  - OpenAI: Pay-as-you-go (~$0.0001-0.001 per request)
  - Anthropic: Pay-as-you-go (~$0.003 per request)

## Development

### Local Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your API keys
```

3. Run development server:
```bash
npm run dev
```

4. Access the chatbot at:
```
http://localhost:3000/en/chatbot
```

### Testing

Test the chatbot with different providers:

```bash
# Set environment variable for testing
export GOOGLE_GENERATIVE_AI_API_KEY=your_test_key

# Run the development server
npm run dev
```

## Troubleshooting

### "Please configure your API key in settings first"
- Click the Settings icon
- Enter a valid API key for your chosen provider
- Make sure the key has proper permissions

### "Failed to send message"
- Check your internet connection
- Verify your API key is valid and has credits
- Check browser console for detailed error messages

### "Course not found" or "No results"
- Try different search terms
- Search by topic/name rather than course codes
- Use broader search terms (e.g., "machine learning" instead of "ML")

## Future Enhancements

- [ ] Integration with user's existing timetable
- [ ] Access to user's registered courses
- [ ] Automatic graduation requirement checking
- [ ] Visual timetable generation
- [ ] Course recommendation based on academic history
- [ ] Export conversation history
- [ ] Share recommended courses with friends

## Contributing

Found a bug or have a feature request? Please open an issue on GitHub.

## License

This feature is part of NTHUMods and follows the same GPL-3.0 license.

---

**Made with ❤️ for NTHU students**

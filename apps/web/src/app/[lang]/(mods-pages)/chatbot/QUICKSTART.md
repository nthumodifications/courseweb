# NTHUMods AI Chatbot - Quick Start Guide

## 🚀 Getting Started

### 1. Access the Chatbot
Navigate to the chatbot by:
- Clicking "AI Assistant" / "AI 助手" in the sidebar
- Tapping the sparkle icon in the mobile bottom navigation
- Direct URL: `https://nthumods.com/en/chatbot`

### 2. Configure Your AI Provider (Optional)

The chatbot works out of the box with our default Gemini API key. For unlimited usage or to try other AI models:

#### Steps:
1. Click the **Settings** (⚙️) icon in the chatbot header
2. Select your preferred AI provider:
   - **Google Gemini** - Best for general use (free tier available)
   - **OpenAI GPT-4o-mini** - Great reasoning capabilities
   - **Anthropic Claude** - Excellent for complex planning

3. Enter your API key:
   - **Google Gemini**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - **OpenAI**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
   - **Anthropic**: Get from [Anthropic Console](https://console.anthropic.com/)

4. Click **Save settings**

> 💡 **Note**: Your API key is stored locally in your browser and never sent to NTHUMods servers.

## 📚 What Can I Ask?

### Course Discovery
- "What machine learning courses are available?"
- "Show me all CS courses taught in English"
- "Find courses about databases"
- "Which professors teach artificial intelligence?"

### Course Planning
- "Help me plan my CS courses for next semester"
- "I'm a first-year EE student, what should I take?"
- "What courses should I take before machine learning?"
- "Suggest courses for someone interested in AI and robotics"

### Course Comparison
- "Compare data science and artificial intelligence courses"
- "What's the difference between CS 101 and CS 102?"
- "Which machine learning course is easier?"

### Detailed Information
- "Tell me about the grading for CS 535100"
- "What are the prerequisites for deep learning?"
- "When does the computer networks course meet?"
- "How many credits is the database course?"

### Department-Specific
- "Show me all CS department courses"
- "What EE courses are available this semester?"
- "Find Chinese-taught MATH courses"

## 💡 Pro Tips

### Better Search Results
✅ **DO**: Search by topic or course name
- "machine learning"
- "data structures"
- "algorithms"

❌ **DON'T**: Search by course codes initially
- Avoid: "CS535100" or "EE200201"
- The chatbot will find course codes for you

### Getting Detailed Info
1. First, ask for courses on a topic
2. The chatbot will provide course codes (raw_id)
3. Ask for more details about specific courses
4. Example:
   ```
   You: "What machine learning courses are available?"
   Bot: [Lists courses with codes]
   You: "Tell me more about the first one"
   Bot: [Provides detailed syllabus]
   ```

### Planning Your Semester
Provide context for better recommendations:
- Your department and year
- Your interests and career goals
- Courses you've already taken
- Time preferences (morning/afternoon classes)

Example:
```
You: "I'm a second-year CS student interested in AI. 
      I've taken data structures and linear algebra. 
      What should I take next semester?"
```

## 🔧 Troubleshooting

### "Please configure your API key in settings first"
**Solution**: 
- If using default Gemini, this shouldn't appear
- If you changed providers, enter your API key in settings
- Make sure you clicked "Save settings"

### "Failed to send message"
**Possible causes**:
1. API key is invalid
   - Check your key in settings
   - Regenerate key from provider's website

2. API quota exceeded
   - Gemini free tier: 1,500 requests/day
   - Switch to a different provider or wait 24 hours

3. Network issues
   - Check your internet connection
   - Try refreshing the page

### "No courses found"
**Try**:
- Use broader search terms
- Search by topic instead of course code
- Check spelling
- Try searching in Chinese (if applicable)

### Chatbot is slow or unresponsive
**Solutions**:
- Check your internet connection
- Switch to a faster AI provider (GPT-4o-mini is usually fastest)
- Clear your browser cache
- Refresh the page

## 🎯 Example Conversations

### Example 1: Finding ML Courses
```
You: What machine learning courses are available?

Bot: Let me search for machine learning courses...
     [Tool: search_courses]
     
     I found 5 machine learning courses:
     
     1. CS 535100 - Machine Learning
        - Instructor: Prof. Chen
        - Credits: 3
        - Language: English
        - Times: Mon/Wed 2:20-3:20 PM
     
     2. EE 524000 - Introduction to Machine Learning
        ...
     
     Would you like more details about any of these courses?

You: Tell me about the grading for CS 535100

Bot: Let me get the syllabus details...
     [Tool: get_course_syllabus]
     
     CS 535100 - Machine Learning Grading:
     - Homework: 30%
     - Midterm Exam: 30%
     - Final Project: 40%
     
     Important dates:
     - Midterm: Week 9
     - Final Project Due: Week 18
```

### Example 2: Course Planning
```
You: I'm a first-year CS student. What foundational courses should I take?

Bot: For a first-year CS student, I recommend starting with these 
     foundational courses:
     
     1. Programming (CS 101) - Essential first step
     2. Data Structures (CS 201) - After programming
     3. Linear Algebra (MATH 211) - Important for advanced CS
     4. Discrete Mathematics (CS 150) - For algorithms
     
     Would you like me to:
     - Check the schedule for these courses?
     - Find similar courses taught in Chinese?
     - Suggest additional courses based on your interests?

You: Show me the schedule for CS 101 and CS 201

Bot: [Provides detailed schedule information]
```

## 📖 Additional Resources

- **Full Documentation**: See [README.md](./README.md) in the chatbot folder
- **Issue Reporting**: Found a bug? Report it on [GitHub Issues](https://github.com/nthumodifications/courseweb/issues)
- **Feature Requests**: Have an idea? Let us know!

## 🤝 Feedback

We'd love to hear your feedback!
- What features would you like to see?
- How can we improve course recommendations?
- Any bugs or issues to report?

Contact us: nthumods@gmail.com

---

**Happy course planning! 🎓✨**

# Gemini API Setup Guide

## Getting Your Google Gemini API Key

1. **Visit Google AI Studio**: Go to [https://ai.google.dev/](https://ai.google.dev/)

2. **Sign in**: Use your Google account to sign in

3. **Get API Key**:

   - Click on "Get API Key" or "API Key" in the navigation
   - Create a new API key or use an existing one
   - Copy the API key

4. **Set up Environment**:

   ```bash
   # Copy the example file
   cp .env.example .env

   # Edit the .env file and add your key
   GOOGLE_API_KEY=your_actual_api_key_here
   ```

## Installation Steps

1. **Install Dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

2. **Set Environment Variables**:

   ```bash
   # Make sure your .env file contains:
   GOOGLE_API_KEY=your_actual_google_gemini_api_key_here
   ```

3. **Run the Server**:
   ```bash
   python server.py
   ```

## Why Switch to Gemini?

- **Cost Effective**: Gemini offers competitive pricing
- **Performance**: Excellent performance for conversational AI
- **Integration**: Good LangChain integration
- **Accessibility**: Easy to get API keys from Google

## Troubleshooting

### API Key Issues

- Ensure your API key is valid and active
- Check that billing is enabled in Google Cloud Console
- Verify the key has necessary permissions

### Import Errors

- Make sure `langchain-google-genai` is installed
- Check that all dependencies are properly installed

### Rate Limits

- Gemini has rate limits - implement proper error handling
- Consider adding delays between requests if needed

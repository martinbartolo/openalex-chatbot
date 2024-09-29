# OpenAlex Chatbot

This project is a React-based chatbot that interacts with the OpenAlex API to provide academic paper information and summaries.

## Features

- Interactive chat interface
- Integration with OpenAlex API for academic paper searches
- Paper summaries generated using OpenAI's GPT model
- Responsive design using Tailwind CSS

## Prerequisites

- Docker
- OpenAI API key

## Running with Docker

1. Clone the repository:

   ```
   git clone https://github.com/martinbartolo/openalex-chatbot.git
   cd openalex-chatbot
   ```

2. Create a `.env` file in the root directory with your OpenAI API key:

   ```
   REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
   ```

3. Build the Docker image:

   ```
   docker build -t openalex-chatbot .
   ```

4. Run the Docker container:

   ```
   docker run -p 3000:3000 openalex-chatbot
   ```

5. Open your browser and navigate to `http://localhost:3000` to use the application.

## Development

For local development without Docker, you can use the following commands:

```
npm install
npm start
```

## Project Structure

- `src/components`: React components for the UI
- `src/hooks`: Custom React hooks, including the main `useChat` hook
- `src/utils`: Utility functions and constants
- `src/types`: TypeScript type definitions

## Key Design Decisions

1. **React with TypeScript**: Ensures type safety and improves developer experience.
2. **Custom useChat Hook**: Centralizes chat logic and API interactions for better state management.
3. **OpenAI Integration**: Utilizes GPT model for generating paper summaries.
4. **Tailwind CSS**: Provides a utility-first CSS framework for responsive design.
5. **Zod**: Used for runtime type checking and validation of API responses.
6. **Streaming Responses**: Implements streaming for real-time updates of paper summaries.

## Notes

- The project uses environment variables for API keys. Ensure these are set correctly in production environments.
- The OpenAlex API is used for academic paper searches. Be aware of any usage limits or terms of service.
- The OpenAI API is used for generating summaries. Costs may be incurred based on usage.

## Learn More

To learn more about the technologies used in this project:

- [React Documentation](https://reactjs.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [OpenAlex API Documentation](https://docs.openalex.org/)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## AI Assistance Disclosure

During the development of this project, I utilized AI assistance, specifically the Cursor IDE, for the following purposes:

1. Code review and suggestions for improvement
2. Debugging assistance
3. Clarification on best practices and implementation details
4. Generation of code comments and documentation

It's important to note that while AI was used as a supportive tool, all architectural decisions, code structure, and core implementation were done by me. The AI was primarily used to enhance code quality, provide alternative perspectives, and assist with documentation. All AI suggestions were critically evaluated and integrated only when they aligned with the project's goals and my coding standards.

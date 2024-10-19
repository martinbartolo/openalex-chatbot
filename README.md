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

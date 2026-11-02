# AI Portfolio Assistant

An AI-powered personal portfolio that allows visitors to ask questions about my background, technical skills, projects, and research.

## Features

- Interactive portfolio interface built with React and TypeScript.
- FastAPI backend for processing user queries.
- Streaming AI responses using the Groq API.
- Conversation history support.
- Resume access and portfolio navigation.

## Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- CSS

**Backend**
- Python
- FastAPI
- Uvicorn
- Groq API
- uv for Python dependency management

## Project Structure

```text
myselfai/
├── backend/
├── frontend/
├── main.py
├── pyproject.toml
├── uv.lock
├── .python-version
├── .env.example
├── .gitignore
└── README.md
```

The structure above is illustrative. Update it to reflect the actual locations of your application files.

## Prerequisites

- Python version specified by the project
- uv
- Node.js and npm
- A Groq API key

## Backend Setup

1. Clone the repository.
2. Configure the required environment variables using `.env.example` as a reference.
3. Install Python dependencies using `uv sync`.
4. Start the FastAPI server using the appropriate Uvicorn command for your application.

## Frontend Setup

1. Open a terminal in the `frontend` directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

## Environment Variables

Create the required local `.env` file using `.env.example` as a reference.

Never commit real API keys or other secrets to the repository.

## Status

This project is under active development.
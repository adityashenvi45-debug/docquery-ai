# DocQuery - AI Document Question-Answering System

DocQuery is a web-based AI Document Question-Answering System.

It allows users to upload PDF, DOCX, and TXT documents and ask natural-language questions about their content.

## Features

- Upload PDF, DOCX, and TXT documents
- Extract text from uploaded documents
- Split documents into smaller text chunks
- Find relevant document sections using TF-IDF
- Generate answers using a local Llama 3.2 AI model
- Run AI locally through Ollama
- Ask multiple questions about the same document
- Display question and answer history
- Clear the conversation
- Upload a new document
- Responsive dark interface

## Technology Stack

### Frontend

- HTML
- CSS
- JavaScript

### Backend

- Python
- Flask

### Document Processing

- pypdf
- python-docx

### Retrieval

- scikit-learn
- TF-IDF
- Cosine similarity

### AI

- Ollama
- Llama 3.2 3B

## System Architecture

User
↓
Web Interface
↓
Flask Backend
↓
Document Text Extraction
↓
Text Cleaning
↓
Text Chunking
↓
TF-IDF Similarity Search
↓
Relevant Document Chunks
↓
Ollama / Llama 3.2
↓
AI Generated Answer
↓
Web Interface

## Project Structure

ai-document-qa/

├── app.py
├── requirements.txt
├── README.md
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js
└── uploads/

## Installation

Install the Python dependencies:

```bash
pip install -r requirements.txt
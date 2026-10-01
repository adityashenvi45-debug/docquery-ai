from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from pypdf import PdfReader
from docx import Document

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import os
import re
import json
import urllib.request
import urllib.error


app = Flask(__name__)


# =========================================
# CONFIGURATION
# =========================================

UPLOAD_FOLDER = "uploads"

ALLOWED_EXTENSIONS = {
    "pdf",
    "docx",
    "txt"
}

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"

OLLAMA_MODEL = "llama3.2:3b"

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# =========================================
# TEMPORARY DOCUMENT STORAGE
# =========================================

document_text = ""

document_filename = ""


# =========================================
# FILE VALIDATION
# =========================================

def allowed_file(filename):

    return (
        "." in filename
        and
        filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


# =========================================
# TEXT EXTRACTION
# =========================================

def extract_text_from_file(file_path):

    extension = file_path.rsplit(
        ".",
        1
    )[1].lower()


    # -----------------------------------------
    # PDF
    # -----------------------------------------

    if extension == "pdf":

        reader = PdfReader(file_path)

        pages = []

        for page in reader.pages:

            page_text = page.extract_text()

            if page_text:

                pages.append(page_text)


        return "\n".join(pages)


    # -----------------------------------------
    # DOCX
    # -----------------------------------------

    if extension == "docx":

        document = Document(file_path)

        paragraphs = []

        for paragraph in document.paragraphs:

            text = paragraph.text.strip()

            if text:

                paragraphs.append(text)


        return "\n".join(paragraphs)


    # -----------------------------------------
    # TXT
    # -----------------------------------------

    if extension == "txt":

        with open(
            file_path,
            "r",
            encoding="utf-8",
            errors="ignore"
        ) as file:

            return file.read()


    return ""


# =========================================
# CLEAN TEXT
# =========================================

def clean_text(text):

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# =========================================
# SPLIT DOCUMENT INTO CHUNKS
# =========================================

def split_into_chunks(text):

    text = clean_text(text)


    sentences = re.split(
        r"(?<=[.!?])\s+",
        text
    )


    chunks = []

    current_chunk = ""


    for sentence in sentences:

        sentence = sentence.strip()

        if not sentence:
            continue


        if len(current_chunk) + len(sentence) < 700:

            current_chunk += " " + sentence

        else:

            if current_chunk.strip():

                chunks.append(
                    current_chunk.strip()
                )

            current_chunk = sentence


    if current_chunk.strip():

        chunks.append(
            current_chunk.strip()
        )


    return chunks


# =========================================
# FIND RELEVANT DOCUMENT TEXT
# =========================================

def find_relevant_chunks(
    question,
    text,
    number_of_results=3
):

    chunks = split_into_chunks(text)


    if not chunks:

        return []


    documents = [
        question
    ] + chunks


    vectorizer = TfidfVectorizer(
        stop_words="english"
    )


    try:

        matrix = vectorizer.fit_transform(
            documents
        )

    except ValueError:

        return []


    question_vector = matrix[0]

    chunk_vectors = matrix[1:]


    similarities = cosine_similarity(
        question_vector,
        chunk_vectors
    )[0]


    ranked_indexes = similarities.argsort()[::-1]


    results = []


    for index in ranked_indexes:

        score = similarities[index]


        if score <= 0:

            continue


        results.append({

            "text": chunks[index],

            "score": float(score)

        })


        if len(results) >= number_of_results:

            break


    return results


# =========================================
# ASK OLLAMA
# =========================================

def ask_ollama(
    question,
    relevant_chunks
):

    if not relevant_chunks:

        return (
            "I could not find enough relevant "
            "information in the uploaded document "
            "to answer this question."
        )


    context_parts = []


    for item in relevant_chunks:

        context_parts.append(
            item["text"]
        )


    context = "\n\n".join(
        context_parts
    )


    prompt = f"""
You are a document question-answering assistant.

Answer the user's question using ONLY the
information provided in the document context.

If the answer cannot be found in the document,
say clearly that the information is not available
in the uploaded document.

Do not invent facts.
Do not use outside knowledge.
Keep the answer clear and concise.

DOCUMENT CONTEXT:
{context}

USER QUESTION:
{question}

ANSWER:
"""


    payload = {

        "model": OLLAMA_MODEL,

        "prompt": prompt,

        "stream": False,

        "options": {

            "temperature": 0.2

        }

    }


    request_data = json.dumps(
        payload
    ).encode("utf-8")


    ollama_request = urllib.request.Request(

        OLLAMA_URL,

        data=request_data,

        headers={
            "Content-Type":
                "application/json"
        },

        method="POST"
    )


    try:

        with urllib.request.urlopen(
            ollama_request,
            timeout=120
        ) as response:

            response_data = json.loads(
                response.read().decode(
                    "utf-8"
                )
            )


        answer = response_data.get(
            "response",
            ""
        ).strip()


        if not answer:

            return (
                "Ollama did not return an answer."
            )


        return answer


    except urllib.error.URLError as error:

        raise RuntimeError(
            "Could not connect to Ollama. "
            "Make sure Ollama is running."
        ) from error


    except Exception as error:

        raise RuntimeError(
            f"Ollama error: {error}"
        ) from error


# =========================================
# HOME PAGE
# =========================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# =========================================
# UPLOAD DOCUMENT
# =========================================

@app.route(
    "/upload",
    methods=["POST"]
)
def upload_document():

    global document_text
    global document_filename


    if "file" not in request.files:

        return jsonify({

            "success": False,

            "message":
                "No file was uploaded."

        }), 400


    file = request.files["file"]


    if file.filename == "":

        return jsonify({

            "success": False,

            "message":
                "No file was selected."

        }), 400


    if not allowed_file(
        file.filename
    ):

        return jsonify({

            "success": False,

            "message":
                "Unsupported file type. "
                "Please upload a PDF, DOCX, "
                "or TXT file."

        }), 400


    filename = secure_filename(
        file.filename
    )


    file_path = os.path.join(
        app.config["UPLOAD_FOLDER"],
        filename
    )


    try:

        file.save(file_path)

        extracted_text = (
            extract_text_from_file(
                file_path
            )
        )

    except Exception as error:

        return jsonify({

            "success": False,

            "message":
                f"Could not read the document: {error}"

        }), 500


    if not extracted_text.strip():

        return jsonify({

            "success": False,

            "message":
                "The document does not contain "
                "readable text."

        }), 400


    document_text = extracted_text

    document_filename = filename


    return jsonify({

        "success": True,

        "message":
            "Document uploaded successfully.",

        "filename":
            document_filename,

        "text_length":
            len(document_text)

    })


# =========================================
# ASK QUESTION
# =========================================

@app.route(
    "/ask",
    methods=["POST"]
)
def ask_question():

    global document_text


    data = request.get_json()


    if not data:

        return jsonify({

            "success": False,

            "message":
                "No question was provided."

        }), 400


    question = data.get(
        "question",
        ""
    ).strip()


    if not question:

        return jsonify({

            "success": False,

            "message":
                "Please enter a question."

        }), 400


    if not document_text:

        return jsonify({

            "success": False,

            "message":
                "Please upload a document first."

        }), 400


    relevant_chunks = (
        find_relevant_chunks(
            question,
            document_text,
            number_of_results=3
        )
    )


    try:

        answer = ask_ollama(
            question,
            relevant_chunks
        )

    except RuntimeError as error:

        return jsonify({

            "success": False,

            "message":
                str(error)

        }), 500


    return jsonify({

        "success": True,

        "answer": answer,

        "matches": len(
            relevant_chunks
        )

    })

# =========================================
# CLEAR CURRENT DOCUMENT
# =========================================

@app.route(
    "/clear",
    methods=["POST"]
)
def clear_document():

    global document_text
    global document_filename

    document_text = ""

    document_filename = ""

    return jsonify({

        "success": True,

        "message":
            "Document cleared successfully."

    })

# =========================================
# RUN APPLICATION
# =========================================

if __name__ == "__main__":

    app.run(
        debug=True
    )
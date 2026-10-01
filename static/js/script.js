/* =========================================
   ELEMENTS
========================================= */

const fileInput =
    document.getElementById("fileInput");

const browseButton =
    document.getElementById("browseButton");

const uploadBox =
    document.getElementById("uploadBox");

const documentInfo =
    document.getElementById("documentInfo");

const questionInput =
    document.getElementById("questionInput");

const askButton =
    document.getElementById("askButton");

const chatSection =
    document.getElementById("chatSection");

const chatHistory =
    document.getElementById("chatHistory");

const clearChatButton =
    document.getElementById("clearChatButton");

const newDocumentButton =
    document.getElementById("newDocumentButton");

const newDocumentWrapper =
    document.getElementById(
        "newDocumentWrapper"
    );


/* =========================================
   STATE
========================================= */

let selectedFile = null;

let uploadedFilename = null;


/* =========================================
   BROWSE
========================================= */

browseButton.addEventListener(
    "click",
    () => {

        fileInput.click();

    }
);


fileInput.addEventListener(
    "change",
    async () => {

        const file =
            fileInput.files[0];

        if (!file) {
            return;
        }

        await handleSelectedFile(file);

    }
);


/* =========================================
   HANDLE FILE
========================================= */

async function handleSelectedFile(file) {

    selectedFile = file;

    showUploadingState();

    await uploadDocument(file);
}


/* =========================================
   UPLOAD DOCUMENT
========================================= */

async function uploadDocument(file) {

    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );


    try {

        const response =
            await fetch(
                "/upload",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Upload failed."
            );

        }


        uploadedFilename =
            data.filename;


        showUploadedFile(
            file,
            data.text_length
        );


    } catch (error) {

        console.error(error);

        showUploadError(
            error.message
        );

    }
}


/* =========================================
   UPLOADING STATE
========================================= */

function showUploadingState() {

    uploadBox.innerHTML = `

        <div class="upload-icon">
            ↑
        </div>

        <h2>
            Uploading document...
        </h2>

        <p>
            Extracting and preparing your document.
        </p>

    `;
}


/* =========================================
   SUCCESS STATE
========================================= */

function showUploadedFile(
    file,
    textLength
) {

    uploadBox.innerHTML = `

        <div class="upload-icon">
            ✓
        </div>

        <h2>
            Document ready
        </h2>

        <p>
            ${escapeHtml(file.name)}
        </p>

        <small>
            ${formatFileSize(file.size)}
        </small>

    `;


    documentInfo.innerHTML = `

        <div class="document-details">

            <div class="document-name">
                ${escapeHtml(file.name)}
            </div>

            <div class="document-status">
                Document extracted successfully ·
                ${Number(textLength).toLocaleString()}
                characters
            </div>

        </div>

    `;


    documentInfo.classList.add(
        "visible"
    );


    newDocumentWrapper.classList.add(
        "visible"
    );


    questionInput.focus();
}


/* =========================================
   UPLOAD ERROR
========================================= */

function showUploadError(message) {

    uploadBox.innerHTML = `

        <div class="upload-icon">
            !
        </div>

        <h2>
            Upload failed
        </h2>

        <p>
            ${escapeHtml(message)}
        </p>

        <button
            type="button"
            class="button secondary-button"
            id="retryButton"
        >
            Try again
        </button>

    `;


    document
        .getElementById("retryButton")
        .addEventListener(
            "click",
            resetUpload
        );
}


/* =========================================
   DRAG AND DROP
========================================= */

uploadBox.addEventListener(
    "dragover",
    (event) => {

        event.preventDefault();

        uploadBox.classList.add(
            "dragging"
        );

    }
);


uploadBox.addEventListener(
    "dragleave",
    () => {

        uploadBox.classList.remove(
            "dragging"
        );

    }
);


uploadBox.addEventListener(
    "drop",
    async (event) => {

        event.preventDefault();

        uploadBox.classList.remove(
            "dragging"
        );


        const file =
            event.dataTransfer.files[0];


        if (!file) {
            return;
        }


        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();


        if (
            !["pdf", "docx", "txt"]
                .includes(extension)
        ) {

            showUploadError(
                "Please upload a PDF, DOCX, or TXT file."
            );

            return;
        }


        await handleSelectedFile(file);

    }
);


/* =========================================
   ASK QUESTION
========================================= */

askButton.addEventListener(
    "click",
    askQuestion
);


questionInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            askQuestion();

        }

    }
);


/* =========================================
   ASK QUESTION FUNCTION
========================================= */

async function askQuestion() {

    const question =
        questionInput.value.trim();


    if (
        !selectedFile ||
        !uploadedFilename
    ) {

        alert(
            "Please upload a document first."
        );

        return;
    }


    if (!question) {

        alert(
            "Please enter a question first."
        );

        return;
    }


    askButton.disabled = true;


    askButton.innerHTML = `

        Thinking

        <span class="loading-dots">

            <span></span>
            <span></span>
            <span></span>

        </span>

    `;


    const loadingItem =
        addLoadingMessage(
            question
        );


    try {

        const response =
            await fetch(
                "/ask",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        question:
                            question,

                        filename:
                            uploadedFilename

                    })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Question failed."
            );

        }


        removeLoadingMessage(
            loadingItem
        );


        addAnswerMessage(
            question,
            data.answer
        );


        chatSection.classList.add(
            "visible"
        );


        newDocumentWrapper.classList.add(
            "visible"
        );


        questionInput.value = "";

        questionInput.focus();


        chatSection.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });


    } catch (error) {

        console.error(error);


        removeLoadingMessage(
            loadingItem
        );


        addAnswerMessage(
            question,
            "Error: " + error.message
        );


        chatSection.classList.add(
            "visible"
        );

    } finally {

        askButton.disabled = false;

        askButton.innerHTML = `
            Ask question
            <span>→</span>
        `;

    }
}


/* =========================================
   ADD LOADING MESSAGE
========================================= */

function addLoadingMessage(question) {

    const item =
        document.createElement("div");


    item.className =
        "chat-item loading-item";


    item.innerHTML = `

        <div class="question-bubble">

            <span class="question-prefix">
                YOU
            </span>

            ${escapeHtml(question)}

        </div>

        <div class="ai-answer">

            <div class="ai-icon">
                ✦
            </div>

            <div class="ai-answer-text">

                <span class="loading-dots">

                    <span></span>
                    <span></span>
                    <span></span>

                </span>

            </div>

        </div>

    `;


    chatHistory.appendChild(item);


    chatSection.classList.add(
        "visible"
    );


    chatSection.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });


    return item;
}


/* =========================================
   REMOVE LOADING MESSAGE
========================================= */

function removeLoadingMessage(
    item
) {

    if (item && item.parentNode) {

        item.parentNode.removeChild(
            item
        );

    }
}


/* =========================================
   ADD ANSWER MESSAGE
========================================= */

function addAnswerMessage(
    question,
    answer
) {

    const item =
        document.createElement("div");


    item.className =
        "chat-item";


    item.innerHTML = `

        <div class="question-bubble">

            <span class="question-prefix">
                YOU
            </span>

            ${escapeHtml(question)}

        </div>


        <div class="ai-answer">

            <div class="ai-icon">
                ✦
            </div>

            <div class="ai-answer-text">
                ${escapeHtml(answer)}
            </div>

        </div>

    `;


    chatHistory.appendChild(item);
}


/* =========================================
   CLEAR CHAT
========================================= */

clearChatButton.addEventListener(
    "click",
    () => {

        chatHistory.innerHTML = "";

        chatSection.classList.remove(
            "visible"
        );

        questionInput.focus();

    }
);


/* =========================================
   NEW DOCUMENT
========================================= */

newDocumentButton.addEventListener(
    "click",
    async () => {

        try {

            await fetch(
                "/clear",
                {
                    method: "POST"
                }
            );

        } catch (error) {

            console.error(error);

        }


        resetUpload();

        chatHistory.innerHTML = "";

        chatSection.classList.remove(
            "visible"
        );

        newDocumentWrapper.classList.remove(
            "visible"
        );

        questionInput.value = "";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);


/* =========================================
   RESET UPLOAD
========================================= */

function resetUpload() {

    fileInput.value = "";

    selectedFile = null;

    uploadedFilename = null;


    documentInfo.innerHTML = "";

    documentInfo.classList.remove(
        "visible"
    );


    uploadBox.innerHTML = `

        <div class="upload-icon">
            ↑
        </div>

        <h2>
            Drop your document here
        </h2>

        <p>
            PDF, DOCX and TXT files supported
        </p>

        <button
            type="button"
            class="button secondary-button"
            id="browseButton"
        >
            Browse files
        </button>

    `;


    document
        .getElementById("browseButton")
        .addEventListener(
            "click",
            () => fileInput.click()
        );


    questionInput.value = "";

    questionInput.focus();
}


/* =========================================
   FILE SIZE
========================================= */

function formatFileSize(bytes) {

    if (bytes < 1024) {

        return `${bytes} bytes`;

    }


    if (bytes < 1024 * 1024) {

        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;

    }


    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(1)} MB`;
}


/* =========================================
   HTML ESCAPING
========================================= */

function escapeHtml(text) {

    const div =
        document.createElement("div");


    div.textContent = text;


    return div.innerHTML;
}
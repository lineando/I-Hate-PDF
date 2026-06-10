const files = [];
let dragSrcIndex = null;

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const fileList = document.getElementById("file-list");
const btnMerge = document.getElementById("btn-merge");
const status = document.getElementById("status");
const progressBar = document.getElementById("progress-bar");
const progressFill = document.getElementById("progress-fill");
const listHint = document.getElementById("list-hint");
const outputSection = document.getElementById("output-section");

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  addFiles([...e.dataTransfer.files]);
});

fileInput.addEventListener("change", () => {
  addFiles([...fileInput.files]);
});

function addFiles(newFiles) {
  const pdfs = newFiles.filter(file =>
    file.name.toLowerCase().endsWith(".pdf")
  );

  pdfs.forEach(file => files.push(file));

  renderList();
}

function renderList() {
  fileList.innerHTML = "";

  files.forEach((file, index) => {
    const item = document.createElement("div");

    item.className = "file-item";
    item.draggable = true;

    item.innerHTML = `
      <span class="drag-handle">≡</span>
      <span class="order-badge">${index + 1}</span>
      <span class="file-icon">📄</span>

      <div class="file-info">
        <div class="file-name">${file.name}</div>
        <div class="file-size">
          ${(file.size / 1024).toFixed(1)} KB
        </div>
      </div>

      <button class="remove"
        onclick="removeFile(${index})">
        ×
      </button>
    `;

    item.addEventListener("dragstart", () => {
      dragSrcIndex = index;
    });

    item.addEventListener("drop", e => {
      e.preventDefault();

      if (dragSrcIndex !== index) {
        const moved = files.splice(dragSrcIndex, 1)[0];
        files.splice(index, 0, moved);
        renderList();
      }
    });

    item.addEventListener("dragover", e => {
      e.preventDefault();
    });

    fileList.appendChild(item);
  });

  const hasFiles = files.length > 0;

  btnMerge.disabled = files.length < 2;
  listHint.style.display = hasFiles ? "block" : "none";
  outputSection.style.display = hasFiles ? "flex" : "none";
}

function removeFile(index) {
  files.splice(index, 1);
  renderList();
}

function clearAll() {
  files.length = 0;
  fileInput.value = "";
  renderList();
  hideStatus();
}

function showStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
}

function hideStatus() {
  status.className = "status";
}

function setProgress(percent) {
  progressBar.classList.add("visible");
  progressFill.style.width = percent + "%";
}

async function mergeFiles() {
  if (files.length < 2) return;

  btnMerge.disabled = true;

  try {
    showStatus("Juntando arquivos...", "loading");

    const { PDFDocument } = PDFLib;

    const mergedPdf = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
      const bytes = await files[i].arrayBuffer();

      const pdf = await PDFDocument.load(bytes);

      const pages = await mergedPdf.copyPages(
        pdf,
        pdf.getPageIndices()
      );

      pages.forEach(page => mergedPdf.addPage(page));

      setProgress(
        Math.round(((i + 1) / files.length) * 100)
      );
    }

    const mergedBytes = await mergedPdf.save();

    let fileName =
      document.getElementById("output-name").value.trim() ||
      "resultado.pdf";

    if (!fileName.endsWith(".pdf")) {
      fileName += ".pdf";
    }

    const blob = new Blob(
      [mergedBytes],
      { type: "application/pdf" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();

    URL.revokeObjectURL(url);

    showStatus("PDF criado com sucesso!", "success");
  } catch (error) {
    showStatus(error.message, "error");
  }

  btnMerge.disabled = false;
}
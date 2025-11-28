export class UIHandler {
  constructor() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileCount = document.getElementById('fileCount');
    this.convertBtn = document.getElementById('convertBtn');
    this.status = document.getElementById('status');
    this.fromVersion = document.getElementById('fromVersion');
    this.toVersion = document.getElementById('toVersion');
    
    this.selectedFiles = null;
    this.folderName = '';
    this.convertCallback = null;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });
    
    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });
    
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      const items = e.dataTransfer.items;
      if (items) this.handleDroppedItems(items);
    });
    
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.processFiles(Array.from(e.target.files));
      }
    });
    
    this.convertBtn.addEventListener('click', () => this.handleConvert());
  }
  
  async handleDroppedItems(items) {
    const files = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) await this.traverseFileTree(item, files);
    }
    if (files.length > 0) this.processFiles(files);
  }
  
  traverseFileTree(item, files, path = '') {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file) => {
          file.webkitRelativePath = path + file.name;
          files.push(file);
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(async (entries) => {
          for (const entry of entries) {
            await this.traverseFileTree(entry, files, path + item.name + '/');
          }
          resolve();
        });
      }
    });
  }
  
  processFiles(files) {
    this.selectedFiles = files;
    const firstFile = files[0];
    const pathParts = firstFile.webkitRelativePath.split('/');
    this.folderName = pathParts[0];
    
    this.fileName.textContent = this.folderName;
    this.fileCount.textContent = `${files.length} file(s) found`;
    this.fileInfo.classList.add('visible');
    this.convertBtn.disabled = false;
    this.status.classList.remove('visible');
  }
  
  async handleConvert() {
    if (!this.selectedFiles || !this.convertCallback) return;
    
    this.convertBtn.disabled = true;
    this.status.classList.remove('visible', 'error');
    
    try {
      await this.convertCallback(
        this.selectedFiles,
        this.folderName,
        this.fromVersion.value,
        this.toVersion.value
      );
    } catch (error) {
      this.showStatus('Error: ' + error.message, 'error');
    } finally {
      this.convertBtn.disabled = false;
    }
  }
  
  showStatus(message, type) {
    this.status.textContent = message;
    this.status.classList.add('visible', type);
  }
  
  onConvert(callback) {
    this.convertCallback = callback;
  }
}
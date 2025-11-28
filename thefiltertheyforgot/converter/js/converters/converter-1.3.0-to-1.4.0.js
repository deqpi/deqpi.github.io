export class Converter_1_3_0_to_1_4_0 {
  async convert(files, folderName) {
    const yamlFiles = {};
    let manifestData = null;
    
    for (const file of files) {
      if (file.name === 'manifest.yaml') {
        const text = await file.text();
        manifestData = this.parseYAML(text);
        continue;
      }
      
      if (file.name.endsWith('.yaml')) {
        const text = await file.text();
        yamlFiles[file.name] = text;
      }
    }
    
    const listMode = manifestData?.filterType || 'normalized';
    
    const zipFiles = [
      { name: 'manifest.yaml', content: `filterType: ${listMode}` }
    ];
    
    for (const [filename, content] of Object.entries(yamlFiles)) {
      zipFiles.push({ name: filename, content });
    }
    
    const zipData = await this.generateZip(zipFiles);
    this.downloadZip(zipData, folderName);
  }
  
  parseYAML(text) {
    const lines = text.split('\n');
    const result = {};
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        result[match[1]] = match[2];
      }
    }
    return result;
  }
  
  async generateZip(files) {
    const encoder = new TextEncoder();
    let zipData = new Uint8Array(0);
    const centralDirectory = [];
    let offset = 0;
    
    for (const file of files) {
      const contentData = encoder.encode(file.content);
      const crc = this.calculateCRC32(contentData);
      const localHeader = this.createLocalFileHeader(file.name, contentData.length, crc);
      
      zipData = this.concatUint8Arrays(zipData, localHeader);
      zipData = this.concatUint8Arrays(zipData, contentData);
      
      centralDirectory.push({
        filename: file.name,
        contentLength: contentData.length,
        crc,
        offset
      });
      
      offset = zipData.length;
    }
    
    const centralStart = zipData.length;
    
    for (const file of centralDirectory) {
      const centralHeader = this.createCentralDirectoryHeader(
        file.filename,
        file.contentLength,
        file.crc,
        file.offset
      );
      zipData = this.concatUint8Arrays(zipData, centralHeader);
    }
    
    const centralEnd = zipData.length;
    const endRecord = this.createEndOfCentralDirectory(
      files.length,
      centralEnd - centralStart,
      centralStart
    );
    
    zipData = this.concatUint8Arrays(zipData, endRecord);
    return zipData;
  }
  
  createLocalFileHeader(filename, compressedSize, crc32) {
    const encoder = new TextEncoder();
    const header = new Uint8Array(30 + filename.length);
    const view = new DataView(header.buffer);
    
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 0x0014, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, crc32, true);
    view.setUint32(18, compressedSize, true);
    view.setUint32(22, compressedSize, true);
    view.setUint16(26, filename.length, true);
    view.setUint16(28, 0, true);
    
    encoder.encodeInto(filename, header.subarray(30));
    return header;
  }
  
  createCentralDirectoryHeader(filename, compressedSize, crc32, offset) {
    const encoder = new TextEncoder();
    const header = new Uint8Array(46 + filename.length);
    const view = new DataView(header.buffer);
    
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 0x0014, true);
    view.setUint16(6, 0x0014, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, crc32, true);
    view.setUint32(20, compressedSize, true);
    view.setUint32(24, compressedSize, true);
    view.setUint16(28, filename.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, offset, true);
    
    encoder.encodeInto(filename, header.subarray(46));
    return header;
  }
  
  createEndOfCentralDirectory(entryCount, centralSize, centralOffset) {
    const record = new Uint8Array(22);
    const view = new DataView(record.buffer);
    
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, entryCount, true);
    view.setUint16(10, entryCount, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, centralOffset, true);
    view.setUint16(20, 0, true);
    
    return record;
  }
  
  calculateCRC32(data) {
    let crc = 0 ^ -1;
    const table = this.getCRC32Table();
    
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
    }
    
    return (crc ^ -1) >>> 0;
  }
  
  getCRC32Table() {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }
    return table;
  }
  
  concatUint8Arrays(a, b) {
    const result = new Uint8Array(a.length + b.length);
    result.set(a);
    result.set(b, a.length);
    return result;
  }
  
  downloadZip(zipData, name) {
    const blob = new Blob([zipData], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9_-]/gi, '_')}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
// Serial Monitor Tab - Processing Grapher Web
import { setStatusBar, showModal } from './ui.js';

export class SerialMonitor {
  constructor(state) {
    this.state = state;
    this.terminal = null;
    this.input = null;
    this.tags = [{ text: 'SENT:', color: '#67d8ef' }];
    this.buffer = [];
    this.recording = false;
    this.fileHandle = null;
    this.port = null;
    this.reader = null;
    this.baud = 9600;
    this.connected = false;
    this.init();
  }

  init() {
    const tab = document.getElementById('tab-serial');
    tab.innerHTML = `
      <div id="serial-terminal"></div>
      <div id="serial-input-bar">
        <input type="text" id="serial-input" placeholder="Type and press Enter to send" autocomplete="off">
        <button id="serial-send-btn">Send</button>
      </div>
    `;
    this.terminal = document.getElementById('serial-terminal');
    this.input = document.getElementById('serial-input');
    document.getElementById('serial-send-btn').onclick = () => this.sendTerminal();
    this.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.sendTerminal();
    });
  }

  renderSidebar() {
    const sb = document.getElementById('sidebar');
    sb.innerHTML = `
      <h3>Serial Port</h3>
      <button id="serial-connect-btn" class="sidebtn">${this.connected ? 'Disconnect' : 'Connect'}</button>
      <label>Baud: <input id="serial-baud" type="number" value="${this.baud}" min="300" max="250000"></label>
      <div style="margin:1em 0;">
        <h3>Recording</h3>
        <button id="serial-record-btn" class="sidebtn"${this.recording?' disabled':''}>${this.recording?'Recording...':'Start Recording'}</button>
        <button id="serial-clear-btn" class="sidebtn">Clear Terminal</button>
      </div>
      <div>
        <h3>Tags</h3>
        <button id="add-tag-btn" class="sidebtn">Add Tag</button>
        <div id="tag-list"></div>
      </div>
    `;
    
    const isAdmin = (window.loginInfo && window.loginInfo.role === "admin");
    if (isAdmin) {
      sb.innerHTML += `<h3>Admin Controls</h3>
      <button class="sidebtn accent" onclick="window.pgLogout()">Logout</button>`;
      // You can add more admin controls here!
    } else {
      sb.innerHTML += `<button class="sidebtn" onclick="window.pgLogout()">Logout</button>`;
    }
    
    document.getElementById('serial-connect-btn').onclick = () => this.toggleSerial();
    document.getElementById('serial-baud').onchange = e => { this.baud = Number(e.target.value); };
    document.getElementById('serial-record-btn').onclick = () => this.toggleRecording();
    document.getElementById('serial-clear-btn').onclick = () => { this.terminal.textContent = ''; this.buffer = []; };
    document.getElementById('add-tag-btn').onclick = () => this.addTag();
    this.renderTags();
    setStatusBar(`${this.connected?'Connected':'Disconnected'} | ${this.baud} baud | Serial Monitor`);
  }

  renderTags() {
    let html = '';
    this.tags.forEach((tag, i) => {
      html += `<div style="display:flex;align-items:center;gap:8px;">
        <span style="color:${tag.color};font-family:monospace">${tag.text}</span>
        <button class="sidebtn" style="width:2em;padding:0;" onclick="window.serialRemoveTag(${i})">✕</button>
      </div>`;
    });
    document.getElementById('tag-list').innerHTML = html;
    // Expose for onclick
    window.serialRemoveTag = i => { this.tags.splice(i,1); this.renderTags(); };
  }

  addTag() {
    showModal(`
      <h3>Add Color Tag</h3>
      <input id="tag-txt" type="text" placeholder="Tag text" />
      <input id="tag-color" type="color" value="#67d8ef" />
      <button class="sidebtn accent" id="tag-add">Add</button>
      <button class="sidebtn close-modal">Cancel</button>
      <script>
      document.getElementById('tag-add').onclick = () => {
        window.parentSerialMonitor.tags.push({text:document.getElementById('tag-txt').value,color:document.getElementById('tag-color').value});
        window.parentSerialMonitor.renderTags();
        document.getElementById('modal').classList.add('hidden');
      };
      </script>
    `);
    window.parentSerialMonitor = this;
  }

  appendTerminal(line) {
    // Tag coloring
    let colored = line;
    this.tags.forEach(tag => {
      if (colored.includes(tag.text))
        colored = colored.replaceAll(tag.text, `<span style="color:${tag.color}">${tag.text}</span>`);
    });
    // Keep buffer short
    this.buffer.push(line);
    if (this.buffer.length > 1000) this.buffer.shift();
    this.terminal.innerHTML += colored + '<br>';
    this.terminal.scrollTop = this.terminal.scrollHeight;
    if (this.recording && this.fileHandle) this.fileHandle.write(line+'\n');
  }

  sendTerminal() {
    const val = this.input.value.trim();
    if (val) {
      this.appendTerminal('SENT: ' + val);
      // Send to serial port if connected
      if (this.connected && this.port && this.port.writable) {
        const writer = this.port.writable.getWriter();
        writer.write(new TextEncoder().encode(val+'\n'));
        writer.releaseLock();
      }
      this.input.value = '';
    }
  }

  async toggleSerial() {
    if (!this.connected) {
      // Connect
      if (!('serial' in navigator)) {
        alert('Web Serial API not supported in your browser. Use Chrome or Edge.');
        return;
      }
      try {
        this.port = await navigator.serial.requestPort();
        await this.port.open({ baudRate: this.baud });
        this.connected = true;
        this.reader = this.port.readable.getReader();
        this.readLoop();
      } catch (e) {
        alert('Serial connection failed: ' + e);
      }
    } else {
      // Disconnect
      if (this.reader) await this.reader.cancel();
      if (this.port) await this.port.close();
      this.connected = false;
      this.port = null;
      this.reader = null;
    }
    this.renderSidebar();
  }

  async readLoop() {
    try {
      while (this.connected && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        this.appendTerminal(new TextDecoder().decode(value));
      }
    } catch {}
    finally {
      this.connected = false;
      this.renderSidebar();
    }
  }

  toggleRecording() {
    if (this.recording) {
      this.recording = false;
      if (this.fileHandle) this.fileHandle.close();
      this.fileHandle = null;
    } else {
      // Download all buffer as TXT
      const blob = new Blob([this.buffer.join('\n')], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'serial_log.txt';
      a.click();
      URL.revokeObjectURL(a.href);
      // Or use File System Access API for streaming (not universally supported)
      this.recording = true;
    }
    this.renderSidebar();
  }
}
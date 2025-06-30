// Live Graph Tab - Processing Grapher Web
import { setStatusBar, showModal } from './ui.js';

export class LiveGraph {
  constructor(state) {
    this.state = state;
    this.graphType = 'line'; // line, dot, bar
    this.data = [];
    this.channelNames = ['Channel 1', 'Channel 2', 'Channel 3', 'Channel 4'];
    this.channelColors = ['#67d8ef', '#d02662', '#61afef', '#e05c7e'];
    this.channelVisible = [true, true, true, true];
    this.maxSamples = 1000;
    this.recording = false;
    this.paused = false;
    this.baud = 9600;
    this.port = null;
    this.reader = null;
    this.connected = false;
    this.autoScale = true;
    this.yMin = -10;
    this.yMax = 10;
    this.dataRate = 0;
    this.lastDataTime = 0;
    this.dataCount = 0;
    this.rawBuffer = '';
    this.init();
  }

  init() {
    const tab = document.getElementById('tab-live');
    tab.innerHTML = `
      <div id="live-graph-container">
        <div id="live-data-info">
          <div id="channel-legend"></div>
          <div id="data-stats">
            <span id="data-rate">Data Rate: 0 Hz</span>
            <span id="sample-count">Samples: 0</span>
            <span id="connection-status">Disconnected</span>
          </div>
        </div>
        <canvas id="live-graph" width="900" height="320"></canvas>
        <div id="raw-data-display">
          <h4>Raw Data Stream:</h4>
          <div id="raw-data-content"></div>
        </div>
      </div>
    `;
    this.canvas = document.getElementById('live-graph');
    this.ctx = this.canvas.getContext('2d');
    this.rawDataDisplay = document.getElementById('raw-data-content');
    this.updateChannelLegend();
    this.draw();
    
    // Update data rate every second
    setInterval(() => this.updateDataRate(), 1000);
  }

  renderSidebar() {
    const sb = document.getElementById('sidebar');
    const isAdmin = (window.loginInfo && window.loginInfo.role === "admin");
    
    if (isAdmin) {
      sb.innerHTML = `
        <h3>Live Graph</h3>
        <button id="live-connect-btn" class="sidebtn">${this.connected ? 'Disconnect' : 'Connect Serial'}</button>
        <button id="live-record-btn" class="sidebtn">${this.recording?'Stop Recording':'Start Recording'}</button>
        <button id="live-clear-btn" class="sidebtn">Clear Graph</button>
        <button id="live-pause-btn" class="sidebtn">${this.paused ? 'Resume' : 'Pause'}</button>
        <hr>
        <h3>Serial Settings</h3>
        <label>Baud Rate: <input id="live-baud" type="number" value="${this.baud}" min="300" max="250000"></label>
        <label>Max Samples: <input id="max-samples" type="number" value="${this.maxSamples}" min="100" max="10000"></label>
        <hr>
        <h3>Graph Options</h3>
        <button id="line-btn" class="sidebtn${this.graphType==='line'?' accent':''}">Line</button>
        <button id="dot-btn" class="sidebtn${this.graphType==='dot'?' accent':''}">Dot</button>
        <button id="bar-btn" class="sidebtn${this.graphType==='bar'?' accent':''}">Bar</button>
        <hr>
        <h3>Scale Settings</h3>
        <label><input type="checkbox" id="auto-scale" ${this.autoScale?'checked':''}> Auto Scale</label>
        <label>Y Min: <input id="y-min" type="number" value="${this.yMin}" step="0.1" ${this.autoScale?'disabled':''}></label>
        <label>Y Max: <input id="y-max" type="number" value="${this.yMax}" step="0.1" ${this.autoScale?'disabled':''}></label>
        <hr>
        <h3>Channels</h3>
        <div id="channel-controls"></div>
        <hr>
        <button id="save-csv" class="sidebtn">Download CSV</button>
        <button id="channel-settings" class="sidebtn">Channel Settings</button>
        <hr>
        <h3>Admin Controls</h3>
        <button class="sidebtn accent" onclick="window.pgLogout()">Logout</button>
      `;
    } else {
      sb.innerHTML = `
        <h3>Live Graph</h3>
        <button id="live-connect-btn" class="sidebtn">${this.connected ? 'Disconnect' : 'Connect Serial'}</button>
        <button id="live-record-btn" class="sidebtn">${this.recording?'Stop Recording':'Start Recording'}</button>
        <button id="live-clear-btn" class="sidebtn">Clear Graph</button>
        <button id="live-pause-btn" class="sidebtn">${this.paused ? 'Resume' : 'Pause'}</button>
        <hr>
        <h3>Serial Settings</h3>
        <label>Baud Rate: <input id="live-baud" type="number" value="${this.baud}" min="300" max="250000"></label>
        <label>Max Samples: <input id="max-samples" type="number" value="${this.maxSamples}" min="100" max="10000"></label>
        <hr>
        <h3>Graph Options</h3>
        <button id="line-btn" class="sidebtn${this.graphType==='line'?' accent':''}">Line</button>
        <button id="dot-btn" class="sidebtn${this.graphType==='dot'?' accent':''}">Dot</button>
        <button id="bar-btn" class="sidebtn${this.graphType==='bar'?' accent':''}">Bar</button>
        <hr>
        <h3>Scale Settings</h3>
        <label><input type="checkbox" id="auto-scale" ${this.autoScale?'checked':''}> Auto Scale</label>
        <label>Y Min: <input id="y-min" type="number" value="${this.yMin}" step="0.1" ${this.autoScale?'disabled':''}></label>
        <label>Y Max: <input id="y-max" type="number" value="${this.yMax}" step="0.1" ${this.autoScale?'disabled':''}></label>
        <hr>
        <h3>Channels</h3>
        <div id="channel-controls"></div>
        <hr>
        <button id="save-csv" class="sidebtn">Download CSV</button>
        <button id="channel-settings" class="sidebtn">Channel Settings</button>
        <button class="sidebtn" onclick="window.pgLogout()">Logout</button>
      `;
    }
    
    this.setupEventListeners();
    this.renderChannelControls();
    setStatusBar(`${this.connected?'Connected':'Disconnected'} | ${this.baud} baud | ${this.dataRate.toFixed(1)} Hz | Live Graph`);
  }

  setupEventListeners() {
    document.getElementById('live-connect-btn').onclick = () => this.toggleSerial();
    document.getElementById('live-record-btn').onclick = () => this.toggleRecording();
    document.getElementById('live-clear-btn').onclick = () => this.clearGraph();
    document.getElementById('live-pause-btn').onclick = () => this.togglePause();
    document.getElementById('live-baud').onchange = e => { this.baud = Number(e.target.value); };
    document.getElementById('max-samples').onchange = e => { this.maxSamples = Number(e.target.value); };
    document.getElementById('line-btn').onclick = () => this.setGraphType('line');
    document.getElementById('dot-btn').onclick = () => this.setGraphType('dot');
    document.getElementById('bar-btn').onclick = () => this.setGraphType('bar');
    document.getElementById('auto-scale').onchange = e => this.toggleAutoScale(e.target.checked);
    document.getElementById('y-min').onchange = e => { this.yMin = Number(e.target.value); this.draw(); };
    document.getElementById('y-max').onchange = e => { this.yMax = Number(e.target.value); this.draw(); };
    document.getElementById('save-csv').onclick = () => this.saveCSV();
    document.getElementById('channel-settings').onclick = () => this.openChannelSettings();
  }

  renderChannelControls() {
    const container = document.getElementById('channel-controls');
    let html = '';
    for (let i = 0; i < 4; i++) {
      html += `
        <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
          <input type="checkbox" id="ch${i}" ${this.channelVisible[i]?'checked':''}>
          <div style="width:12px;height:12px;background:${this.channelColors[i]};border-radius:2px;"></div>
          <label for="ch${i}" style="flex:1;font-size:0.9em;">${this.channelNames[i]}</label>
        </div>
      `;
    }
    container.innerHTML = html;
    
    for (let i = 0; i < 4; i++) {
      document.getElementById(`ch${i}`).onchange = e => {
        this.channelVisible[i] = e.target.checked;
        this.updateChannelLegend();
        this.draw();
      };
    }
  }

  updateChannelLegend() {
    const legend = document.getElementById('channel-legend');
    let html = '';
    for (let i = 0; i < 4; i++) {
      if (this.channelVisible[i]) {
        const lastValue = this.data.length > 0 ? this.data[this.data.length - 1][i] || 0 : 0;
        html += `
          <div style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;">
            <div style="width:10px;height:10px;background:${this.channelColors[i]};border-radius:50%;"></div>
            <span style="font-size:0.9em;">${this.channelNames[i]}: ${lastValue.toFixed(3)}</span>
          </div>
        `;
      }
    }
    legend.innerHTML = html;
  }

  clearGraph() {
    this.data = [];
    this.dataCount = 0;
    this.rawBuffer = '';
    this.rawDataDisplay.textContent = '';
    this.updateChannelLegend();
    this.draw();
  }

  togglePause() {
    this.paused = !this.paused;
    this.renderSidebar();
  }

  setGraphType(type) {
    this.graphType = type;
    this.draw();
    this.renderSidebar();
  }

  toggleAutoScale(enabled) {
    this.autoScale = enabled;
    document.getElementById('y-min').disabled = enabled;
    document.getElementById('y-max').disabled = enabled;
    if (enabled) this.draw();
  }

  updateDataRate() {
    const now = Date.now();
    if (this.lastDataTime > 0) {
      const timeDiff = (now - this.lastDataTime) / 1000;
      if (timeDiff > 0) {
        this.dataRate = this.dataCount / timeDiff;
      }
    }
    this.lastDataTime = now;
    this.dataCount = 0;
    
    // Update UI
    document.getElementById('data-rate').textContent = `Data Rate: ${this.dataRate.toFixed(1)} Hz`;
    document.getElementById('sample-count').textContent = `Samples: ${this.data.length}`;
    document.getElementById('connection-status').textContent = this.connected ? 'Connected' : 'Disconnected';
    document.getElementById('connection-status').style.color = this.connected ? '#67d8ef' : '#d02662';
  }

  async toggleSerial() {
    if (!this.connected) {
      if (!('serial' in navigator)) {
        alert('Web Serial API not supported in your browser.');
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
        
        if (!this.paused) {
          const text = new TextDecoder().decode(value);
          this.rawBuffer += text;
          
          // Update raw data display (keep last 500 chars)
          if (this.rawBuffer.length > 500) {
            this.rawBuffer = this.rawBuffer.slice(-500);
          }
          this.rawDataDisplay.textContent = this.rawBuffer;
          this.rawDataDisplay.scrollTop = this.rawDataDisplay.scrollHeight;
          
          // Process complete lines
          const lines = text.split('\n');
          for (let line of lines) {
            line = line.trim();
            if (line) {
              // Expect comma-separated floats
              let vals = line.split(',').map(v => parseFloat(v.trim()));
              vals = vals.filter(v => !isNaN(v));
              
              if (vals.length > 0) {
                // Pad with zeros if less than 4 channels
                while (vals.length < 4) vals.push(0);
                // Truncate if more than 4 channels
                vals = vals.slice(0, 4);
                
                this.data.push(vals);
                this.dataCount++;
                
                if (this.data.length > this.maxSamples) {
                  this.data.shift();
                }
                
                this.updateChannelLegend();
                this.draw();
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Serial read error:', e);
    }
    finally { 
      this.connected = false; 
      this.renderSidebar(); 
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Clear canvas
    ctx.fillStyle = "#282c34";
    ctx.fillRect(0, 0, w, h);
    
    if (!this.data.length) {
      // Draw empty state
      ctx.fillStyle = "#666";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText("No data - Connect serial port to see live graph", w/2, h/2);
      return;
    }
    
    // Calculate scale
    let yMin = this.yMin, yMax = this.yMax;
    if (this.autoScale) {
      const allValues = this.data.flat().filter((v, i) => this.channelVisible[i % 4]);
      if (allValues.length > 0) {
        yMin = Math.min(...allValues);
        yMax = Math.max(...allValues);
        const range = yMax - yMin;
        if (range === 0) {
          yMin -= 1;
          yMax += 1;
        } else {
          yMin -= range * 0.1;
          yMax += range * 0.1;
        }
      }
    }
    
    // Draw grid
    ctx.strokeStyle = "#31322c";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    
    // Draw axis labels
    ctx.fillStyle = "#d0d0d0";
    ctx.font = "12px Arial";
    ctx.textAlign = "right";
    for (let i = 0; i <= 5; i++) {
      const y = (i / 5) * h;
      const value = yMax - (i / 5) * (yMax - yMin);
      ctx.fillText(value.toFixed(2), w - 5, y + 4);
    }
    
    // Draw channels
    for (let ch = 0; ch < 4; ch++) {
      if (!this.channelVisible[ch]) continue;
      
      ctx.strokeStyle = this.channelColors[ch];
      ctx.fillStyle = this.channelColors[ch];
      ctx.lineWidth = 2;
      
      if (this.graphType === 'line') {
        ctx.beginPath();
        for (let i = 0; i < this.data.length; i++) {
          const x = (i / (this.data.length - 1 || 1)) * w;
          const value = this.data[i][ch] || 0;
          const y = h - ((value - yMin) / (yMax - yMin)) * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (this.graphType === 'dot') {
        for (let i = 0; i < this.data.length; i++) {
          const x = (i / (this.data.length - 1 || 1)) * w;
          const value = this.data[i][ch] || 0;
          const y = h - ((value - yMin) / (yMax - yMin)) * h;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, 2 * Math.PI);
          ctx.fill();
        }
      } else if (this.graphType === 'bar') {
        const barWidth = w / this.data.length;
        for (let i = 0; i < this.data.length; i++) {
          const x = i * barWidth;
          const value = this.data[i][ch] || 0;
          const y = h - ((value - yMin) / (yMax - yMin)) * h;
          const barHeight = h - y;
          ctx.fillRect(x, y, barWidth - 1, barHeight);
        }
      }
    }
  }

  openChannelSettings() {
    showModal(`
      <h3>Channel Settings</h3>
      <div style="display:grid;gap:1em;">
        ${this.channelNames.map((name, i) => `
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:16px;height:16px;background:${this.channelColors[i]};border-radius:2px;"></div>
            <input type="text" id="ch-name-${i}" value="${name}" style="flex:1;padding:4px;">
            <input type="color" id="ch-color-${i}" value="${this.channelColors[i]}">
          </div>
        `).join('')}
      </div>
      <div style="margin-top:1em;text-align:right;">
        <button id="save-channel-settings" class="sidebtn accent">Save</button>
        <button class="sidebtn close-modal">Cancel</button>
      </div>
      <script>
      document.getElementById('save-channel-settings').onclick = () => {
        for (let i = 0; i < 4; i++) {
          window.liveGraphInstance.channelNames[i] = document.getElementById('ch-name-' + i).value;
          window.liveGraphInstance.channelColors[i] = document.getElementById('ch-color-' + i).value;
        }
        window.liveGraphInstance.renderChannelControls();
        window.liveGraphInstance.updateChannelLegend();
        window.liveGraphInstance.draw();
        document.getElementById('modal').classList.add('hidden');
      };
      </script>
    `);
    window.liveGraphInstance = this;
  }

  toggleRecording() {
    this.recording = !this.recording;
    this.renderSidebar();
  }

  saveCSV() {
    if (this.data.length === 0) {
      alert('No data to save');
      return;
    }
    
    let csv = this.channelNames.join(',') + '\n';
    csv += this.data.map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `live_graph_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
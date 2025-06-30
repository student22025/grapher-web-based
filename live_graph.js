// Live Graph Tab - Processing Grapher Web
import { setStatusBar, showModal } from './ui.js';

export class LiveGraph {
  constructor(state) {
    this.state = state;
    this.graphType = 'line'; // line, dot, bar
    this.data = [];
    this.assignment = [1,1,1,1]; // Assign signals to 4 graphs
    this.labels = [];
    this.maxSamples = 1000;
    this.recording = false;
    this.paused = false;
    this.baud = 9600;
    this.port = null;
    this.reader = null;
    this.connected = false;
    this.graphMode = 1;
    this.selectedGraph = 1;
    this.xRate = 100;
    this.csvHandle = null;
    this.graphs = [];
    this.init();
  }

  init() {
    const tab = document.getElementById('tab-live');
    tab.innerHTML = `<canvas id="live-graph" width="900" height="350"></canvas>`;
    this.canvas = document.getElementById('live-graph');
    this.ctx = this.canvas.getContext('2d');
    this.draw();
  }

  renderSidebar() {
    const sb = document.getElementById('sidebar');
    const isAdmin = (window.loginInfo && window.loginInfo.role === "admin");
  if (isAdmin) {
    sb.innerHTML += `<h3>Admin Controls</h3>
    <button class="sidebtn accent" onclick="window.pgLogout()">Logout</button>`;
    // You can add more admin controls here!
  } else {
    sb.innerHTML = `
      <h3>Live Graph</h3>
      <button id="live-connect-btn" class="sidebtn">${this.connected ? 'Disconnect' : 'Connect Serial'}</button>
      <button id="live-record-btn" class="sidebtn">${this.recording?'Stop Recording':'Start Recording'}</button>
      <button id="live-clear-btn" class="sidebtn">Clear Graph</button>
      <hr>
      <h3>Graph Options</h3>
      <button id="line-btn" class="sidebtn${this.graphType==='line'?' accent':''}">Line</button>
      <button id="dot-btn" class="sidebtn${this.graphType==='dot'?' accent':''}">Dot</button>
      <button id="bar-btn" class="sidebtn${this.graphType==='bar'?' accent':''}">Bar</button>
      <hr>
      <button id="save-csv" class="sidebtn">Download CSV</button>
    `;
    document.getElementById('live-connect-btn').onclick = () => this.toggleSerial();
    document.getElementById('live-record-btn').onclick = () => this.toggleRecording();
    document.getElementById('live-clear-btn').onclick = () => { this.data = []; this.draw(); };
    document.getElementById('line-btn').onclick = () => { this.graphType = 'line'; this.draw(); this.renderSidebar(); };
    document.getElementById('dot-btn').onclick = () => { this.graphType = 'dot'; this.draw(); this.renderSidebar(); };
    document.getElementById('bar-btn').onclick = () => { this.graphType = 'bar'; this.draw(); this.renderSidebar(); };
    document.getElementById('save-csv').onclick = () => this.saveCSV();
    setStatusBar(`${this.connected?'Connected':'Disconnected'} | ${this.baud} baud | Live Graph`);
  }
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
      } catch (e) { alert(e); }
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
        // Expect comma-separated floats
        const lines = new TextDecoder().decode(value).split('\n');
        for (let line of lines) {
          let vals = line.trim().split(',').map(Number);
          if (vals.length && !vals.some(isNaN)) {
            this.data.push(vals);
            if (this.data.length > this.maxSamples) this.data.shift();
            this.draw();
          }
        }
      }
    } catch {}
    finally { this.connected = false; this.renderSidebar(); }
  }

  draw() {
    // Simple line/dot/bar plot for first signal
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.fillStyle = "#282c34";
    ctx.fillRect(0,0,w,h);
    if (!this.data.length) return;
    let max = Math.max(...this.data.flat()), min = Math.min(...this.data.flat());
    for (let s=0; s<this.data[0].length; ++s) {
      ctx.beginPath();
      ctx.strokeStyle = ['#67d8ef','#d02662','#61afef','#e05c7e'][s%4];
      for (let i=0; i<this.data.length; ++i) {
        let x = i * w / this.data.length, y = h - ((this.data[i][s]-min)/(max-min)) * h;
        if (this.graphType==='line') ctx.lineTo(x,y);
        else if (this.graphType==='dot') ctx.rect(x-2, y-2, 4, 4);
        else if (this.graphType==='bar') ctx.rect(x-2, y, 4, h-y);
      }
      ctx.stroke();
    }
  }

  toggleRecording() {
    this.recording = !this.recording;
    // Optionally implement streaming save
    this.renderSidebar();
  }

  saveCSV() {
    let csv = this.data.map(row=>row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'live_graph.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
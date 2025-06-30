// File Graph Tab - Processing Grapher Web
import { setStatusBar, showModal } from './ui.js';

export class FileGraph {
  constructor(state) {
    this.state = state;
    this.data = [];
    this.headers = [];
    this.init();
  }
  init() {
    const tab = document.getElementById('tab-file');
    tab.innerHTML = `
      <input type="file" id="csv-file-input" accept=".csv">
      <canvas id="file-graph" width="900" height="350"></canvas>
    `;
    document.getElementById('csv-file-input').onchange = e => this.loadCSV(e.target.files[0]);
    this.canvas = document.getElementById('file-graph');
    this.ctx = this.canvas.getContext('2d');
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
      <h3>File Graph</h3>
      <input type="file" accept=".csv" id="sidebar-csv-upload" />
      <button id="file-clear-btn" class="sidebtn">Clear Graph</button>
      <hr>
      <button id="save-csv" class="sidebtn">Download CSV</button>
    `;
    document.getElementById('sidebar-csv-upload').onchange = e => this.loadCSV(e.target.files[0]);
    document.getElementById('file-clear-btn').onclick = () => { this.data = []; this.draw(); };
    document.getElementById('save-csv').onclick = () => this.saveCSV();
    setStatusBar('File Graph');
  }
}
  loadCSV(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const lines = e.target.result.split('\n').filter(Boolean);
      this.headers = lines[0].split(',');
      this.data = lines.slice(1).map(l => l.split(',').map(Number));
      this.draw();
    };
    reader.readAsText(file);
  }
  draw() {
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
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  saveCSV() {
    let csv = [this.headers.join(',')].concat(this.data.map(row=>row.join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'file_graph.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  openFileDialog() {
    document.getElementById('sidebar-csv-upload').click();
  }
}
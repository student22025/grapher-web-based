// Settings modal for Processing Grapher Web
import { showModal, setTheme } from './ui.js';

export class Settings {
  constructor(state) {
    this.state = state;
    this.colorScheme = 'gravity';
    this.interfaceScale = 1.1;
  }

  renderSidebar() {
    const sb = document.getElementById('sidebar');
    // ...your existing HTML building code for the sidebar...

    // Add at the end:
    const isAdmin = (window.loginInfo && window.loginInfo.role === "admin");
    if (isAdmin) {
      sb.innerHTML += `<h3>Admin Controls</h3>
      <button class="sidebtn accent" onclick="window.pgLogout()">Logout</button>`;
      // You can add more admin controls here!
    } else {
      sb.innerHTML += `<button class="sidebtn" onclick="window.pgLogout()">Logout</button>`;
    }
  }

  openModal() {
    showModal(`
      <h2>Settings</h2>
      <div>
        <label>Color Scheme:
          <select id="color-scheme">
            <option value="monokai">Dark - Monokai</option>
            <option value="gravity" selected>Dark - Gravity</option>
            <option value="celeste">Light - Celeste</option>
          </select>
        </label>
      </div>
      <div style="margin-top:1em;">
        <label>Scale: <input id="ui-scale" type="number" step="0.1" min="0.6" max="2.0" value="1.1"></label>
      </div>
      <div style="margin-top:1em;text-align:right;">
        <button id="save-settings" class="sidebtn accent">Save</button>
        <button class="sidebtn close-modal">Close</button>
      </div>
      <script>
      document.getElementById('save-settings').onclick = () => {
        window.settingsObj.save();
        document.getElementById('modal').classList.add('hidden');
      };
      </script>
    `);
    window.settingsObj = this;
    document.getElementById('color-scheme').value = this.colorScheme;
    document.getElementById('ui-scale').value = this.interfaceScale;
  }

  save() {
    this.colorScheme = document.getElementById('color-scheme').value;
    this.interfaceScale = parseFloat(document.getElementById('ui-scale').value);
    setTheme(this.colorScheme);
    document.body.style.fontSize = (this.interfaceScale*100) + '%';
  }
}
<h1 align="center">TMS Captcha Solver</h1>

<p align="center">Extension for Chromium-based browsers to automatically solve and autofill captchas on NEPSE TMS sites.</p>

<p align="center">
  <img src="https://user-images.githubusercontent.com/46302068/215273678-4ba5f4fc-01b5-4ab6-bad9-429388e4d366.gif" width="450" alt="TMS Captcha Demo"/>
</p>

## 🚀 Installation

1.  **Download** the latest `TMSCaptcha-chrome.zip` from the [Releases](https://github.com/arpandaze/tms-captcha/releases) page.
2.  **Extract** the ZIP file to a folder.
3.  Open Brave/Chrome and go to `brave://extensions` or `chrome://extensions`.
4.  Enable **Developer mode**.
5.  Click **Load unpacked** and select the **extracted folder**.

## 🛠️ Building from Source

If you want to build the extension manually:

1.  **Clone** the repository:
    ```bash
    git clone https://github.com/arpandaze/tms-captcha.git
    cd tms-captcha
    ```
2.  **Install** dependencies:
    ```bash
    npm install  # or yarn install
    ```
3.  **Build** the extension:
    *   **Chrome/Brave**: `npm run build:chrome`
    *   **Firefox**: `npm run build:firefox`
    *   **Both**: `npm run build:all`

### Loading the Build
After building, click **Load unpacked** in your browser's extension settings and select the **`dist-chrome`** directory.

## 📦 Publishing to Firefox Add-ons

1.  Get your API credentials from [AMO's API Keys page](https://addons.mozilla.org/en-US/developers/addon/api/key/).
2.  Set environment variables:
    ```bash
    export MOZILLA_JWT_ISSUER="your-jwt-issuer"
    export MOZILLA_JWT_SECRET="your-jwt-secret"
    ```
3.  Run the publish command:
    ```bash
    npm run publish:firefox  # or yarn publish:firefox
    ```

---
<p align="center">Developed with ❤️ for the NEPSE community.</p>
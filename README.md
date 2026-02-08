<h1 align="center">TMS Captcha Solver</h1>

<p align="center">Extension for Chromium-based browsers to automatically solve and autofill captchas on NEPSE TMS sites.</p>

<p align="center">
  <img src="https://user-images.githubusercontent.com/46302068/215273678-4ba5f4fc-01b5-4ab6-bad9-429388e4d366.gif" width="450" alt="TMS Captcha Demo"/>
</p>

## ✨ New in v0.4.8
- **High-Precision Model**: Upgraded from 5 to **9-factor spatial analysis**. Includes quadrant-level density checks for significantly better character recognition.
- **Improved Resiliency**: Increased automatic re-solve attempts (up to 10) for distorted captchas.
- **Instant Clear**: Input fields now clear immediately upon refresh to prevent stale data.
- **Race Condition Fix**: Implemented request ID tracking to ensure only the latest captcha result is applied.

## 📝 TL;DR
TMS Captcha Solver is a lightweight browser extension that uses a custom **spatial density analysis model** to identify characters in NEPSE TMS captchas. It bypasses background noise, segments the image, and matches patterns against a pre-trained dataset in real-time, all within your browser.

<details>
<summary><b>🔍 Technical Deep Dive: How it Works Under the Hood</b></summary>

### 1. Preprocessing & Noise Reduction
The extension first captures the captcha image as a Base64 URI. It performs **background subtraction** using a reference "empty" captcha image to isolate character pixels from the noisy background. The resulting image is then thresholded (binarized) for cleaner analysis.

### 2. Character Segmentation
Using a vertical scanning algorithm, the system identifies "empty" columns to split the single captcha strip into individual character matrices. It handles both **Bold** and **Slim** font variants used by TMS.

### 3. 9-Factor Spatial Analysis
Instead of complex OCR or Neural Networks, this project uses a high-performance **feature extraction** approach. Each character is evaluated across 9 distinct factors:
- **Global Density**: Average pixel value of the whole character.
- **Bisectional Density**: Average pixel values of the Left/Right and Top/Bottom halves.
- **Quadrant Density**: Average pixel values of the Top-Left, Top-Right, Bottom-Left, and Bottom-Right quadrants.
- **Aspect Ratio**: The width-to-height ratio of the character container.

### 4. Character Recognition (KNN-Style)
The extracted 9-factor vector is compared against a local dataset (`bold_data.json` and `slim_data.json`). It calculates a **Weighted Euclidean Distance** between the current character and every known character in the dataset. 
- The factor weights (`FACTORS`) are tuned to prioritize certain spatial features (like quadrant density) over others.
- The character with the lowest "error" (distance) is selected, provided it meets a confidence threshold.

### 5. Browser Integration
- **MutationObserver**: Monitors the DOM for captcha image refreshes.
- **Request Tracking**: Uses incrementing Request IDs to prevent race conditions where a slow solve for an old captcha might overwrite a newer one.
- **Input Simulation**: Dispatches native `input` events after filling the field to ensure the underlying React/Angular state of the TMS site is updated.

</details>

## 🚀 Installation

1.  **Download** the latest `TMSCaptcha-chrome.zip` from the [Releases](https://github.com/scuba3198/tms-captcha/releases) page.
2.  **Extract** the ZIP file to a folder.
3.  Open Brave/Chrome and go to `brave://extensions` or `chrome://extensions`.
4.  Enable **Developer mode**.
5.  Click **Load unpacked** and select the **extracted folder**.

## 🛠️ Building from Source

If you want to build the extension manually:

1.  **Clone** the repository:
    ```bash
    git clone https://github.com/scuba3198/tms-captcha.git
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
<p align="center">Developed with ❤️ by for the NEPSE community.</p>

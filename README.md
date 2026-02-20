<h1 align="center">TMS Captcha Solver</h1>

<p align="center">Extension for Chromium-based browsers to automatically solve and autofill captchas on NEPSE TMS sites.</p>

<p align="center">
  <img src="https://user-images.githubusercontent.com/46302068/215273678-4ba5f4fc-01b5-4ab6-bad9-429388e4d366.gif" width="450" alt="TMS Captcha Demo"/>
</p>

## ✨ New in v0.7.1
- **Lead Engineer Standards**: Brought the project into full compliance with "Bugs Prevented by Design" global rules, ensuring strict build-time guarantees and isolated side effects.
- **Structured JSON Logging**: Replaced `console.log` with a custom, structured JSON logger in `src/logger.ts`, featuring automatic PII redaction and consistent observability.
- **Improved Selector Resiliency**: Implemented flexible CSS selectors and fallback logic to survive site-side UI updates.
- **Domain Primitive Safety**: Introduced `Captcha` brand types in TypeScript to make invalid states unrepresentable and prevent accidental domain misuse.
- **CI/CD Quality Gates**: Enforced mandatory linting and character accuracy tests in the GitHub Actions pipeline—builds now fail if quality standards aren't met.

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
- **Input Simulation**: Dispatches native `input` and `change` events after filling the field to ensure the underlying React/Angular state of the TMS site is updated.
- **Structured Logging & Redaction**: All operational logs are exported as structured JSON. A built-in sanitization layer automatically redacts any strings that look like secrets or sensitive tokens.
- **Domain Priming**: Uses TypeScript brand types for CAPTCHA strings, ensuring they are validated and treated as a distinct type throughout the pipeline.

</details>

## 🚀 Installation

1.  **Download** the latest `tmscaptcha-chrome-[version].zip` from the [Releases](https://github.com/scuba3198/tms-captcha/releases) page.
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
    npm install
    ```
3.  **Build** the extension:
    *   **Chrome/Brave**: `npm run build:chrome`
    *   **Firefox**: `npm run build:firefox`
    *   **Both**: `npm run build:all`

### Linting & Formatting
We use Biome for code quality:
```bash
npm run lint    # Check for linting/formatting issues
npm run format  # Automatically fix issues
```

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
    npm run publish:firefox
    ```

---
<p align="center">Developed with ❤️ for the NEPSE community.</p>

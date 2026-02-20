# System Architecture - TMS Captcha

TMS Captcha is a zero-dependency OCR-based CAPTCHA solver for the Nepal Stock Exchange TMS.

## Core Components

### Configuration Layer (`src/constants.ts`)
Centralized configuration for image dimensions, OCR factors, thresholds, and CSS selectors. This ensures the extension is maintainable and resilient to site updates.

### OCR Engine (`src/evaluate.ts`)
- **Image Pre-processing**: Cleans the input CAPTCHA image by subtracting background noise and thresholding.
- **Character Segmentation**: Splits the processed image into six individual characters.
- **Feature Extraction**: Calculates 9 distinct intensity factors for each character.
- **Classification**: Matches the extracted features against pre-defined templates (`bold_data.json` and `slim_data.json`) using weighted Euclidean distance.

### Extension Logic (`src/content-script.ts`)
- **Initialization**: Monitors the page for CAPTCHA elements using `MutationObserver`.
- **Automation**: Triggers the OCR engine when a new CAPTCHA is detected.
- **Form Integration**: Automatically fills the solved result into the target input field and dispatches native events to ensure compatibility with site-side validation.
- **Error Handling**: Implements reload logic for low-confidence results or invalid lengths.

## Data Flow

1. `MutationObserver` detects a new CAPTCHA `<img>` source.
2. `content-script.ts` loads the image and calls `solveCaptcha` in `evaluate.ts`.
3. `evaluate.ts` cleans the image, splits it, and evaluates characters.
4. Results are returned to `content-script.ts`.
5. If successful, the input field is populated. If confidence is low, the CAPTCHA is reloaded.

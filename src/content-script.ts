import { solve_captcha } from "./evaluate";
import { ResultTypes, SolveResult } from "./interface";

const RELOAD_LIMIT = 10;
const INITIAL_RETRY_LIMIT = 5;
const RETRY_DELAY = 500; // ms

let reload_counter = 0;
let initial_retry_counter = 0;

async function reload_captcha() {
  const reloadButton = document?.querySelector('[aria-label="Reload captcha"]');
  if (reloadButton) {
    reloadButton.dispatchEvent(new Event("click"));
  }
}

async function waitForImageLoad(img: HTMLImageElement): Promise<boolean> {
  return new Promise((resolve) => {
    if (img.complete) {
      resolve(true);
      return;
    }

    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);

    // Timeout after 5 seconds
    setTimeout(() => resolve(false), 5000);
  });
}

let latestRequestId = 0;

function clearCaptchaField() {
  const captcha_field = document.getElementById("captchaEnter") as HTMLInputElement;
  if (captcha_field) {
    captcha_field.value = "";
    captcha_field.dispatchEvent(new Event("input"));
    console.log("[TMSCaptcha] Input field cleared");
  }
}

async function handle_result(result: SolveResult) {
  switch (result.type) {
    case ResultTypes.Success: {
      console.log(`[TMSCaptcha] Solved: ${result.value}`);

      // Reset reload counter on successful solve
      if (reload_counter > 0) {
        console.log(`[TMSCaptcha] Resetting reload counter (was ${reload_counter})`);
        reload_counter = 0;
      }

      const captcha_field = document.getElementById("captchaEnter") as HTMLInputElement;
      if (captcha_field) {
        captcha_field.value = result.value;
        captcha_field.dispatchEvent(new Event("input"));
        console.log(`[TMSCaptcha] Input field updated with: ${result.value}`);
      }
      return;
    }

    case ResultTypes.LowConfidence: {
      console.log(`[TMSCaptcha] Failed to solve due to low confidence. Cleaning field and reloading.`);
      clearCaptchaField();
      break;
    }

    case ResultTypes.InvalidLength: {
      console.log(`[TMSCaptcha] Found result "${result.value}" but length < 6. Cleaning field and reloading.`);
      clearCaptchaField();
      break;
    }
  }

  if (reload_counter > RELOAD_LIMIT) {
    console.log(`[TMSCaptcha] Failed to solve and reloaded too many times!`);
    return;
  }

  reload_counter++;
  await reload_captcha();
}

async function processCaptcha(captchaImg: HTMLImageElement) {
  const currentRequestId = ++latestRequestId;
  const captcha_blob_url = captchaImg.getAttribute("src");

  if (!captcha_blob_url) {
    console.log("[TMSCaptcha] No captcha URL found");
    return;
  }

  if (captcha_blob_url.includes("captcha-image.jpg")) {
    console.log("[TMSCaptcha] Placeholder captcha detected - clearing field");
    clearCaptchaField();
    return;
  }

  console.log(`[TMSCaptcha] Starting solve request #${currentRequestId}`);

  // Wait for the image to be fully loaded
  const imageLoaded = await waitForImageLoad(captchaImg);
  if (!imageLoaded) {
    console.log(`[TMSCaptcha] Image #${currentRequestId} failed to load`);
    return;
  }

  const result = await solve_captcha(captcha_blob_url);

  // Race condition check: Only proceed if this is still the most recent request
  if (currentRequestId !== latestRequestId) {
    console.log(`[TMSCaptcha] Ignoring stale result for request #${currentRequestId} (Current is #${latestRequestId})`);
    return;
  }

  await handle_result(result);
}

async function initializeCaptchaSolver() {
  const captchaImg = document.querySelector('.form-control.captcha-image-dimension.col-10') as HTMLImageElement;

  if (!captchaImg) {
    if (initial_retry_counter < INITIAL_RETRY_LIMIT) {
      console.log(`[TMSCaptcha] Captcha element not found, retrying... (${initial_retry_counter + 1}/${INITIAL_RETRY_LIMIT})`);
      initial_retry_counter++;
      setTimeout(initializeCaptchaSolver, RETRY_DELAY);
    } else {
      console.log("[TMSCaptcha] Failed to find captcha element after all retries");
    }
    return;
  }

  console.log("[TMSCaptcha] Initializing solver observer...");

  // Process initial captcha
  await processCaptcha(captchaImg);

  // Set up observer for future changes
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
        const newSrc = (mutation.target as HTMLImageElement).getAttribute('src');
        console.log(`[TMSCaptcha] Image src changed to: ${newSrc?.substring(0, 50)}...`);

        // IMPORTANT: Clear the field immediately when the image starts changing
        clearCaptchaField();

        await processCaptcha(mutation.target as HTMLImageElement);
      }
    }
  });

  observer.observe(captchaImg, {
    attributes: true,
    attributeFilter: ['src']
  });
}

// Start the initialization process when the content script loads
initializeCaptchaSolver();

// Also try again when the window loads (as a backup)
window.addEventListener('load', () => {
  if (initial_retry_counter < INITIAL_RETRY_LIMIT) {
    initializeCaptchaSolver();
  }
});

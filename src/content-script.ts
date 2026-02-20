import { CONFIG } from "./constants";
import { solveCaptcha } from "./evaluate";
import { ResultTypes, type SolveResult } from "./interface";
import { logger } from "./logger";

const RELOAD_LIMIT = CONFIG.EXTENSION.RELOAD_LIMIT;
const INITIAL_RETRY_LIMIT = CONFIG.EXTENSION.INITIAL_RETRY_LIMIT;
const RETRY_DELAY = CONFIG.EXTENSION.RETRY_DELAY_MS; // ms

let reloadCounter = 0;
let initialRetryCounter = 0;

async function reloadCaptcha() {
  const reloadButton = document?.querySelector(CONFIG.SELECTORS.RELOAD_BUTTON);
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

    // Timeout after specified limit
    setTimeout(() => resolve(false), CONFIG.EXTENSION.IMAGE_LOAD_TIMEOUT_MS);
  });
}

let latestRequestId = 0;

function clearCaptchaField() {
  const captchaField = document.querySelector(
    CONFIG.SELECTORS.CAPTCHA_INPUT,
  ) as HTMLInputElement | null;
  if (captchaField) {
    captchaField.value = "";
    captchaField.dispatchEvent(new Event("input"));
    logger.info("Input field cleared");
  }
}

async function handleResult(result: SolveResult) {
  switch (result.type) {
    case ResultTypes.Success: {
      logger.info("Captcha solved successfully", { value: result.value });

      // Reset reload counter on successful solve
      if (reloadCounter > 0) {
        logger.info("Resetting reload counter", { prevCounter: reloadCounter });
        reloadCounter = 0;
      }

      const captchaField = document.querySelector(
        CONFIG.SELECTORS.CAPTCHA_INPUT,
      ) as HTMLInputElement | null;
      if (captchaField) {
        captchaField.focus();
        captchaField.value = result.value;
        captchaField.dispatchEvent(new Event("input", { bubbles: true }));
        captchaField.dispatchEvent(new Event("change", { bubbles: true }));
        captchaField.blur();
        logger.info("Input field updated", { value: result.value });
      }
      return;
    }

    case ResultTypes.LowConfidence: {
      logger.warn(
        "Failed to solve due to low confidence. Cleaning field and reloading.",
      );
      clearCaptchaField();
      break;
    }

    case ResultTypes.InvalidLength: {
      logger.warn(
        "Invalid captcha length received. Cleaning field and reloading.",
        { value: result.value },
      );
      clearCaptchaField();
      break;
    }
  }

  if (reloadCounter > RELOAD_LIMIT) {
    logger.error("Failed to solve and reloaded too many times!", {
      reloadCounter,
      limit: RELOAD_LIMIT,
    });
    return;
  }

  reloadCounter++;
  await reloadCaptcha();
}

async function processCaptcha(captchaImg: HTMLImageElement) {
  const currentRequestId = ++latestRequestId;
  const captchaBlobUrl = captchaImg.src; // Use full URL

  if (!captchaBlobUrl) {
    logger.warn("No captcha URL found");
    return;
  }

  if (captchaBlobUrl.includes(CONFIG.SELECTORS.PLACEHOLDER_IMAGE)) {
    logger.debug("Placeholder captcha detected - clearing field", {
      requestId: currentRequestId,
    });
    clearCaptchaField();
    return;
  }

  logger.info("Starting solve request", { requestId: currentRequestId });

  // Wait for the image to be fully loaded
  const hasImageLoaded = await waitForImageLoad(captchaImg);
  if (!hasImageLoaded) {
    logger.error("Image failed to load", { requestId: currentRequestId });
    return;
  }

  const result = await solveCaptcha(captchaBlobUrl);

  // Race condition check: Only proceed if this is still the most recent request
  if (currentRequestId !== latestRequestId) {
    logger.debug("Ignoring stale result", {
      requestId: currentRequestId,
      latestId: latestRequestId,
    });
    return;
  }

  await handleResult(result);
}

async function initializeCaptchaSolver() {
  const captchaImg = document.querySelector(
    CONFIG.SELECTORS.CAPTCHA_IMAGE,
  ) as HTMLImageElement | null;

  if (!captchaImg) {
    if (initialRetryCounter < INITIAL_RETRY_LIMIT) {
      logger.info("Captcha element not found, retrying...", {
        retry: initialRetryCounter + 1,
        limit: INITIAL_RETRY_LIMIT,
      });
      initialRetryCounter++;
      setTimeout(initializeCaptchaSolver, RETRY_DELAY);
    } else {
      logger.error("Failed to find captcha element after all retries");
    }
    return;
  }

  logger.info("Initializing solver observer...");

  // Process initial captcha
  await processCaptcha(captchaImg);

  // Set up observer for future changes
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.attributeName === "src") {
        const newSrc = (mutation.target as HTMLImageElement).getAttribute(
          "src",
        );
        logger.debug("Image src changed", {
          newSrc: newSrc?.substring(0, 50),
        });

        // IMPORTANT: Clear the field immediately when the image starts changing
        clearCaptchaField();

        await processCaptcha(mutation.target as HTMLImageElement);
      }
    }
  });

  observer.observe(captchaImg, {
    attributes: true,
    attributeFilter: ["src"],
  });
}

// Start the initialization process when the content script loads
initializeCaptchaSolver();

// Also try again when the window loads (as a backup)
window.addEventListener("load", () => {
  if (initialRetryCounter < INITIAL_RETRY_LIMIT) {
    initializeCaptchaSolver();
  }
});

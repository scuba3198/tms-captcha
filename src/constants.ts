/**
 * Constants for the TMS Captcha Solver extension.
 */

export const CONFIG = {
  // Image dimensions and splitting
  IMAGE: {
    CROP: {
      X: 75,
      Y: 24,
      WIDTH: 130,
      HEIGHT: 35,
    },
    CHAR_HEIGHT: 35,
    MAX_WIDTH: 130,
    CLEAN_MULTIPLIER: 10,
    PIXEL_THRESHOLD: 50,
    AVERAGE_DIVISOR: 256,
  },

  // Solver logic
  SOLVER: {
    LOW_CONFIDENCE_THRESHOLD: 100,
    CONFIDENCE_GAP: 5,
    FACTORS: [1, 2, 2, 2, 4, 3, 3, 3, 3],
    REQUIRED_LENGTH: 6,
  },

  // Extension behavior
  EXTENSION: {
    RELOAD_LIMIT: 10,
    INITIAL_RETRY_LIMIT: 5,
    RETRY_DELAY_MS: 500,
    IMAGE_LOAD_TIMEOUT_MS: 5000,
  },

  // Selectors
  SELECTORS: {
    CAPTCHA_IMAGE:
      ".form-control.captcha-image-dimension.col-10, img[src*='captcha-image']",
    CAPTCHA_INPUT: "#captchaEnter, input[name='captchaEnter']",
    RELOAD_BUTTON:
      '[aria-label="Reload captcha"], .reload-captcha, a[title*="Reload"]',
    PLACEHOLDER_IMAGE: "captcha-image.jpg",
  },
};

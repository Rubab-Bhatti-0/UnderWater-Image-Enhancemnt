"""The four OpenCV and NumPy operations used by the DIP project."""

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass(frozen=True)
class Settings:
    balance: float = 1.0
    contrast: float = 2.0
    gamma: float = 0.9
    sharpen: float = 1.0


def white_balance(image, strength):
    if strength == 0:
        return image

    working = image.astype(np.float32)
    averages = working.mean(axis=(0, 1))
    gray = averages.mean()
    gains = gray / (averages + 1e-6)
    working *= (1 - strength) + strength * gains
    np.clip(working, 0, 255, out=working)
    return working.astype(np.uint8)


def enhance_contrast(image, clip_limit):
    if clip_limit == 0:
        return image

    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
    luminance, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
    corrected = cv2.merge((clahe.apply(luminance), a, b))
    return cv2.cvtColor(corrected, cv2.COLOR_LAB2RGB)


def gamma_correction(image, gamma):
    table = np.array([
        ((intensity / 255.0) ** gamma) * 255
        for intensity in range(256)
    ], dtype=np.uint8)
    return cv2.LUT(image, table)


def sharpen_image(image, amount):
    if amount == 0:
        return image

    kernel = np.array([
        [0, -amount, 0],
        [-amount, 1 + 4 * amount, -amount],
        [0, -amount, 0],
    ], dtype=np.float32)
    return cv2.filter2D(image, -1, kernel)


def enhance(image, settings):
    """Return the outputs in pipeline order. Images use uint8 RGB."""
    balanced = white_balance(image, settings.balance)
    contrasted = enhance_contrast(balanced, settings.contrast)
    corrected = gamma_correction(contrasted, settings.gamma)
    final = sharpen_image(corrected, settings.sharpen)
    return {
        "original": image,
        "balance": balanced,
        "contrast": contrasted,
        "gamma": corrected,
        "enhanced": final,
    }

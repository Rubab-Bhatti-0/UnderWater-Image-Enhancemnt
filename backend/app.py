"""Local Flask routes and image I/O for Reef Lab."""

import argparse
from base64 import b64encode
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from threading import Timer
import webbrowser

import cv2
from flask import Flask, jsonify, request, send_file, send_from_directory
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from werkzeug.exceptions import BadRequest, RequestEntityTooLarge
from werkzeug.serving import make_server

from algorithms import Settings, enhance
from histograms import plot_comparison

HERE = Path(__file__).resolve().parent
DIST = HERE.parent / "frontend" / "dist"
SAMPLE = HERE / "assets" / "baker-island.jpg"
MAX_BYTES = 12 * 1024 * 1024
MAX_PIXELS = 16_000_000

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = MAX_BYTES + 1024 * 1024


@app.errorhandler(BadRequest)
def bad_request(error):
    return jsonify(error=error.description), 400


@app.errorhandler(RequestEntityTooLarge)
def too_large(_error):
    return jsonify(error="Please choose an image up to 12 MB."), 413


def read_settings(form):
    fields = {
        "balance": (0, 1),
        "contrast": (0, 5),
        "gamma": (0.4, 2.5),
        "sharpen": (0, 2),
    }
    values = {}
    defaults = Settings()
    for name, (minimum, maximum) in fields.items():
        try:
            value = float(form.get(name, getattr(defaults, name)))
        except (ValueError, TypeError):
            raise BadRequest(f"Enter a valid value for {name}.") from None
        if not minimum <= value <= maximum:
            raise BadRequest(f"{name.capitalize()} must be between {minimum} and {maximum}.")
        values[name] = value
    return Settings(**values)


def decode_image(source):
    try:
        with Image.open(source) as raw:
            if raw.format not in {"JPEG", "PNG", "WEBP"}:
                raise BadRequest("Choose a JPEG, PNG, or WebP image.")
            if raw.width * raw.height > MAX_PIXELS:
                raise BadRequest("Please choose an image with at most 16 megapixels.")
            if getattr(raw, "n_frames", 1) != 1:
                raise BadRequest("Please choose a still image.")
            oriented = ImageOps.exif_transpose(raw)
            if "A" in oriented.getbands() or "transparency" in oriented.info:
                rgba = oriented.convert("RGBA")
                background = Image.new("RGBA", rgba.size, "white")
                oriented = Image.alpha_composite(background, rgba)
            return np.asarray(oriented.convert("RGB"))
    except Image.DecompressionBombError:
        raise BadRequest("Please choose an image with at most 16 megapixels.") from None
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
        raise BadRequest("This image could not be opened. Check the file and try again.") from None


def encode_image(image, extension, options=()):
    bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    success, encoded = cv2.imencode(extension, bgr, list(options))
    if not success:
        raise RuntimeError("OpenCV could not encode the image.")
    return encoded.tobytes()


def data_url(content, mime):
    return f"data:{mime};base64,{b64encode(content).decode('ascii')}"


def preview(image):
    height, width = image.shape[:2]
    scale = min(1, 1440 / max(height, width))
    if scale < 1:
        size = (max(1, round(width * scale)), max(1, round(height * scale)))
        image = cv2.resize(image, size, interpolation=cv2.INTER_AREA)
    return data_url(encode_image(image, ".jpg", (cv2.IMWRITE_JPEG_QUALITY, 91)), "image/jpeg")


def result_for(original, settings):
    stages = enhance(original, settings)
    histogram = plot_comparison(original, stages["enhanced"])
    height, width = original.shape[:2]
    return {
        "width": width,
        "height": height,
        "stages": {name: preview(image) for name, image in stages.items()},
        "histogram": data_url(histogram, "image/png"),
    }


@lru_cache(maxsize=1)
def default_sample_result():
    return result_for(decode_image(SAMPLE), Settings())


def read_upload():
    upload = request.files.get("image")
    if upload is None:
        raise BadRequest("Select an image to get started.")
    content = upload.stream.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise RequestEntityTooLarge()
    return decode_image(BytesIO(content))


@app.get("/")
def index():
    return send_from_directory(DIST, "index.html", max_age=0)


@app.get("/assets/<path:filename>")
def assets(filename):
    return send_from_directory(DIST / "assets", filename, max_age=31536000)


@app.get("/sample.jpg")
def sample_image():
    return send_file(SAMPLE, max_age=3600)


@app.post("/api/enhance")
def enhance_route():
    settings = read_settings(request.form)
    if request.form.get("sample") == "1":
        if settings == Settings():
            return jsonify(default_sample_result())
        original = decode_image(SAMPLE)
    else:
        original = read_upload()
    return jsonify(result_for(original, settings))


@app.post("/api/download")
def download_route():
    settings = read_settings(request.form)
    original = decode_image(SAMPLE) if request.form.get("sample") == "1" else read_upload()
    final = enhance(original, settings)["enhanced"]
    return send_file(
        BytesIO(encode_image(final, ".png")),
        mimetype="image/png",
        as_attachment=True,
        download_name="enhanced-underwater.png",
        max_age=0,
    )


def main():
    parser = argparse.ArgumentParser(description="Run Reef Lab on your laptop.")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    if not (DIST / "index.html").is_file():
        raise SystemExit("The frontend build is missing. Run npm ci and npm run build inside frontend.")
    with make_server("127.0.0.1", args.port, app, threaded=True) as server:
        url = f"http://127.0.0.1:{server.server_port}"
        print(f"Reef Lab is running at {url}", flush=True)
        print("Press Ctrl+C to stop the server.", flush=True)
        if not args.no_browser:
            opener = Timer(0.4, webbrowser.open, args=(url,))
            opener.daemon = True
            opener.start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()

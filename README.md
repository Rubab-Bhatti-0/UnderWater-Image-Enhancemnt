# Reef Lab

Reef Lab is a local web application for a Digital Image Processing semester project. It uses a React and Tailwind frontend, a Flask API, and the original four-stage OpenCV and NumPy pipeline. Matplotlib plots the RGB histograms and Pillow handles image decoding and orientation.

## Run it on your laptop

1. Install [Python 3.12](https://www.python.org/downloads/) if needed. The launcher supports Python 3.10–3.13 on mainstream 64-bit Windows, macOS, and Linux installations with the required package wheels.
2. Extract the ZIP. Open a terminal in the extracted `UnderwaterEnhancement` folder, where `run.py` is located.
3. Run the command for your operating system.

   **Windows**

   ```powershell
   py -3.12 run.py
   ```

   **macOS or Linux**

   ```bash
   python3.12 run.py
   ```

   Use `python run.py` or `python3 run.py` if that command already points to a supported Python version.

4. The first run creates a virtual environment and installs dependencies from PyPI, so it needs an internet connection. When the server starts, your browser opens to [http://127.0.0.1:8000](http://127.0.0.1:8000). Keep the terminal open while you use the app. Press **Ctrl+C** to stop it.

The React production build is included. Node.js is only needed to edit and rebuild the frontend. The app and its fonts run locally after setup.

## Try the project

- Start with the NOAA sample photo, or upload a still JPG, PNG, or WebP up to 12 MB and 16 megapixels.
- Drag the divider or use the arrow keys to explore the split view. Select **Side by side** to see both images separately.
- Adjust any parameter and select **Apply enhancement**. **Reset** restores the default values in the controls.
- Select a thumbnail in **Processing pipeline** to inspect that stage. The histogram panel always compares the original and the final enhanced image at a shared scale.
- Select **Download PNG** for the full-resolution final result. The download and histograms reflect the last applied adjustments. The app corrects EXIF orientation and composites transparent inputs over white.

## Processing pipeline

| Stage | Operation | Default |
| --- | --- | --- |
| White balance | Compute the mean of the RGB channel means. Scale each channel toward that gray-world estimate. | 100% of the computed correction |
| Contrast | Convert RGB to LAB, apply CLAHE to the luminance channel, and convert back to RGB. | Clip limit 2.0, tile grid 8 × 8 |
| Gamma correction | Map each channel through a lookup table using `255 × (intensity / 255)^gamma`. | Gamma 0.9 |
| Sharpening | Apply a 3 × 3 cross-shaped kernel with OpenCV `filter2D`. | Center weight 5, axial neighbors −1 |

Gamma values below 1 lift midtones. The sharpening slider scales the kernel's four negative weights and adjusts its center weight to keep the kernel sum at one. The Matplotlib charts show the percentage of pixels at each intensity for each channel, before and after all four steps. Gray-world correction works best when the scene contains a range of colors. Strong settings can amplify noise or produce halos, so compare the original and individual stages when choosing parameters.

## Source files

```text
UnderwaterEnhancement/
├── run.py                      One-command setup and launcher
├── requirements.txt            Python dependencies
├── backend/
│   ├── app.py                  Flask routes, validation, and image I/O
│   ├── algorithms.py           White balance, CLAHE, gamma, and sharpening
│   ├── histograms.py           RGB distributions and Matplotlib rendering
│   └── assets/baker-island.jpg  Bundled sample photo
└── frontend/
    ├── src/                    React components and styles
    ├── dist/                   Prebuilt client served by Flask
    ├── package.json
    ├── package-lock.json
    └── vite.config.js
```

## Edit the frontend

Install Node.js 22.12 or later. From the `frontend` folder, run `npm ci` and then `npm run build`. Restart the launcher or refresh the browser to see the build. For development with live reload, keep the Flask app running on port 8000, run `npm run dev` from `frontend`, and open the URL shown by Vite.

If port 8000 is occupied, start the bundled app with `python run.py --port 8001`. To stop the launcher from opening a browser automatically, add `--no-browser`.

## Sample photo

The bundled image shows a green sea turtle above a coral reef at Baker Island. Photo by NOAA, public domain, distributed by the U.S. Fish and Wildlife Service. [Image credit and source](https://www.fws.gov/media/green-sea-turtle-swims-above-coral-reef-baker-islandcreditnoaajpg).

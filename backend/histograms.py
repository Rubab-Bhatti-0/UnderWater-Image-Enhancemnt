"""Make a shared-scale comparison of the original and enhanced RGB values."""

from io import BytesIO
from threading import Lock

import numpy as np
from matplotlib.backends.backend_agg import FigureCanvasAgg
from matplotlib.figure import Figure
from matplotlib.ticker import MaxNLocator

PLOT_LOCK = Lock()
CHANNELS = (("Red", "#ff798d"), ("Green", "#4ce4ac"), ("Blue", "#65a9ff"))


def channel_histograms(image):
    return [
        100 * np.bincount(image[:, :, channel].ravel(), minlength=256)
        / (image.shape[0] * image.shape[1])
        for channel in range(3)
    ]


def plot_comparison(original, enhanced):
    groups = [channel_histograms(image) for image in (original, enhanced)]
    maximum = max(values.max() for group in groups for values in group)

    with PLOT_LOCK:
        figure = Figure(figsize=(4.0, 2.9), dpi=155, facecolor="#0d1827")
        FigureCanvasAgg(figure)
        axes = figure.subplots(2, 1, sharex=True, sharey=True)
        figure.subplots_adjust(left=0.19, right=0.96, top=0.89, bottom=0.20, hspace=0.62)

        for axis, group, title in zip(axes, groups, ("Original", "Enhanced")):
            axis.set_facecolor("#0d1827")
            for (_, color), values in zip(CHANNELS, group):
                axis.plot(range(256), values, color=color, linewidth=1.1)
                axis.fill_between(range(256), values, color=color, alpha=0.10)
            axis.set_title(title, loc="left", fontsize=10, color="#c7d5e5", pad=5)
            axis.spines[["top", "right"]].set_visible(False)
            axis.spines[["bottom", "left"]].set_color("#2b3d50")
            axis.grid(axis="y", color="#213044", linewidth=0.7)
            axis.set_axisbelow(True)
            axis.tick_params(colors="#a2b4c9", labelsize=9, length=2)
            axis.set_xlim(0, 255)
            axis.set_ylim(0, maximum * 1.08)
            axis.set_xticks([0, 64, 128, 192, 255])
            axis.yaxis.set_major_locator(MaxNLocator(nbins=3))

        figure.text(0.042, 0.51, "Pixels (%)", rotation="vertical", ha="center",
                    va="center", fontsize=10, color="#a2b4c9")
        axes[-1].set_xlabel("Intensity", color="#a2b4c9", fontsize=10)
        result = BytesIO()
        figure.savefig(result, format="png", facecolor=figure.get_facecolor())
        return result.getvalue()

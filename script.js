let finalBlob = null;

const photoInput = document.getElementById("photoInput");
const compressBtn = document.getElementById("compressBtn");
const downloadBtn = document.getElementById("downloadBtn");
const previewImage = document.getElementById("previewImage");


// ===============================
// Photo Select
// ===============================

photoInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) {
        return;
    }

    // Show original size immediately
    document.getElementById("originalInfo").innerHTML = `
        📁 <strong>Original Size:</strong> ${formatSize(file.size)}
        <br>
        📄 <strong>File Name:</strong> ${file.name}
    `;

    document.getElementById("sizeInfo").innerHTML = "";

    document.getElementById("error").textContent = "";

    previewImage.style.display = "none";

    downloadBtn.style.display = "none";
});


// ===============================
// Format File Size
// ===============================

function formatSize(bytes) {

    if (bytes < 1024) {
        return bytes.toFixed(0) + " Bytes";
    }

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


// ===============================
// Target Size
// ===============================

function getTargetBytes() {

    const value = parseFloat(
        document.getElementById("targetSize").value
    );

    const unit =
        document.getElementById("unit").value;

    if (!value || value <= 0) {
        return 0;
    }

    if (unit === "MB") {
        return value * 1024 * 1024;
    }

    return value * 1024;
}


// ===============================
// Load Image
// ===============================

function loadImage(file) {

    return new Promise((resolve, reject) => {

        const img = new Image();

        img.onload = function () {
            resolve(img);
        };

        img.onerror = function () {
            reject(new Error("Image loading failed"));
        };

        img.src = URL.createObjectURL(file);
    });
}


// ===============================
// Canvas to Blob
// ===============================

function canvasToBlob(canvas, format, quality) {

    return new Promise(resolve => {

        canvas.toBlob(
            function (blob) {
                resolve(blob);
            },
            format,
            quality
        );

    });
}


// ===============================
// Compress Photo
// ===============================

async function compressPhoto() {

    const file = photoInput.files[0];

    const error =
        document.getElementById("error");

    error.textContent = "";

    if (!file) {

        error.textContent =
            "Please select a photo first.";

        return;
    }


    const targetBytes = getTargetBytes();


    if (!targetBytes) {

        error.textContent =
            "Please enter a valid target size.";

        return;
    }


    const format =
        document.getElementById("format").value;


    const maxWidth =
        parseInt(
            document.getElementById("maxWidth").value
        );


    const maxHeight =
        parseInt(
            document.getElementById("maxHeight").value
        );


    if (
        !maxWidth ||
        !maxHeight ||
        maxWidth <= 0 ||
        maxHeight <= 0
    ) {

        error.textContent =
            "Please enter valid width and height.";

        return;
    }


    compressBtn.disabled = true;

    compressBtn.textContent =
        "Compressing...";


    try {

        const img =
            await loadImage(file);


        let width = img.width;
        let height = img.height;


        // Keep original aspect ratio
        const scale = Math.min(
            1,
            maxWidth / width,
            maxHeight / height
        );


        width =
            Math.round(width * scale);

        height =
            Math.round(height * scale);


        let canvas =
            document.createElement("canvas");


        canvas.width = width;
        canvas.height = height;


        let ctx =
            canvas.getContext("2d");


        ctx.drawImage(
            img,
            0,
            0,
            width,
            height
        );


        // =================================
        // Try different quality levels
        // =================================

        let low = 0.05;
        let high = 1.0;

        let bestBlob = null;


        for (let i = 0; i < 15; i++) {

            const quality =
                (low + high) / 2;


            const blob =
                await canvasToBlob(
                    canvas,
                    format,
                    quality
                );


            if (!blob) {
                continue;
            }


            if (blob.size <= targetBytes) {

                bestBlob = blob;

                low = quality;

            } else {

                high = quality;
            }
        }


        // =================================
        // If quality is not enough,
        // reduce resolution
        // =================================

        if (!bestBlob) {

            let currentCanvas = canvas;


            for (
                let attempt = 0;
                attempt < 12;
                attempt++
            ) {

                const newCanvas =
                    document.createElement("canvas");


                newCanvas.width =
                    Math.max(
                        100,
                        Math.round(
                            currentCanvas.width * 0.85
                        )
                    );


                newCanvas.height =
                    Math.max(
                        100,
                        Math.round(
                            currentCanvas.height * 0.85
                        )
                    );


                const newCtx =
                    newCanvas.getContext("2d");


                newCtx.drawImage(
                    currentCanvas,
                    0,
                    0,
                    newCanvas.width,
                    newCanvas.height
                );


                const blob =
                    await canvasToBlob(
                        newCanvas,
                        format,
                        0.75
                    );


                if (
                    blob &&
                    blob.size <= targetBytes
                ) {

                    bestBlob = blob;

                    width =
                        newCanvas.width;

                    height =
                        newCanvas.height;

                    break;
                }


                currentCanvas = newCanvas;
            }
        }


        // =================================
        // Could not reach target
        // =================================

        if (!bestBlob) {

            error.textContent =
                "Target size is too small. Please try a larger size.";

            return;
        }


        // Save final file
        finalBlob = bestBlob;


        // =================================
        // Preview
        // =================================

        const imageURL =
            URL.createObjectURL(bestBlob);


        previewImage.src = imageURL;

        previewImage.style.display =
            "block";


        // =================================
        // Size calculations
        // =================================

        const originalSize =
            file.size;


        const compressedSize =
            bestBlob.size;


        let reduction =
            (
                (originalSize - compressedSize)
                / originalSize
            ) * 100;


        // Prevent negative percentage
        if (reduction < 0) {
            reduction = 0;
        }


        // =================================
        // Show all information
        // =================================

        document.getElementById(
            "sizeInfo"
        ).innerHTML = `

            📁 <strong>Original Size:</strong>
            ${formatSize(originalSize)}

            <br>

            📦 <strong>Compressed Size:</strong>
            ${formatSize(compressedSize)}

            <br>

            📉 <strong>Reduction:</strong>
            ${reduction.toFixed(1)}%

            <br>

            📐 <strong>Resolution:</strong>
            ${width} × ${height} px
        `;


        // Show download button
        downloadBtn.style.display =
            "block";


    } catch (e) {

        error.textContent =
            "Something went wrong. Please try another photo.";

        console.error(e);

    } finally {

        compressBtn.disabled = false;

        compressBtn.textContent =
            "Compress Photo";
    }
}


// ===============================
// Compress Button
// ===============================

compressBtn.addEventListener(
    "click",
    compressPhoto
);


// ===============================
// Download
// ===============================

downloadBtn.addEventListener(
    "click",
    function () {

        if (!finalBlob) {
            return;
        }


        const format =
            document.getElementById(
                "format"
            ).value;


        let extension = "jpg";


        if (format === "image/png") {
            extension = "png";
        }


        if (format === "image/webp") {
            extension = "webp";
        }


        const link =
            document.createElement("a");


        const url =
            URL.createObjectURL(finalBlob);


        link.href = url;

        link.download =
            "compressed-photo." + extension;


        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);


        setTimeout(
            function () {
                URL.revokeObjectURL(url);
            },
            1000
        );
    }
);
/**
 * Compresses an image file on the client side using HTML5 Canvas.
 * Reduces file size significantly (e.g., 5MB -> ~200KB) before uploading to server.
 * 
 * @param {File} file - Original image file from input
 * @param {Object} options - Configuration options
 * @param {number} options.maxWidth - Maximum width of output image (default: 1600)
 * @param {number} options.maxHeight - Maximum height of output image (default: 1600)
 * @param {number} options.quality - JPEG quality between 0.1 and 1.0 (default: 0.8)
 * @returns {Promise<File>} Compressed File object
 */
export async function compressImage(file, options = {}) {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.8 } = options;

  // Don't attempt to compress non-image files or SVG
  if (!file || !file.type.startsWith("image/") || file.type.includes("svg")) {
    return file;
  }

  // If file is already small (< 300KB), return as is
  if (file.size < 300 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Calculate scaling preserving aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas content to compressed JPEG Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }

            // Create new File object with original name and compressed data
            const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], fileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            // Return compressed file only if it's smaller than original
            if (compressedFile.size < file.size) {
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an array of image files in parallel.
 * 
 * @param {File[]} files - Array of image files
 * @param {Object} options - Compression options
 * @returns {Promise<File[]>} Array of compressed File objects
 */
export async function compressMultipleImages(files, options = {}) {
  if (!Array.isArray(files) || files.length === 0) return [];
  return Promise.all(files.map((file) => compressImage(file, options)));
}

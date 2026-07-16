import os
import cv2
import numpy as np

def generate_looping_gradient(output_path, width=3840, height=2160, duration_sec=10, fps=30):
    print(f"Generating {duration_sec}s looping gradient video at {width}x{height} ({fps} FPS)...")
    
    # We will compute on a lower-resolution grid and upscale using cv2.resize
    # to make the generation fast while producing crystal-clear 4K outputs.
    grid_w = 480
    grid_h = 270
    
    num_frames = duration_sec * fps
    
    # Define RentEd colors (in BGR format)
    colors = [
        np.array([234, 243, 247], dtype=np.float32),  # Cream / Canvas (#f7f3ea)
        np.array([54, 111, 236], dtype=np.float32),   # Accent Orange (#ec6f36)
        np.array([69, 82, 39], dtype=np.float32),     # Pine Green (#275245)
        np.array([109, 198, 242], dtype=np.float32),  # Warm Gold (#f2c66d)
    ]
    
    # Grid coordinates
    x = np.arange(grid_w)
    y = np.arange(grid_h)
    x_grid, y_grid = np.meshgrid(x, y)
    
    # Create the VideoWriter.
    # Try different common codecs to ensure compatibility on Windows.
    # mp4v is standard, avc1 or H264 are also common.
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    if not out.isOpened():
        print("Error: Could not open VideoWriter. Trying alternative codec 'avc1'...")
        fourcc = cv2.VideoWriter_fourcc(*'avc1')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
    if not out.isOpened():
        print("Error: Could not open VideoWriter. Trying alternative codec 'XVID'...")
        fourcc = cv2.VideoWriter_fourcc(*'XVID')
        # Use .avi extension for XVID fallback if needed, but we'll try to stick to output_path first
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
    if not out.isOpened():
        raise RuntimeError("OpenCV was unable to initialize VideoWriter with standard codecs.")

    # Variance for Gaussian weight (defines blob size)
    sigma = grid_w * 0.45
    sigma_sq = sigma ** 2
    
    for frame_idx in range(num_frames):
        # Angle from 0 to 2*pi for perfect looping
        theta = 2.0 * np.pi * frame_idx / num_frames
        
        # Define periodic trajectories for color sources
        # Source 0 (Cream)
        cx0 = grid_w / 3.0 + (grid_w / 5.0) * np.cos(theta)
        cy0 = grid_h / 2.0 + (grid_h / 4.0) * np.sin(theta)
        
        # Source 1 (Orange)
        cx1 = 2.0 * grid_w / 3.0 + (grid_w / 6.0) * np.sin(2 * theta)
        cy1 = grid_h / 3.0 + (grid_h / 6.0) * np.cos(theta)
        
        # Source 2 (Green)
        cx2 = grid_w / 4.0 + (grid_w / 8.0) * np.sin(theta)
        cy2 = 3.0 * grid_h / 4.0 + (grid_h / 6.0) * np.cos(theta)
        
        # Source 3 (Gold)
        cx3 = 3.0 * grid_w / 4.0 + (grid_w / 8.0) * np.cos(theta)
        cy3 = 3.0 * grid_h / 4.0 + (grid_h / 8.0) * np.sin(theta)
        
        centers = [(cx0, cy0), (cx1, cy1), (cx2, cy2), (cx3, cy3)]
        
        weights = []
        for cx, cy in centers:
            # Squared distance from center
            dist_sq = (x_grid - cx) ** 2 + (y_grid - cy) ** 2
            # Gaussian weight
            w = np.exp(-dist_sq / (2.0 * sigma_sq))
            weights.append(w)
            
        # Stack weights and normalize
        weights = np.stack(weights, axis=-1)  # shape (h, w, 4)
        sum_weights = np.sum(weights, axis=-1, keepdims=True)
        norm_weights = weights / (sum_weights + 1e-8)
        
        # Blend colors
        # norm_weights has shape (h, w, 4), colors list of 4 arrays of shape (3,)
        frame = np.zeros((grid_h, grid_w, 3), dtype=np.float32)
        for i, c in enumerate(colors):
            frame += norm_weights[:, :, i:i+1] * c
            
        # Convert frame to uint8
        frame = np.clip(frame, 0, 255).astype(np.uint8)
        
        # Smooth the frame using high quality blur
        frame = cv2.GaussianBlur(frame, (15, 15), 0)
        
        # Upscale frame to 4K using Bicubic interpolation
        frame_4k = cv2.resize(frame, (width, height), interpolation=cv2.INTER_CUBIC)
        
        # Write to video
        out.write(frame_4k)
        
        if (frame_idx + 1) % 30 == 0:
            print(f"Rendered {frame_idx + 1}/{num_frames} frames...")
            
    out.release()
    print(f"Successfully generated looping 4K video at: {output_path}")

if __name__ == "__main__":
    output_dir = r"C:\Users\Lenovo\Desktop\WEB\RentED\client\public\videos"
    output_file = os.path.join(output_dir, "hero-bg.mp4")
    generate_looping_gradient(output_file)

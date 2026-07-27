import { useEffect, useRef } from "react";

export default function SmokyWaveCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement.offsetHeight || window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    let time = 0;

    const render = () => {
      time += 0.018;
      ctx.clearRect(0, 0, width, height);

      // Draw flowing sine wave ribbons
      for (let waveIndex = 0; waveIndex < 5; waveIndex++) {
        ctx.beginPath();
        const baseHeight = height * (0.25 + waveIndex * 0.15);
        const waveAmplitude = 40 + waveIndex * 12;
        const frequency = 0.0025 + waveIndex * 0.001;
        const phaseShift = time * (0.9 + waveIndex * 0.25);

        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 8) {
          const y =
            baseHeight +
            Math.sin(x * frequency + phaseShift) * waveAmplitude +
            Math.cos(x * 0.007 + time) * 18;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseHeight - 80, width, baseHeight + 120);
        if (waveIndex % 2 === 0) {
          grad.addColorStop(0, "rgba(255, 255, 255, 0.0)");
          grad.addColorStop(0.5, `rgba(255, 255, 255, ${0.28 - waveIndex * 0.04})`);
          grad.addColorStop(1, "rgba(242, 198, 109, 0.0)");
        } else {
          grad.addColorStop(0, "rgba(255, 250, 240, 0.0)");
          grad.addColorStop(0.5, `rgba(255, 255, 255, ${0.32 - waveIndex * 0.04})`);
          grad.addColorStop(1, "rgba(236, 111, 54, 0.0)");
        }

        ctx.fillStyle = grad;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };


    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full z-[2] mix-blend-screen opacity-90"
    />
  );
}

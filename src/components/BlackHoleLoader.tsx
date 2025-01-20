import {  useEffect, useState } from 'react';
import './BlackHoleLoader.css';
import { interpolateColor } from '../utils/colorTransition';
import useLoading from '../hooks/useLoading';

const BlackHoleLoader = () => {

  //const color = useMemo(() => `#${Math.floor(Math.random() * 16777215).toString(16)}`, []);

  const {loading} = useLoading();
  const [color, setColor] = useState(`#${Math.floor(Math.random() * 16777215).toString(16)}`);
  const [blurAnimation, setBlurAnimation] = useState(false);

  const animateColorTransition = (startColor: string, endColor: string, duration: number) => {
    const startTime = performance.now();

    function update() {
        const currentTime = performance.now();
        const elapsedTime = currentTime - startTime;
        const factor = Math.min(elapsedTime / duration, 1); // Clamp the value between 0 and 1

        // Get the interpolated color
        const interpolatedColor = interpolateColor(startColor, endColor, factor);

        // Update the background color (or any other property)
        setColor(interpolatedColor);

        if (factor < 1) {
            requestAnimationFrame(update); // Continue the animation
        }
    }

    requestAnimationFrame(update); // Start the animation
}

useEffect(() => {
  setTimeout(() => {
    setBlurAnimation(true);
  }, 500);
}, [loading]);

  useEffect(() => {
    // Change the color every 3 seconds
    const intervalId = setInterval(() => {
      const newColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
      animateColorTransition(color, newColor, 750);
    }, 750);
    return () => clearInterval(intervalId);
  }, [color]);

  return (
    <div className={`black-hole-container ${blurAnimation ? 'blur-container' : ''}`}>
      <div className={`black-hole ${blurAnimation ? 'blur' : ''}`}>
        <svg className="accretion-disk" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="red-comet" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.1" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
            <linearGradient id="blue-comet" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.1" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>

          {/* Red Comet - Top Quarter */}
          <path
            d="M 100 10 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="url(#red-comet)"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Blue Comet - Bottom Quarter */}
          <path
            d="M 10 100 A 90 90 0 0 0 100 190"
            fill="none"
            stroke="url(#blue-comet)"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default BlackHoleLoader;

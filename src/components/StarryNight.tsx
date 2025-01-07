import { useRef, useEffect } from 'react';

interface StarryNightProps {
    starCount?: number;
    nebulaCount?: number;
    speed?: number;
    }

interface NebulaProps {
    x: number;
    y: number;
    radius: number;
    hue: number;
    alpha: number;
    }

interface StarProps {
    x: number;
    y: number;
    z: number
    radius: number;
    alpha: number;
    decreasing: boolean;
  }

const StarryNight = ({ starCount = 200, nebulaCount = 5, speed = 0.02 }: StarryNightProps) => {
  const speedFactor = useRef(speed > 0.05 || speed < -0.05 ? Math.abs(speed) : 0.05);
  const targetSpeedFactor = useRef(0.05);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevTime = useRef<number >();
  const prevScroll = useRef(0);
  const animationFrameId = useRef<number >(0);
  const scrollDelta = useRef(0);

  if (0 < speed && speed > 0.05) {
    throw new Error('Speed must be between 0 and 0.05');
  }

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      console.error('Could not find canvas element');
      return;
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Could not get 2d context from canvas element');
      return;
    }


    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Create stars
    const initStars = () => {
      const stars : StarProps[] = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * 1600 - 800, // canvas.width,
          y: Math.random() * 900 - 450, // canvas.height,
          z: Math.random() * 1000,
          radius: Math.random() * 5 + 1,
          alpha: Math.random(),
          decreasing: Math.random() < 0.5
        });
      }
      return stars;
    };

    const stars = initStars();

    const clear = () => {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const moveStarsZ = (distance: number) => {
      const count = stars.length;
      for (let i = 0; i < count; i++) {
        const s = stars[i];
        s.z -= distance;
        if (s.z >= 1000) {
          s.z -= 1000;
        }
        while (s.z <= 1) {
          s.z += 1000;
          s.x = Math.random() * 1600 - 800;
          s.y = Math.random() * 900 - 450;
        }
      }
    };

    const moveStarsY = (distance: number) => {
      const count = stars.length;
      for (let i = 0; i < count; i++) {
        const s = stars[i];
        s.y += distance;
        if (s.y > canvas.height) {
          s.y = 0;
        }
      }
    };

    // Create nebulas
    const initNebulas = () => {
      const nebulas : NebulaProps[] = [];
      for (let i = 0; i < nebulaCount; i++) {
        nebulas.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 100 + 50,
          hue: Math.random() * 60 + 200,
          alpha: Math.random() * 0.5
        });
      }
      return nebulas;
    };

    const nebulas = initNebulas();

    // Draw nebula
    const drawNebula = ({ x, y, radius, hue, alpha }: NebulaProps) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `hsla(${hue.toString()}, 100%, 60%, ${alpha.toString()})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    // Animate stars and nebulas
    const animate = (time: number) => {

      console.log(speedFactor.current);
      // Interpolate speedFactor
      speedFactor.current += (targetSpeedFactor.current - speedFactor.current) * 0.05;


      if (!prevTime.current) prevTime.current = time;
      const elapsed = time - prevTime.current;
      prevTime.current = time;

      clear();

      // Draw nebulas
      nebulas.forEach(nebula => {
        drawNebula(nebula);
      });

      // Move stars
      moveStarsZ(elapsed * speedFactor.current);
      moveStarsY(elapsed * speedFactor.current);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Set up star drawing properties
      ctx.shadowBlur = 2;
      ctx.shadowColor = 'white';


      // Draw and animate stars
      stars.forEach(star => {

        if (star.y < -450) {
          star.y = Math.random() * 900 - 450; // canvas.height,
        }

        const x = cx + star.x / (star.z * 0.001);
        const y = cy + star.y / (star.z * 0.001);

        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
          return;
        }

        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha.toString()})`;
        ctx.fill();

        // Twinkle effect
        if (star.decreasing) {
          star.alpha -= 0.01;
          if (star.alpha <= 0) {
            star.decreasing = false;
          }
        } else {
          star.alpha += 0.01;
          if (star.alpha >= 1) {
            star.decreasing = true;
          }
        }
      });
      ctx.shadowBlur = 0; // Reset shadow blur
      animationFrameId.current = window.requestAnimationFrame(animate);
    };

    // Initial setup
    resizeCanvas();
    initNebulas();
    animate(0);


    // Handle window resize
    window.addEventListener('resize', () => {
      resizeCanvas();
      initNebulas();
    });

    // Handle window scroll
    window.addEventListener('scroll', () => {
      // inverse and accelerate speedfactor if scrolling up, accelerate if scrolling down
      scrollDelta.current = window.scrollY - prevScroll.current;
      prevScroll.current = window.scrollY;
      targetSpeedFactor.current = Math.min(0.2, Math.max(-0.2, targetSpeedFactor.current + scrollDelta.current / 1000));
    });


    window.addEventListener('scrollend', () => {
      // desacelerate after scrolling to default values( if scroll was up then default value is negative, is was down is positive)
      targetSpeedFactor.current = speedFactor.current > 0 ? 0.05 : -0.05;
    });


    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      // window.removeEventListener('scroll', initStars);
      window.cancelAnimationFrame(animationFrameId.current);
    };
  }, [starCount, nebulaCount, speedFactor]);

  return <canvas ref={canvasRef}
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: -1,
      pointerEvents: 'none' }} />;
};

export default StarryNight;


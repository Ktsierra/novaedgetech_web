import { useRef, useEffect } from 'react';

interface StarryNightProps {
    starCount?: number;
    nebulaCount?: number;
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
    radius: number;
    alpha: number;
    decreasing: boolean;
  }

const StarryNight = ({ starCount = 200, nebulaCount = 5 }: StarryNightProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    let animationFrameId : number;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Create stars
    let stars : StarProps[];

    const initStars = () => {
      stars = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.5,
          alpha: Math.random(),
          decreasing: Math.random() < 0.5
        });
      }
    };

    // Create nebulas
    let nebulas : NebulaProps[];
    const initNebulas = () => {
      nebulas = [];
      for (let i = 0; i < nebulaCount; i++) {
        nebulas.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 100 + 50,
          hue: Math.random() * 60 + 200,
          alpha: Math.random() * 0.5
        });
      }
    };

    // Draw nebula
    const drawNebula = ({ x, y, radius, hue, alpha }: NebulaProps) => {
      if (!ctx) {
        return;
      }

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `hsla(${hue.toString()}, 100%, 60%, ${alpha.toString()})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    // Animate stars and nebulas
    const animate = () => {
      if (!ctx) {
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw nebulas
      nebulas.forEach(nebula => {
        drawNebula(nebula);
      });

      // Draw and animate stars
      ctx.fillStyle = '#ffffff';
      stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
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

      animationFrameId = window.requestAnimationFrame(animate);
    };

    // Initial setup
    resizeCanvas();
    initStars();
    initNebulas();
    animate();


    // Handle window resize
    window.addEventListener('resize', () => {
      resizeCanvas();
      initStars();
      initNebulas();
    });

    // Handle scroll
    window.addEventListener('scroll', () => {
      initStars();
    });

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('scroll', initStars);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [starCount, nebulaCount]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }} />;
};

export default StarryNight;


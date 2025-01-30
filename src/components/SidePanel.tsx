import { motion } from "framer-motion";
import './SidePanel.css';
import { useEffect, useState } from "react";

interface SidePanelProps {
    direction: 'left' | 'right' | 'bottom';
    children: React.ReactNode;
}

const SidePanel: React.FC<SidePanelProps> = ({ direction, children } : SidePanelProps) => {
  const [stacked, setStacked] = useState(false);
  const getInitialPosition = () => {
    switch (direction) {
    case 'left': return { x: '-100vw' };
    case 'right': return { x: '100vw' };
    case 'bottom': return { y: '100vh' };
    default: return { x: 0 };
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setStacked(window.innerWidth <= 800);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <motion.div
      className={`side-panel ${direction} ${stacked ? 'stacked' : ''}`}
      initial={stacked ? { opacity: 0 } : getInitialPosition()}
      animate={stacked ? { opacity: 1 } : {
        x: direction !== 'bottom' ? 0 : undefined,
        y: direction === 'bottom' ? 0 : undefined
      }}
      transition={{
        type: 'spring',
        duration: 0.5
      }}
      exit={stacked ? { opacity: 0 } : getInitialPosition()}
      style={{
        position: stacked ? 'static' : 'fixed',
        ...((!stacked && direction === 'bottom')
          ? { bottom: 0, left: '50%', transform: 'translateX(-50%)' }
          : direction === 'left'
            ? { left: 0, top: '30%' }
            : { right: 0, top: '10%' })
      }}
    >
      {children}
    </motion.div>
  );
};

export default SidePanel;
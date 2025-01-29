import { motion } from "framer-motion";
import './SidePanel.css';

interface SidePanelProps {
    direction: 'left' | 'right' | 'bottom';
    children: React.ReactNode;
}

const SidePanel: React.FC<SidePanelProps> = ({ direction, children } : SidePanelProps) => {
  const getInitialPosition = () => {
    switch (direction) {
    case 'left': return { x: '-100vw' };
    case 'right': return { x: '100vw' };
    case 'bottom': return { y: '100vh' };
    default: return { x: 0 };
    }
  };

  return (
    <motion.div
      className={`side-panel ${direction}`}
      initial={getInitialPosition()}
      animate={{
        x: direction !== 'bottom' ? 0 : undefined,
        y: direction === 'bottom' ? 0 : undefined
      }}
      transition={{
        type: 'spring',
        stiffness: 120,
        damping: 20,
        duration: 0.8
      }}
      exit={getInitialPosition()}
      style={{
        position: 'fixed',
        ...(direction === 'bottom' ? { bottom: 0, left: '50%', transform: 'translateX(-50%)' } :
          direction === 'left' ? { left: 0, top: '30%' } :
            { right: 0, top: '10%' })
      }}
    >
      {children}
    </motion.div>
  );
};

export default SidePanel;
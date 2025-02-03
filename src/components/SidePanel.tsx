import { motion } from "framer-motion";
import './SidePanel.css';

interface SidePanelProps {
    transitionFrom: {
      x?: string;
      y?: string;
    };
    styles: React.CSSProperties;
    children: React.ReactNode;
}

const SidePanel: React.FC<SidePanelProps> = ({ transitionFrom, styles, children } : SidePanelProps) => {
  return (
    <motion.div
      className={`side-panel ${styles.left ? 'left' : ''} ${styles.right ? 'right' : ''} ${styles.bottom ? 'bottom' : ''}`}
      onClick={(e) => { e.stopPropagation(); }}
      initial={transitionFrom}
      animate={{
        x: styles.left ? 0 : styles.right ? 0 : 0,
        y: styles.top ? 0 : styles.bottom ? 0 : 0

      }}
      transition={{
        type: 'spring',
        duration: 0.5
      }}
      exit={transitionFrom}
      style={{
        position: 'absolute',
        top: styles.top,
        right: styles.right,
        bottom: styles.bottom,
        left: styles.left,
        width: styles.width ?? 'fit-content',
        height: styles.height ?? 'fit-content',
        ...styles
      }}
    >
      {children}
    </motion.div>
  );
};

export default SidePanel;
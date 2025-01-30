import { motion } from "framer-motion";
import './SidePanel.css';
import useStacked from "../hooks/useStacked";

interface SidePanelProps {
    transitionFrom: {
      x?: string;
      y?: string;
    };
    styles: React.CSSProperties;
    children: React.ReactNode;
}

const SidePanel: React.FC<SidePanelProps> = ({ transitionFrom, styles, children } : SidePanelProps) => {

  const { stacked } = useStacked();

  return (
    <motion.div
      className={`side-panel ${styles.left ? 'left' : ''} ${styles.right ? 'right' : ''} ${styles.bottom ? 'bottom' : ''} ${stacked ? 'stacked' : ''}`}
      initial={transitionFrom}
      animate={{
        x: stacked ? 0 : styles.left ? 0 : styles.right ? 0 : 0,
        y: stacked ? 0 : styles.top ? 0 : styles.bottom ? 0 : 0

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
        zIndex: stacked ? 100 : 0,
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
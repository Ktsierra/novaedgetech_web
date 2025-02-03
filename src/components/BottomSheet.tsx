import './BottomSheet.css';
import { motion } from 'framer-motion';

interface BottomSheetProps {
    children?: React.ReactNode
}
const BottomSheet = ({ children }: BottomSheetProps) => {

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <motion.div
      onClick={(e) => { e.stopPropagation(); }}
      onScroll={(e)=> { handleScroll(e); }}
      className="bottom-sheet"
      initial={{ y: '100%' }}
      animate={{ y: '0%' }}
      exit={{ y: '100%' }}
      transition={{ duration: 1 }}
    >
      <div className="bottom-sheet-content">
        {children}
      </div>
    </motion.div>)
  ;
};

export default BottomSheet;
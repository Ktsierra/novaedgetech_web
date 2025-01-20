import { useEffect, useMemo, useState } from 'react';
import useLoading from '../hooks/useLoading';
import './BlackHoleLoader.css';

const BlackHoleLoader = () => {
  const [percentage, setPercentage] = useState(0);
  const { loading } = useLoading();
  const color = useMemo(() => `#${Math.floor(Math.random() * 16777215).toString(16)}`, []);



  useEffect(() => {
    console.log(loading);
    if (!loading) {
      setPercentage(100);
      return;
    }
    const interval = setInterval(() => {
      setPercentage(prev => {
        if (prev === 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 5);
    return () => { clearInterval(interval); };
  }, [loading]);


  // red ff6b6b blue 44a8d4
  return (
    <div className="black-hole-container">
      <div className="black-hole">
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
        <h1 className='loading-text'>{percentage.toString() + '%'}</h1>
      </div>
    </div>
  );
};

export default BlackHoleLoader;

import useCamera from "../hooks/useCamera";
import { initialReferencePoints } from "../constants/referencePoints";
const PresentationCard = () => {
  const { starSelected } = useCamera();

  if (!starSelected || starSelected >= initialReferencePoints.length) {
    return null;
  }

  const { title } = initialReferencePoints[starSelected];

  return (
    <div style={{
      position : 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      gap: '20px',
      background: 'rgba(0, 0, 0, 0.5)',
      color: '#fff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.3)',
    }}
    >
      <p>
        <strong>Name:</strong> {title}
      </p>
    </div>

  );
};

export default PresentationCard;
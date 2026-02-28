import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import MeetingRoom from '../components/MeetingRoom';

const ContinuousMeetingRoom = () => {
  const [searchParams] = useSearchParams();
  const mode = useMemo(() => {
    const raw = searchParams.get('mode');
    return raw === 'turn' ? 'turn' : 'normal';
  }, [searchParams]);

  return <MeetingRoom meetingType="continuous" continuousMode={mode} />;
};

export default ContinuousMeetingRoom;

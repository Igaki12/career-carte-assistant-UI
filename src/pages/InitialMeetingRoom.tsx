import { Navigate } from 'react-router-dom';
import MeetingRoom from '../components/MeetingRoom';
import { canEnterWithDemographics, loadDemoUserState } from '../lib/demoUserState';

const InitialMeetingRoom = () => {
  const userState = loadDemoUserState();

  if (!canEnterWithDemographics(userState)) {
    return <Navigate to="/user/demographics?returnTo=%2Fapp%2Finitial" replace />;
  }

  return <MeetingRoom meetingType="initial" />;
};

export default InitialMeetingRoom;

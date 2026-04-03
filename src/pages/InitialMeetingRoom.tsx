import { Navigate } from 'react-router-dom';
import MeetingRoom from '../components/MeetingRoom';
import { hasConfiguredDemographics, loadDemoUserState } from '../lib/demoUserState';

const InitialMeetingRoom = () => {
  const userState = loadDemoUserState();

  if (!hasConfiguredDemographics(userState.demographics)) {
    return <Navigate to="/user/demographics?returnTo=%2Fapp%2Finitial" replace />;
  }

  return <MeetingRoom meetingType="initial" />;
};

export default InitialMeetingRoom;

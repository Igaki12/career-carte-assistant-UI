import { Box } from '@chakra-ui/react';
import { Route, Routes } from 'react-router-dom';
import Admin from './pages/Admin';
import ContinuousMeetingRoom from './pages/ContinuousMeetingRoom';
import ConsultantHome from './pages/ConsultantHome';
import DemographicsSetup from './pages/DemographicsSetup';
import Home from './pages/Home';
import InitialMeetingRoom from './pages/InitialMeetingRoom';
import UserHome from './pages/UserHome';

function App() {
  return (
    <Box minH="100vh" bg="gray.900">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/user" element={<UserHome />} />
        <Route path="/user/demographics" element={<DemographicsSetup />} />
        <Route path="/consultant" element={<ConsultantHome />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/app/initial" element={<InitialMeetingRoom />} />
        <Route path="/app/continuous" element={<ContinuousMeetingRoom />} />
      </Routes>
    </Box>
  );
}

export default App;

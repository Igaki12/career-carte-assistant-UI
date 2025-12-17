import { Box } from '@chakra-ui/react';
import { Route, Routes } from 'react-router-dom';
import Admin from './pages/Admin';
import AIMeetingRoom from './pages/AIMeetingRoom';
import ConsultantHome from './pages/ConsultantHome';
import Home from './pages/Home';
import UserHome from './pages/UserHome';

function App() {
  return (
    <Box minH="100vh" bg="gray.900">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/user" element={<UserHome />} />
        <Route path="/consultant" element={<ConsultantHome />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/app" element={<AIMeetingRoom />} />
      </Routes>
    </Box>
  );
}

export default App;

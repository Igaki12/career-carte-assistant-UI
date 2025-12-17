import { Box } from '@chakra-ui/react';
import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import AppMain from './pages/AppMain';

function App() {
  return (
    <Box minH="100vh" bg="gray.900">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<AppMain />} />
      </Routes>
    </Box>
  );
}

export default App;

import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Container,
  Grid,
  GridItem,
  useColorModeValue,
  useBreakpointValue,
  useDisclosure
} from '@chakra-ui/react';
import { useRef } from 'react';
import AppHeader from './components/AppHeader.jsx';
import AppFooter from './components/AppFooter.jsx';
import AuthDummy from './components/AuthDummy.jsx';
import SidebarScenario from './components/SidebarScenario.jsx';
import VrmStage from './components/VrmStage.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import TutorialDrawer from './components/TutorialDrawer.jsx';
import ResponsiveOverlays from './components/ResponsiveOverlays.jsx';
import ProgressDashboard from './components/ProgressDashboard.jsx';
import useAppStore from './store/useAppStore.js';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button
} from '@chakra-ui/react';

const App = () => {
  const {
    isAuthenticated,
    started,
    trainingEnded,
    endTraining,
    scores,
    messages
  } = useAppStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    started: state.started,
    trainingEnded: state.trainingEnded,
    endTraining: state.endTraining,
    scores: state.scores,
    messages: state.messages
  }));

  const scenarioDrawer = useDisclosure();
  const chatDrawer = useDisclosure();
  const endDialog = useDisclosure();
  const cancelRef = useRef();
  const isMobile = useBreakpointValue({ base: true, md: false });

  const canEndTraining = started && !trainingEnded;

  const handleConfirmEnd = () => {
    if (scenarioDrawer.isOpen) {
      scenarioDrawer.onClose();
    }
    if (chatDrawer.isOpen) {
      chatDrawer.onClose();
    }
    endTraining();
    endDialog.onClose();
  };

  const handleAfterLogin = () => {
    if (isMobile) {
      scenarioDrawer.onOpen();
      chatDrawer.onClose();
    }
  };

  const mainBg = useColorModeValue('gray.100', 'gray.900');

  return (
    <Box
      bg={mainBg}
      h="100dvh"
      m={0}
      p={0}
      display="flex"
      flexDirection="column"
      overflow="hidden"
    >
      <AppHeader />
      <Box
        as="main"
        flex="1"
        py="4"
        pb="4"
        display="flex"
        overflow="hidden"
      >
        <Container
          maxW="7xl"
          flex="1"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          <AuthDummy onAfterLogin={handleAfterLogin} />
          {!isAuthenticated ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle>ログインが必要です</AlertTitle>
                <AlertDescription>
                  上記ダミー認証フォームからログインすると UI を操作できるようになります。
                </AlertDescription>
              </Box>
            </Alert>
          ) : (
            <Box flex="1" display="flex" flexDirection="column" overflow="hidden">
              {!trainingEnded ? (
                <Grid
                  templateColumns={{
                    base: '1fr',
                    md: '260px minmax(0, 1fr) 320px',
                    lg: '280px minmax(0, 1fr) 420px'
                  }}
                  gap={{ base: 4, md: 6 }}
                  alignItems="stretch"
                  height={{ base: '100%', md: '100%' }}
                  flex="1"
                  overflow="hidden"
                >
                  <GridItem
                    display={{ base: 'none', md: 'block' }}
                    height="100%"
                    overflow="hidden"
                  >
                    <Box height="100%" overflowY="auto" pr={1}>
                      <SidebarScenario
                        onRequestTrainingEnd={endDialog.onOpen}
                        canEndTraining={canEndTraining}
                      />
                    </Box>
                  </GridItem>
                  <GridItem height="100%" overflow="hidden">
                    <Box height="100%" overflowY="auto">
                      <VrmStage />
                    </Box>
                  </GridItem>
                  <GridItem
                    display={{ base: 'none', md: 'block' }}
                    height="100%"
                    overflow="hidden"
                  >
                    <Box height="100%" overflowY="auto" pr={1}>
                      <ChatPanel />
                    </Box>
                  </GridItem>
                </Grid>
              ) : (
                <Box flex="1" overflowY="auto">
                  <ProgressDashboard
                    scores={scores}
                    messages={messages}
                    isVisible={trainingEnded}
                  />
                </Box>
              )}
            </Box>
          )}
        </Container>
      </Box>
      <AppFooter />

      <TutorialDrawer isVisible={isAuthenticated} />

      {isAuthenticated && (
        <ResponsiveOverlays
          scenarioContent={
            <SidebarScenario
              onClose={scenarioDrawer.onClose}
              onRequestTrainingEnd={endDialog.onOpen}
              canEndTraining={canEndTraining}
            />
          }
          chatContent={<ChatPanel />}
          isScenarioOpen={scenarioDrawer.isOpen}
          onOpenScenario={() => { scenarioDrawer.onOpen(); chatDrawer.onClose(); }}
          onCloseScenario={scenarioDrawer.onClose}
          isChatOpen={chatDrawer.isOpen}
          onOpenChat={() => { chatDrawer.onOpen(); scenarioDrawer.onClose(); }}
          onCloseChat={chatDrawer.onClose}
        />
      )}

      <AlertDialog
        isOpen={endDialog.isOpen}
        leastDestructiveRef={cancelRef}
        onClose={endDialog.onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              採点を実行しますか？
            </AlertDialogHeader>
            <AlertDialogBody>
              「これで採点してもよろしいですか？」 今回のセッションを終了し、採点サマリーとダッシュボードを表示します。
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={endDialog.onClose}>
                いいえ
              </Button>
              <Button colorScheme="green" onClick={handleConfirmEnd} ml={3}>
                はい
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default App;

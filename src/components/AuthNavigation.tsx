import {
  Badge,
  Box,
  Button,
  Flex,
  IconButton,
  Stack,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  FiBriefcase,
  FiEdit3,
  FiLogOut,
  FiPlayCircle,
  FiSettings,
  FiShield,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRoleLabel, type DemoAuthRole, type DemoAuthSession } from '../lib/demoAuth';
import {
  lightBottomLine,
  lightBorder,
  lightBorderStrong,
  lightModalShadow,
  lightMutedText,
  lightPanelBg,
  lightPanelSubtleBg,
  lightText,
  lightTopLine,
} from '../lib/lightThemeTokens';

type AuthNavigationProps = {
  session: DemoAuthSession;
  onLogout: () => void;
};

type NavigationItem = {
  label: string;
  to: string;
  pathname: string;
  icon: JSX.Element;
};

const getRoleColorScheme = (role: DemoAuthRole) => {
  if (role === 'admin') return 'orange';
  if (role === 'operations-admin') return 'cyan';
  if (role === 'company-admin') return 'pink';
  if (role === 'consultant') return 'purple';
  return 'teal';
};

const getNavigationItems = (role: DemoAuthRole): NavigationItem[] => {
  if (role === 'admin') {
    return [{ label: '管理コンソール', to: '/admin', pathname: '/admin', icon: <FiShield /> }];
  }
  if (role === 'operations-admin') {
    return [{ label: '運用管理者画面', to: '/operations-admin', pathname: '/operations-admin', icon: <FiBriefcase /> }];
  }
  if (role === 'company-admin') {
    return [
      { label: 'マイページ', to: '/user', pathname: '/user', icon: <FiUser /> },
      { label: 'プロフィール設定', to: '/user/demographics?returnTo=%2Fuser', pathname: '/user/demographics', icon: <FiEdit3 /> },
      { label: 'キャリアカルテの作成', to: '/app/initial', pathname: '/app/initial', icon: <FiPlayCircle /> },
      { label: '企業管理者画面', to: '/company-admin', pathname: '/company-admin', icon: <FiBriefcase /> },
    ];
  }
  if (role === 'consultant') {
    return [{ label: 'コンサルタント画面', to: '/consultant', pathname: '/consultant', icon: <FiUsers /> }];
  }
  return [
    { label: 'マイページ', to: '/user', pathname: '/user', icon: <FiUser /> },
    { label: 'プロフィール設定', to: '/user/demographics?returnTo=%2Fuser', pathname: '/user/demographics', icon: <FiEdit3 /> },
    { label: 'キャリアカルテの作成', to: '/app/initial', pathname: '/app/initial', icon: <FiPlayCircle /> },
  ];
};

function AuthNavigation({ session, onLogout }: AuthNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(() => !shouldReduceMotion);
  const navigationItems = useMemo(() => getNavigationItems(session.role), [session.role]);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const timer = window.setTimeout(() => setIsOpen(false), 800);
    return () => window.clearTimeout(timer);
  }, [shouldReduceMotion]);

  const handleNavigate = (to: string) => {
    navigate(to);
    setIsOpen(false);
  };

  return (
    <Box position="fixed" top={{ base: 3, md: 4 }} right={{ base: 3, md: 4 }} zIndex={50}>
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.div
            key="auth-navigation-panel"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.92, x: 20, y: -12 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, x: 22, y: -10 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <Box
              w={{ base: 'calc(100vw - 24px)', sm: '380px' }}
              maxW="calc(100vw - 24px)"
              bg={lightPanelBg}
              color={lightText}
              borderWidth="1px"
              borderColor={lightBorder}
              borderRadius="0"
              boxShadow={lightModalShadow}
              backdropFilter="blur(16px)"
              position="relative"
              overflow="hidden"
              _before={{
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                bgGradient: lightTopLine,
              }}
              _after={{
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '4px',
                bgGradient: lightBottomLine,
              }}
            >
              <Stack spacing={4} p={4} position="relative">
                <Flex justify="space-between" align="flex-start" gap={3}>
                  <Box minW={0}>
                    <Text fontSize="xs" color={lightMutedText} fontWeight="bold">
                      Career Karte Assistant
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" lineHeight="short" noOfLines={1}>
                      ナビゲーション
                    </Text>
                  </Box>
                  <IconButton
                    aria-label="ナビゲーションを閉じる"
                    icon={<FiX />}
                    size="sm"
                    variant="ghost"
                    color={lightText}
                    _hover={{ bg: 'rgba(22, 94, 131, 0.08)' }}
                    onClick={() => setIsOpen(false)}
                  />
                </Flex>

                <Box borderWidth="1px" borderColor={lightBorder} bg={lightPanelSubtleBg} p={3}>
                  <Flex justify="space-between" align="center" gap={3} wrap="wrap">
                    <Stack spacing={0} minW={0}>
                      <Text fontSize="xs" color={lightMutedText} fontWeight="bold">
                        ログイン中
                      </Text>
                      <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                        {session.accountId}
                      </Text>
                    </Stack>
                    <Badge colorScheme={getRoleColorScheme(session.role)}>{getRoleLabel(session.role)}</Badge>
                  </Flex>
                </Box>

                <Stack spacing={2}>
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.pathname;
                    return (
                      <Button
                        key={item.pathname}
                        justifyContent="flex-start"
                        leftIcon={item.icon}
                        variant={isActive ? 'solid' : 'ghost'}
                        bg={isActive ? 'rgba(22, 94, 131, 0.18)' : 'transparent'}
                        color={lightText}
                        borderWidth="1px"
                        borderColor={isActive ? lightBorderStrong : 'transparent'}
                        _hover={{ bg: 'rgba(22, 94, 131, 0.08)', borderColor: lightBorder }}
                        onClick={() => handleNavigate(item.to)}
                      >
                        {item.label}
                      </Button>
                    );
                  })}
                </Stack>

                <Button
                  leftIcon={<FiLogOut />}
                  color="red.700"
                  bg="red.50"
                  borderWidth="1px"
                  borderColor="red.200"
                  _hover={{ bg: 'red.100' }}
                  onClick={onLogout}
                >
                  ログアウト
                </Button>
              </Stack>
            </Box>
          </motion.div>
        ) : (
          <motion.div
            key="auth-navigation-collapsed"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.82, rotate: -16 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86, rotate: 12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <Tooltip label="ナビゲーションを開く" placement="left" hasArrow>
              <IconButton
                aria-label="ナビゲーションを開く"
                icon={<FiSettings />}
                size="lg"
                color={lightText}
                bg={lightPanelBg}
                borderWidth="1px"
                borderColor={lightBorderStrong}
                borderRadius="2px"
                boxShadow="0 14px 34px rgba(22, 94, 131, 0.14), 0 0 0 5px rgba(22, 94, 131, 0.10)"
                backdropFilter="blur(14px)"
                _hover={{ bg: '#fbfdfe', transform: 'translateY(-1px)' }}
                sx={
                  shouldReduceMotion
                    ? undefined
                    : {
                        animation: 'navPulse 2.8s ease-in-out infinite',
                        '@keyframes navPulse': {
                          '0%, 100%': { boxShadow: '0 14px 34px rgba(22, 94, 131, 0.14), 0 0 0 4px rgba(22, 94, 131, 0.08)' },
                          '50%': { boxShadow: '0 18px 42px rgba(22, 94, 131, 0.18), 0 0 0 7px rgba(22, 94, 131, 0.15)' },
                        },
                      }
                }
                onClick={() => setIsOpen(true)}
              />
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}

export default AuthNavigation;

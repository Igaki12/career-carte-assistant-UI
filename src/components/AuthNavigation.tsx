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
  if (role === 'company-admin') return 'pink';
  if (role === 'consultant') return 'purple';
  return 'teal';
};

const getNavigationItems = (role: DemoAuthRole): NavigationItem[] => {
  if (role === 'admin') {
    return [{ label: '管理コンソール', to: '/admin', pathname: '/admin', icon: <FiShield /> }];
  }
  if (role === 'company-admin') {
    return [{ label: '企業管理者ホーム', to: '/company-admin', pathname: '/company-admin', icon: <FiBriefcase /> }];
  }
  if (role === 'consultant') {
    return [{ label: 'コンサルタント画面', to: '/consultant', pathname: '/consultant', icon: <FiUsers /> }];
  }
  return [
    { label: 'マイページ', to: '/user', pathname: '/user', icon: <FiUser /> },
    { label: 'プロフィール設定', to: '/user/demographics?returnTo=%2Fuser', pathname: '/user/demographics', icon: <FiEdit3 /> },
    { label: '初回面談', to: '/app/initial', pathname: '/app/initial', icon: <FiPlayCircle /> },
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
              bg="rgba(2, 6, 23, 0.86)"
              color="white"
              borderWidth="1px"
              borderColor="whiteAlpha.300"
              borderRadius="0"
              boxShadow="0 26px 70px rgba(2, 6, 23, 0.56)"
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
                bgGradient: 'linear(to-r, transparent, rgba(148, 163, 184, 0.78), rgba(241, 245, 249, 0.86), transparent)',
              }}
              _after={{
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '4px',
                bgGradient: 'linear(to-r, transparent, rgba(71, 85, 105, 0.72), rgba(148, 163, 184, 0.82), transparent)',
              }}
            >
              <Stack spacing={4} p={4} position="relative">
                <Flex justify="space-between" align="flex-start" gap={3}>
                  <Box minW={0}>
                    <Text fontSize="xs" color="whiteAlpha.700" fontWeight="bold">
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
                    color="white"
                    _hover={{ bg: 'whiteAlpha.160' }}
                    onClick={() => setIsOpen(false)}
                  />
                </Flex>

                <Box borderWidth="1px" borderColor="whiteAlpha.200" bg="whiteAlpha.100" p={3}>
                  <Flex justify="space-between" align="center" gap={3} wrap="wrap">
                    <Stack spacing={0} minW={0}>
                      <Text fontSize="xs" color="whiteAlpha.700" fontWeight="bold">
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
                        bg={isActive ? 'whiteAlpha.220' : 'transparent'}
                        color="white"
                        borderWidth="1px"
                        borderColor={isActive ? 'whiteAlpha.400' : 'transparent'}
                        _hover={{ bg: 'whiteAlpha.180', borderColor: 'whiteAlpha.300' }}
                        onClick={() => handleNavigate(item.to)}
                      >
                        {item.label}
                      </Button>
                    );
                  })}
                </Stack>

                <Button
                  leftIcon={<FiLogOut />}
                  color="white"
                  bg="rgba(127, 29, 29, 0.58)"
                  borderWidth="1px"
                  borderColor="red.300"
                  _hover={{ bg: 'rgba(153, 27, 27, 0.72)' }}
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
                color="white"
                bg="rgba(2, 6, 23, 0.86)"
                borderWidth="1px"
                borderColor="whiteAlpha.400"
                borderRadius="2px"
                boxShadow="0 16px 42px rgba(2, 6, 23, 0.44), 0 0 0 5px rgba(148, 163, 184, 0.1)"
                backdropFilter="blur(14px)"
                _hover={{ bg: 'rgba(15, 23, 42, 0.94)', transform: 'translateY(-1px)' }}
                sx={
                  shouldReduceMotion
                    ? undefined
                    : {
                        animation: 'navPulse 2.8s ease-in-out infinite',
                        '@keyframes navPulse': {
                          '0%, 100%': { boxShadow: '0 16px 42px rgba(2, 6, 23, 0.44), 0 0 0 4px rgba(148, 163, 184, 0.08)' },
                          '50%': { boxShadow: '0 20px 50px rgba(2, 6, 23, 0.54), 0 0 0 7px rgba(148, 163, 184, 0.15)' },
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

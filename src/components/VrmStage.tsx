import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color, Group, Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMExpressionPresetName, VRMHumanBoneName, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

type ModelProps = {
  isSpeaking: boolean;
  conversationStarted: boolean;
  onReady: () => void;
};

const VrmModel = ({ isSpeaking, conversationStarted, onReady }: ModelProps) => {
  const groupRef = useRef<Group>(null);
  const vrmRef = useRef<VRM | null>(null);
  const headRef = useRef<Object3D | null>(null);
  const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodState = useRef<{ active: boolean; elapsed: number; duration: number }>({
    active: false,
    elapsed: 0,
    duration: 1.2,
  });
  const idleCamera = useMemo(() => new Vector3(0, 1.45, 2.8), []);
  const focusCamera = useMemo(() => new Vector3(0, 1.5, 1.8), []);
  const { camera } = useThree();

  const triggerNod = () => {
    nodState.current = { active: true, elapsed: 0, duration: 1.2 };
  };

  useEffect(() => {
    let disposed = false;
    const loader = new GLTFLoader();
    loader.crossOrigin = 'anonymous';
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader
      .loadAsync('/models/sample.vrm')
      .then((gltf) => {
        if (disposed) return;
        const vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) {
          console.error('VRM instance not found on glTF userData.');
          return;
        }
        VRMUtils.removeUnnecessaryVertices(vrm.scene);
        VRMUtils.removeUnnecessaryJoints(vrm.scene);
        vrm.scene.name = 'CounselorVRM';
        vrm.scene.traverse((obj) => {
          obj.castShadow = true;
          obj.receiveShadow = true;
        });
        const leftUpper = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm);
        const rightUpper = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm);
        const leftLower = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm);
        const rightLower = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm);
        if (leftUpper) leftUpper.rotation.set(-0.3, 0.1, -0.2);
        if (rightUpper) rightUpper.rotation.set(-0.3, -0.1, 0.2);
        if (leftLower) leftLower.rotation.set(-0.1, 0, -0.05);
        if (rightLower) rightLower.rotation.set(-0.1, 0, 0.05);
        headRef.current = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Head) || null;
        vrm.expressionManager?.setValue(VRMExpressionPresetName.Relaxed, 0.6);
        vrm.expressionManager?.setValue(VRMExpressionPresetName.Surprised, 0);
        vrm.scene.position.set(0, -1.4, 0);
        groupRef.current?.add(vrm.scene);
        vrmRef.current = vrm;
        if (!blinkIntervalRef.current) {
          blinkIntervalRef.current = setInterval(() => {
            const manager = vrmRef.current?.expressionManager;
            if (!manager) return;
            manager.setValue(VRMExpressionPresetName.Blink, 1);
            if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
            blinkTimeoutRef.current = setTimeout(
              () => manager.setValue(VRMExpressionPresetName.Blink, 0),
              150,
            );
          }, 3000);
        }
        onReady();
      })
      .catch((error) => console.error('VRM load failed', error));

    const nodInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        triggerNod();
      }
    }, 5000);

    return () => {
      disposed = true;
      clearInterval(nodInterval);
       if (blinkIntervalRef.current) {
         clearInterval(blinkIntervalRef.current);
         blinkIntervalRef.current = null;
       }
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
        blinkTimeoutRef.current = null;
      }
      if (vrmRef.current) {
        vrmRef.current.scene.removeFromParent();
        vrmRef.current = null;
      }
    };
  }, [onReady]);

  useEffect(() => {
    if (!isSpeaking) {
      vrmRef.current?.expressionManager?.setValue(VRMExpressionPresetName.Surprised, 0);
      return;
    }
    const interval = setInterval(() => {
      const value = 0.05 + Math.random() * 0.25;
      vrmRef.current?.expressionManager?.setValue(VRMExpressionPresetName.Surprised, value);
    }, 350);
    return () => {
      clearInterval(interval);
      vrmRef.current?.expressionManager?.setValue(VRMExpressionPresetName.Surprised, 0);
    };
  }, [isSpeaking]);

  useFrame((_, delta) => {
    const desired = conversationStarted ? focusCamera : idleCamera;
    const factor = 1 - Math.exp(-delta * 3);
    camera.position.lerp(desired, factor);
    camera.lookAt(0, 1.35, 0);

    if (vrmRef.current) {
      vrmRef.current.update(delta);
    }

    if (headRef.current) {
      if (nodState.current.active) {
        nodState.current.elapsed += delta;
        const half = nodState.current.duration / 2;
        if (nodState.current.elapsed >= nodState.current.duration) {
          nodState.current.active = false;
          headRef.current.rotation.x = 0;
        } else if (nodState.current.elapsed < half) {
          headRef.current.rotation.x = -0.1 * (nodState.current.elapsed / half);
        } else {
          headRef.current.rotation.x = -0.1 * (1 - (nodState.current.elapsed - half) / half);
        }
      } else {
        headRef.current.rotation.x *= 0.92;
      }
    }
  });

  return <group ref={groupRef} />;
};

type StageProps = {
  isSpeaking: boolean;
  conversationStarted: boolean;
};

const VrmStage = ({ isSpeaking, conversationStarted }: StageProps) => {
  const [isReady, setIsReady] = useState(false);

  return (
    <Box
      bg="white"
      borderRadius="2xl"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="lg"
      overflow="hidden"
      position="relative"
      w="full"
      h={{ base: '360px', md: '420px' }}
    >
      {!isReady && (
        <Box
          position="absolute"
          inset={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={1}
          bgGradient="linear(to-b, rgba(15,23,42,0.85), rgba(30,41,59,0.85))"
        >
          <Text color="white" fontSize="sm">
            VRMモデルを読み込み中...
          </Text>
        </Box>
      )}
      <Canvas camera={{ position: [0, 1.45, 2.8], fov: 25 }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 2]} intensity={1.2} color={new Color('#f8fafc')} />
        <spotLight position={[-2, 4, 3]} intensity={0.4} />
        <Suspense fallback={null}>
          <VrmModel
            isSpeaking={isSpeaking}
            conversationStarted={conversationStarted}
            onReady={() => setIsReady(true)}
          />
        </Suspense>
      </Canvas>
    </Box>
  );
};

export default VrmStage;

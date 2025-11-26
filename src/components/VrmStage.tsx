import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import {
  AmbientLight,
  Clock,
  Color,
  DirectionalLight,
  Euler,
  MathUtils,
  Material,
  Mesh,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  VRM,
  VRMExpressionPresetName,
  VRMHumanBoneName,
  VRMLoaderPlugin,
  VRMUtils,
} from '@pixiv/three-vrm';

const MODEL_PATH = `${import.meta.env.BASE_URL}models/sample.vrm`;

type StageProps = {
  isSpeaking: boolean;
  conversationStarted: boolean;
};

type BlinkState = {
  lastBlink: number;
  blinkStart: number;
  blinking: boolean;
};

type NodState = {
  lastUpdate: number;
  elapsed: number;
  nextChange: number;
  target: number;
  current: number;
};

const VrmStage = ({ isSpeaking, conversationStarted }: StageProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const poseAnimationRef = useRef<number | null>(null);
  const blinkStateRef = useRef<BlinkState>({ lastBlink: 0, blinkStart: 0, blinking: false });
  const nodStateRef = useRef<NodState>({
    lastUpdate: 0,
    elapsed: 0,
    nextChange: 0,
    target: 0,
    current: 0,
  });
  const baseNeckRotationRef = useRef<Euler | null>(null);
  const [isReady, setIsReady] = useState(false);

  // isSpeakingの変更でupdateIdleMotionが再生成され、メインのuseEffectが走ってモデルがリロードされるのを防ぐためRefで管理
  const isSpeakingRef = useRef(isSpeaking);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const setIdleExpression = useCallback(() => {
    const manager = vrmRef.current?.expressionManager;
    if (!manager) return;
    manager.setValue(VRMExpressionPresetName.Relaxed, 0.6);
    manager.setValue(VRMExpressionPresetName.Surprised, 0);
    manager.setValue(VRMExpressionPresetName.Blink, 0);
    manager.update();
  }, []);

  const resetIdleMotionState = useCallback(() => {
    const now = performance.now();
    blinkStateRef.current = { lastBlink: now, blinkStart: 0, blinking: false };
    nodStateRef.current = {
      lastUpdate: now,
      elapsed: 0,
      nextChange: 3 + Math.random() * 1.5,
      target: 0,
      current: 0,
    };
  }, []);

  const applyFrontPose = useCallback(() => {
    const vrm = vrmRef.current;
    if (!vrm) return;

    if (poseAnimationRef.current !== null) {
      cancelAnimationFrame(poseAnimationRef.current);
      poseAnimationRef.current = null;
    }

    const humanoid = vrm.humanoid;
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    vrm.scene.rotation.y = 0;

    if (humanoid) {
      const setBoneEuler = (bone: VRMHumanBoneName, rotation: { x?: number; y?: number; z?: number }) => {
        const node = humanoid.getNormalizedBoneNode(bone);
        if (node) {
          node.rotation.set(
            rotation.x ?? node.rotation.x,
            rotation.y ?? node.rotation.y,
            rotation.z ?? node.rotation.z,
          );
        }
      };
      setBoneEuler(VRMHumanBoneName.LeftUpperArm, {
        x: MathUtils.degToRad(-12),
        y: MathUtils.degToRad(10),
        z: MathUtils.degToRad(-75),
      });
      setBoneEuler(VRMHumanBoneName.LeftLowerArm, {
        x: MathUtils.degToRad(-5),
        y: MathUtils.degToRad(8),
        z: MathUtils.degToRad(-5),
      });
      setBoneEuler(VRMHumanBoneName.RightUpperArm, {
        x: MathUtils.degToRad(-12),
        y: MathUtils.degToRad(-10),
        z: MathUtils.degToRad(75),
      });
      setBoneEuler(VRMHumanBoneName.RightLowerArm, {
        x: MathUtils.degToRad(-5),
        y: MathUtils.degToRad(-8),
        z: MathUtils.degToRad(5),
      });
      const neck = humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);
      if (neck) {
        neck.rotation.set(MathUtils.degToRad(-5), 0, 0);
        baseNeckRotationRef.current = neck.rotation.clone();
      }
      humanoid.update();
    }

    if (!camera) return;

    const targetCameraPos = new Vector3(0, 1.45, 1.2);
    const targetLookAt = new Vector3(0, 1.45, 0);
    const startCameraPos = camera.position.clone();
    const startTime = performance.now();
    const duration = 850;
    const startTarget = controls ? controls.target.clone() : targetLookAt.clone();
    const tempTarget = new Vector3();

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      const eased = ease(ratio);
      camera.position.lerpVectors(startCameraPos, targetCameraPos, eased);
      if (controls) {
        tempTarget.copy(startTarget).lerp(targetLookAt, eased);
        controls.target.copy(tempTarget);
        controls.update();
      } else {
        camera.lookAt(targetLookAt);
      }
      if (ratio < 1) {
        poseAnimationRef.current = requestAnimationFrame(animate);
      } else {
        camera.position.copy(targetCameraPos);
        if (controls) {
          controls.target.copy(targetLookAt);
          controls.update();
        } else {
          camera.lookAt(targetLookAt);
        }
        poseAnimationRef.current = null;
      }
    };

    poseAnimationRef.current = requestAnimationFrame(animate);
  }, []);

  const updateIdleMotion = useCallback(
    (timestamp: number) => {
      const vrm = vrmRef.current;
      if (!vrm) return;

      const humanoid = vrm.humanoid;
      if (humanoid && baseNeckRotationRef.current) {
        const neck = humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);
        if (neck) {
          const nodState = nodStateRef.current;
          const deltaSeconds = nodState.lastUpdate ? (timestamp - nodState.lastUpdate) / 1000 : 0;
          nodState.lastUpdate = timestamp;
          nodState.elapsed += deltaSeconds;
          const smoothing = Math.min(deltaSeconds * 5, 1);
          nodState.current += (nodState.target - nodState.current) * smoothing;
          if (nodState.elapsed >= nodState.nextChange) {
            nodState.elapsed = 0;
            nodState.nextChange = 3 + Math.random() * 1.5;
            const direction = Math.random() > 0.5 ? 1 : -1;
            const magnitude = MathUtils.degToRad(0.7 + Math.random());
            nodState.target = direction * magnitude;
          }
          const baseRotation = baseNeckRotationRef.current;
          neck.rotation.set(baseRotation.x + nodState.current, baseRotation.y, baseRotation.z);
          humanoid.update();
        }
      }

      const manager = vrm.expressionManager;
      if (manager) {
        const blinkState = blinkStateRef.current;
        if (!blinkState.blinking && timestamp - blinkState.lastBlink >= 3000) {
          blinkState.blinking = true;
          blinkState.blinkStart = timestamp;
        }
        let blinkWeight = 0;
        if (blinkState.blinking) {
          const duration = 160;
          const progress = Math.min((timestamp - blinkState.blinkStart) / duration, 1);
          blinkWeight = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
          if (progress >= 1) {
            blinkState.blinking = false;
            blinkState.lastBlink = timestamp;
            blinkWeight = 0;
          }
        }
        manager.setValue(VRMExpressionPresetName.Blink, blinkWeight);
        if (!isSpeakingRef.current) {
          manager.setValue(VRMExpressionPresetName.Relaxed, 0.6);
        }
        manager.update();
      }
    },
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new Scene();
    scene.background = new Color('#0f172a');

    const camera = new PerspectiveCamera(25, container.clientWidth / container.clientHeight, 0.1, 50);
    camera.position.set(0, 1.45, 2.8);
    cameraRef.current = camera;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableRotate = false;
    controls.target.set(0, 1.4, 0);
    controls.update();
    controlsRef.current = controls;

    const ambient = new AmbientLight(0xffffff, 0.7);
    const keyLight = new DirectionalLight(0xf8fafc, 1.2);
    keyLight.position.set(3, 5, 2);
    const fillLight = new DirectionalLight(0xbcd4ff, 0.4);
    fillLight.position.set(-2, 4, 3);
    scene.add(ambient);
    scene.add(keyLight);
    scene.add(fillLight);

    const loader = new GLTFLoader();
    loader.setCrossOrigin('anonymous');
    loader.register((parser) => new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true }));

    loader.load(
      MODEL_PATH,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) {
          console.error('VRM instance not found on glTF userData.');
          return;
        }
        VRMUtils.removeUnnecessaryVertices(vrm.scene);
        VRMUtils.combineSkeletons(vrm.scene);
        vrm.scene.rotation.y = Math.PI;
        scene.add(vrm.scene);
        vrmRef.current = vrm;
        if (vrm.humanoid) {
          const neck = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);
          if (neck) {
            baseNeckRotationRef.current = neck.rotation.clone();
          }
        }
        resetIdleMotionState();
        setIdleExpression();
        setIsReady(true);
        applyFrontPose();
      },
      undefined,
      (error) => {
        console.error('VRM load failed', error);
      },
    );

    const clock = new Clock();
    const renderLoop = (timestamp: number) => {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
      controls.update();
      const delta = clock.getDelta();
      if (vrmRef.current) {
        updateIdleMotion(timestamp);
        vrmRef.current.update(delta);
      }
      renderer.render(scene, camera);
    };
    animationFrameRef.current = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current || !containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      cameraRef.current.aspect = clientWidth / Math.max(clientHeight, 1);
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(clientWidth, clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (poseAnimationRef.current !== null) {
        cancelAnimationFrame(poseAnimationRef.current);
        poseAnimationRef.current = null;
      }
      controls.dispose();
      const disposeMaterial = (material: Material) => {
        if ('map' in material && material.map) {
          const map = material.map as { dispose?: () => void };
          map.dispose?.();
        }
        material.dispose();
      };
      scene.traverse((object) => {
        if ('isMesh' in object && object.isMesh) {
          const mesh = object as Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => disposeMaterial(material));
          } else {
            disposeMaterial(mesh.material);
          }
        }
      });
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.domElement.remove();
      }
      vrmRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      cameraRef.current = null;
    };
  }, [applyFrontPose, resetIdleMotionState, setIdleExpression, updateIdleMotion]);

  useEffect(() => {
    if (!conversationStarted || !isReady) return;
    applyFrontPose();
    setIdleExpression();
  }, [conversationStarted, isReady, applyFrontPose, setIdleExpression]);

  useEffect(() => {
    if (!isSpeaking) {
      const manager = vrmRef.current?.expressionManager;
      if (manager) {
        manager.setValue(VRMExpressionPresetName.Surprised, 0);
        manager.setValue(VRMExpressionPresetName.Relaxed, 0.6);
        manager.update();
      }
      return;
    }
    const interval = setInterval(() => {
      const manager = vrmRef.current?.expressionManager;
      if (!manager) return;
      manager.setValue(VRMExpressionPresetName.Surprised, 0.05 + Math.random() * 0.25);
      manager.update();
    }, 350);
    return () => {
      clearInterval(interval);
      const manager = vrmRef.current?.expressionManager;
      if (manager) {
        manager.setValue(VRMExpressionPresetName.Surprised, 0);
        manager.setValue(VRMExpressionPresetName.Relaxed, 0.6);
        manager.update();
      }
    };
  }, [isSpeaking]);

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
      <Box ref={containerRef} position="absolute" inset={0} />
    </Box>
  );
};

export default VrmStage;

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Text } from '@chakra-ui/react';
import { RepeatIcon, ViewIcon } from '@chakra-ui/icons';
import {
  AmbientLight,
  Clock,
  DirectionalLight,
  Euler,
  MathUtils,
  Material,
  Mesh,
  Object3D,
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

const STAGE_MODELS = [
  {
    id: 'sample',
    label: 'Sample Model',
    path: `${import.meta.env.BASE_URL}models/sample.vrm`,
  },
  {
    id: 'counsel1',
    label: 'Counsel 1',
    path: `${import.meta.env.BASE_URL}models/counsel1.vrm`,
  },
] as const;

const STAGE_BACKGROUNDS = [
  {
    id: 'relax-room',
    label: 'Relax Room',
    image: `${import.meta.env.BASE_URL}vrm-bg/restroom.jpg`,
  },
  {
    id: 'cafe-room',
    label: 'Cafe Room',
    image: `${import.meta.env.BASE_URL}vrm-bg/cafe-room.jpg`,
  },
  {
    id: 'plantation-room',
    label: 'Plantation Room',
    image: `${import.meta.env.BASE_URL}vrm-bg/plantation-room.jpg`,
  },
] as const;

type StageProps = {
  isSpeaking: boolean;
  conversationStarted: boolean;
  progress: number;
  showProgress?: boolean;
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

type MorphTargetBinding = {
  mesh: Mesh;
  index: number;
};

type DirectMorphTargetMap = {
  mouthOpen: MorphTargetBinding[];
  blinkLeft: MorphTargetBinding[];
  blinkRight: MorphTargetBinding[];
};

type ExpressionSupport = {
  relaxed: boolean;
  surprised: boolean;
  blink: boolean;
  blinkLeft: boolean;
  blinkRight: boolean;
};

type BoneRotation = {
  x?: number;
  y?: number;
  z?: number;
};

type StagePose = {
  armRotations: Partial<Record<VRMHumanBoneName, BoneRotation>>;
  headTiltDeg: number;
  cameraPosition: {
    x: number;
    y: number;
    z: number;
  };
  lookAt: {
    x: number;
    y: number;
    z: number;
  };
};

const STAGE_MODEL_POSES: Record<(typeof STAGE_MODELS)[number]['id'], StagePose> = {
  sample: {
    armRotations: {
      [VRMHumanBoneName.LeftUpperArm]: { x: -12, y: 10, z: -75 },
      [VRMHumanBoneName.LeftLowerArm]: { x: -5, y: 8, z: -5 },
      [VRMHumanBoneName.RightUpperArm]: { x: -12, y: -10, z: 75 },
      [VRMHumanBoneName.RightLowerArm]: { x: -5, y: -8, z: 5 },
    },
    headTiltDeg: -5,
    cameraPosition: { x: 0, y: 1.45, z: 1.2 },
    lookAt: { x: 0, y: 1.45, z: 0 },
  },
  counsel1: {
    armRotations: {
      [VRMHumanBoneName.LeftUpperArm]: { x: 10, y: 3, z: -24 },
      [VRMHumanBoneName.LeftLowerArm]: { x: -6, y: 1, z: -4 },
      [VRMHumanBoneName.RightUpperArm]: { x: 10, y: -3, z: 24 },
      [VRMHumanBoneName.RightLowerArm]: { x: -6, y: -1, z: 4 },
    },
    headTiltDeg: -5,
    cameraPosition: { x: 0, y: 1.58, z: 2.25 },
    lookAt: { x: 0, y: 1.34, z: 0 },
  },
};

const VrmStage = ({ isSpeaking, conversationStarted, progress, showProgress = true }: StageProps) => {
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
  const motionBoneRef = useRef<Object3D | null>(null);
  const baseMotionRotationRef = useRef<Euler | null>(null);
  const directMorphTargetsRef = useRef<DirectMorphTargetMap>({
    mouthOpen: [],
    blinkLeft: [],
    blinkRight: [],
  });
  const expressionSupportRef = useRef<ExpressionSupport>({
    relaxed: false,
    surprised: false,
    blink: false,
    blinkLeft: false,
    blinkRight: false,
  });
  const [isReady, setIsReady] = useState(false);
  const [modelIndex, setModelIndex] = useState(0);
  const [backgroundIndex, setBackgroundIndex] = useState(0);

  // isSpeakingの変更でupdateIdleMotionが再生成され、メインのuseEffectが走ってモデルがリロードされるのを防ぐためRefで管理
  const isSpeakingRef = useRef(isSpeaking);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const currentModel = STAGE_MODELS[modelIndex];
  const currentBackground = STAGE_BACKGROUNDS[backgroundIndex];
  const handleNextModel = useCallback(() => {
    setModelIndex((prev) => (prev + 1) % STAGE_MODELS.length);
  }, []);
  const handleNextBackground = useCallback(() => {
    setBackgroundIndex((prev) => (prev + 1) % STAGE_BACKGROUNDS.length);
  }, []);

  const setDirectMorphWeight = useCallback((bindings: MorphTargetBinding[], weight: number) => {
    const clamped = MathUtils.clamp(weight, 0, 1);
    bindings.forEach(({ mesh, index }) => {
      if (!mesh.morphTargetInfluences || mesh.morphTargetInfluences[index] == null) return;
      mesh.morphTargetInfluences[index] = clamped;
    });
  }, []);

  const collectDirectMorphTargets = useCallback((root: Object3D): DirectMorphTargetMap => {
    const morphTargets: DirectMorphTargetMap = {
      mouthOpen: [],
      blinkLeft: [],
      blinkRight: [],
    };

    const register = (
      dictionary: Record<string, number>,
      mesh: Mesh,
      targetName: string,
      bindings: MorphTargetBinding[],
    ) => {
      const index = dictionary[targetName];
      if (index == null) return;
      bindings.push({ mesh, index });
    };

    root.traverse((object) => {
      if (!('isMesh' in object) || !object.isMesh) return;

      const mesh = object as Mesh;
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

      register(mesh.morphTargetDictionary, mesh, 'V_Open', morphTargets.mouthOpen);
      register(mesh.morphTargetDictionary, mesh, 'Eye_Blink_L', morphTargets.blinkLeft);
      register(mesh.morphTargetDictionary, mesh, 'Eye_Blink_R', morphTargets.blinkRight);
    });

    return morphTargets;
  }, []);

  const getMotionBone = useCallback((vrm: VRM | null) => {
    const humanoid = vrm?.humanoid;
    if (!humanoid) return null;
    return humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck)
      ?? humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
  }, []);

  const applyFacialState = useCallback(
    ({
      blinkWeight,
      relaxedWeight,
      surprisedWeight,
    }: {
      blinkWeight?: number;
      relaxedWeight?: number;
      surprisedWeight?: number;
    }) => {
      const manager = vrmRef.current?.expressionManager;
      const support = expressionSupportRef.current;
      let shouldUpdateManager = false;

      if (relaxedWeight != null && manager && support.relaxed) {
        manager.setValue(VRMExpressionPresetName.Relaxed, relaxedWeight);
        shouldUpdateManager = true;
      }

      if (surprisedWeight != null) {
        if (manager && support.surprised) {
          manager.setValue(VRMExpressionPresetName.Surprised, surprisedWeight);
          shouldUpdateManager = true;
        } else {
          setDirectMorphWeight(directMorphTargetsRef.current.mouthOpen, surprisedWeight);
        }
      }

      if (blinkWeight != null) {
        const hasManagedBlink = support.blink || support.blinkLeft || support.blinkRight;
        if (manager) {
          if (support.blink) {
            manager.setValue(VRMExpressionPresetName.Blink, blinkWeight);
            shouldUpdateManager = true;
          } else {
            if (support.blinkLeft) {
              manager.setValue(VRMExpressionPresetName.BlinkLeft, blinkWeight);
              shouldUpdateManager = true;
            }
            if (support.blinkRight) {
              manager.setValue(VRMExpressionPresetName.BlinkRight, blinkWeight);
              shouldUpdateManager = true;
            }
          }
        }

        if (!hasManagedBlink) {
          setDirectMorphWeight(directMorphTargetsRef.current.blinkLeft, blinkWeight);
          setDirectMorphWeight(directMorphTargetsRef.current.blinkRight, blinkWeight);
        }
      }

      if (shouldUpdateManager) {
        manager?.update();
      }
    },
    [setDirectMorphWeight],
  );

  const setIdleExpression = useCallback(() => {
    applyFacialState({
      relaxedWeight: 0.6,
      surprisedWeight: 0,
      blinkWeight: 0,
    });
  }, [applyFacialState]);

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
    const stagePose = STAGE_MODEL_POSES[currentModel.id];
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
      Object.entries(stagePose.armRotations).forEach(([boneName, rotation]) => {
        setBoneEuler(boneName as VRMHumanBoneName, {
          x: rotation.x == null ? undefined : MathUtils.degToRad(rotation.x),
          y: rotation.y == null ? undefined : MathUtils.degToRad(rotation.y),
          z: rotation.z == null ? undefined : MathUtils.degToRad(rotation.z),
        });
      });
      const motionBone = getMotionBone(vrm);
      motionBoneRef.current = motionBone;
      if (motionBone) {
        motionBone.rotation.set(MathUtils.degToRad(stagePose.headTiltDeg), 0, 0);
        baseMotionRotationRef.current = motionBone.rotation.clone();
      }
      humanoid.update();
    }

    if (!camera) return;

    const targetCameraPos = new Vector3(
      stagePose.cameraPosition.x,
      stagePose.cameraPosition.y,
      stagePose.cameraPosition.z,
    );
    const targetLookAt = new Vector3(stagePose.lookAt.x, stagePose.lookAt.y, stagePose.lookAt.z);
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
  }, [currentModel.id, getMotionBone]);

  const updateIdleMotion = useCallback(
    (timestamp: number) => {
      const vrm = vrmRef.current;
      if (!vrm) return;

      const humanoid = vrm.humanoid;
      const motionBone = motionBoneRef.current ?? getMotionBone(vrm);
      if (humanoid && motionBone && baseMotionRotationRef.current) {
        motionBoneRef.current = motionBone;
        if (motionBone) {
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
          const baseRotation = baseMotionRotationRef.current;
          motionBone.rotation.set(baseRotation.x + nodState.current, baseRotation.y, baseRotation.z);
          humanoid.update();
        }
      }

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

      applyFacialState({
        blinkWeight,
        relaxedWeight: isSpeakingRef.current ? undefined : 0.6,
      });
    },
    [applyFacialState, getMotionBone],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setIsReady(false);
    motionBoneRef.current = null;
    baseMotionRotationRef.current = null;
    directMorphTargetsRef.current = {
      mouthOpen: [],
      blinkLeft: [],
      blinkRight: [],
    };
    expressionSupportRef.current = {
      relaxed: false,
      surprised: false,
      blink: false,
      blinkLeft: false,
      blinkRight: false,
    };

    const scene = new Scene();
    scene.background = null;

    const camera = new PerspectiveCamera(25, container.clientWidth / container.clientHeight, 0.1, 50);
    camera.position.set(0, 1.45, 2.8);
    cameraRef.current = camera;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.background = 'transparent';
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
      currentModel.path,
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
        motionBoneRef.current = getMotionBone(vrm);
        baseMotionRotationRef.current = motionBoneRef.current?.rotation.clone() ?? null;
        directMorphTargetsRef.current = collectDirectMorphTargets(vrm.scene);
        expressionSupportRef.current = {
          relaxed: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.Relaxed)?.binds.length ?? 0) > 0,
          surprised: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.Surprised)?.binds.length ?? 0) > 0,
          blink: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.Blink)?.binds.length ?? 0) > 0,
          blinkLeft: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.BlinkLeft)?.binds.length ?? 0) > 0,
          blinkRight: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.BlinkRight)?.binds.length ?? 0) > 0,
        };
        resetIdleMotionState();
        setIdleExpression();
        setIsReady(true);
        applyFrontPose();
      },
      undefined,
      (error) => {
        console.error('VRM load failed', error);
        setIsReady(false);
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
      motionBoneRef.current = null;
      baseMotionRotationRef.current = null;
    };
  }, [
    applyFrontPose,
    collectDirectMorphTargets,
    currentModel.path,
    getMotionBone,
    resetIdleMotionState,
    setIdleExpression,
    updateIdleMotion,
  ]);

  useEffect(() => {
    if (!conversationStarted || !isReady) return;
    applyFrontPose();
    setIdleExpression();
  }, [conversationStarted, isReady, applyFrontPose, setIdleExpression]);

  useEffect(() => {
    if (!isSpeaking) {
      applyFacialState({
        surprisedWeight: 0,
        relaxedWeight: 0.6,
      });
      return;
    }
    const interval = setInterval(() => {
      applyFacialState({
        surprisedWeight: 0.05 + Math.random() * 0.25,
      });
    }, 350);
    return () => {
      clearInterval(interval);
      applyFacialState({
        surprisedWeight: 0,
        relaxedWeight: 0.6,
      });
    };
  }, [applyFacialState, isSpeaking]);

  return (
    <Box
      bg="black"
      bgImage={`url(${currentBackground.image})`}
      bgSize="cover"
      bgRepeat="no-repeat"
      bgPosition="center"
      borderRadius="2xl"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="lg"
      overflow="hidden"
      position="relative"
      w="full"
      h={{ base: '240px', md: '420px' }}
    >
      <IconButton
        aria-label="モデルを切り替え"
        icon={<ViewIcon />}
        size="sm"
        onClick={handleNextModel}
        position="absolute"
        top={3}
        left={3}
        zIndex={2}
        variant="solid"
        colorScheme="whiteAlpha"
        bg="rgba(15,23,42,0.7)"
        _hover={{ bg: 'rgba(30,41,59,0.85)' }}
        _active={{ bg: 'rgba(15,23,42,0.95)' }}
        title={`モデル: ${currentModel.label}`}
      />
      <IconButton
        aria-label="背景を切り替え"
        icon={<RepeatIcon />}
        size="sm"
        onClick={handleNextBackground}
        position="absolute"
        top={3}
        right={3}
        zIndex={2}
        variant="solid"
        colorScheme="whiteAlpha"
        bg="rgba(15,23,42,0.7)"
        _hover={{ bg: 'rgba(30,41,59,0.85)' }}
        _active={{ bg: 'rgba(15,23,42,0.95)' }}
        title={`背景: ${currentBackground.label}`}
      />
      {showProgress && (
        <Box
          position="absolute"
          bottom={3}
          right={3}
          zIndex={3}
          bg="rgba(15,23,42,0.82)"
          borderRadius="xl"
          px={4}
          py={2}
          borderWidth="1px"
          borderColor="whiteAlpha.300"
          color="white"
          pointerEvents="none"
          backdropFilter="blur(4px)"
          boxShadow="md"
        >
          <Text fontSize="xs" color="whiteAlpha.700" letterSpacing="0.08em" textTransform="uppercase">
            カルテ進行度
          </Text>
          <Text fontSize="lg" fontWeight="bold" lineHeight="shorter">
            {progress}% 完成
          </Text>
        </Box>
      )}
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

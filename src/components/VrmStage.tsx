import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Collapse, Flex, Icon, IconButton, Text } from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { FiChevronUp, FiUser } from 'react-icons/fi';
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
    id: 'trial2',
    label: 'Trial 2',
    path: `${import.meta.env.BASE_URL}models/trial_2.vrm`,
  },
  {
    id: 'youngCounsil',
    label: 'Young Counsel',
    path: `${import.meta.env.BASE_URL}models/young_counsil.vrm`,
  },
] as const;

export type StageModelId = (typeof STAGE_MODELS)[number]['id'];

export type SpeechMotionFrame = {
  speaking: boolean;
  rms: number;
  low: number;
  mid: number;
  high: number;
  updatedAt: number;
};

const SILENT_SPEECH_MOTION: SpeechMotionFrame = {
  speaking: false,
  rms: 0,
  low: 0,
  mid: 0,
  high: 0,
  updatedAt: 0,
};

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
  speechMotion?: SpeechMotionFrame;
  conversationStarted: boolean;
  progress: number;
  progressLabel?: string;
  progressCountLabel?: string;
  showProgress?: boolean;
  onModelChange?: (modelId: StageModelId) => void;
};

type BlinkState = {
  lastBlink: number;
  blinkStart: number;
  blinking: boolean;
  nextBlinkDelay: number;
};

type NodState = {
  lastUpdate: number;
  elapsed: number;
  nextChange: number;
  target: number;
  current: number;
};

type GesturePreset = 'rightBeat' | 'openArms' | 'leftLift';

type GestureState = {
  active: boolean;
  preset: GesturePreset;
  startedAt: number;
  duration: number;
  cooldownUntil: number;
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
  happy: boolean;
  relaxed: boolean;
  surprised: boolean;
  aa: boolean;
  ih: boolean;
  ou: boolean;
  ee: boolean;
  oh: boolean;
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
  defaultHappyWeight: number;
  lipSyncExpression: 'surprised' | 'aa';
  lipSyncWeightMultiplier: number;
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

type MouthExpressionKey = 'aa' | 'ih' | 'ou' | 'ee' | 'oh';
type MouthWeightMap = Record<MouthExpressionKey, number>;

const TRACKED_BONES = [
  VRMHumanBoneName.LeftUpperArm,
  VRMHumanBoneName.LeftLowerArm,
  VRMHumanBoneName.RightUpperArm,
  VRMHumanBoneName.RightLowerArm,
  VRMHumanBoneName.UpperChest,
  VRMHumanBoneName.Chest,
  VRMHumanBoneName.Spine,
] as const;

const ZERO_MOUTH_WEIGHTS: MouthWeightMap = {
  aa: 0,
  ih: 0,
  ou: 0,
  ee: 0,
  oh: 0,
};

const ENHANCED_IDLE_RELAXED_WEIGHT = 0.72;
const ENHANCED_SPEAKING_RELAXED_WEIGHT = 0.52;

const STAGE_MODEL_POSES: Record<StageModelId, StagePose> = {
  sample: {
    armRotations: {
      [VRMHumanBoneName.LeftUpperArm]: { x: -12, y: 10, z: -75 },
      [VRMHumanBoneName.LeftLowerArm]: { x: -5, y: 8, z: -5 },
      [VRMHumanBoneName.RightUpperArm]: { x: -12, y: -10, z: 75 },
      [VRMHumanBoneName.RightLowerArm]: { x: -5, y: -8, z: 5 },
    },
    headTiltDeg: -5,
    defaultHappyWeight: 0,
    lipSyncExpression: 'surprised',
    lipSyncWeightMultiplier: 1,
    cameraPosition: { x: 0, y: 1.45, z: 1.2 },
    lookAt: { x: 0, y: 1.45, z: 0 },
  },
  trial2: {
    armRotations: {
      [VRMHumanBoneName.LeftUpperArm]: { x: -12, y: 10, z: -75 },
      [VRMHumanBoneName.LeftLowerArm]: { x: -5, y: 8, z: -5 },
      [VRMHumanBoneName.RightUpperArm]: { x: -12, y: -10, z: 75 },
      [VRMHumanBoneName.RightLowerArm]: { x: -5, y: -8, z: 5 },
    },
    headTiltDeg: 0,
    defaultHappyWeight: 0.42,
    lipSyncExpression: 'aa',
    lipSyncWeightMultiplier: 5.2,
    cameraPosition: { x: 0, y: 1.45, z: 1.5 },
    lookAt: { x: 0, y: 1.45, z: 0 },
  },
  youngCounsil: {
    armRotations: {
      [VRMHumanBoneName.LeftUpperArm]: { x: -12, y: 10, z: -75 },
      [VRMHumanBoneName.LeftLowerArm]: { x: -5, y: 8, z: -5 },
      [VRMHumanBoneName.RightUpperArm]: { x: -12, y: -10, z: 75 },
      [VRMHumanBoneName.RightLowerArm]: { x: -5, y: -8, z: 5 },
    },
    headTiltDeg: 0,
    defaultHappyWeight: 0.42,
    lipSyncExpression: 'aa',
    lipSyncWeightMultiplier: 5.2,
    cameraPosition: { x: 0, y: 1.45, z: 1.5 },
    lookAt: { x: 0, y: 1.55, z: 0 },
  },
};

const createNextBlinkDelay = (modelId: StageModelId) =>
  modelId === 'sample' ? 3000 : 2400 + Math.random() * 2600;

const createNextGestureCooldown = () => 4000 + Math.random() * 5000;

const clamp01 = (value: number) => MathUtils.clamp(value, 0, 1);

const computeEnhancedMouthOpenness = (speechMotion: SpeechMotionFrame, timestamp: number) => {
  const energy = clamp01((speechMotion.rms - 0.02) * 6.9);
  if (!speechMotion.speaking) {
    return energy < 0.06 ? 0 : clamp01(Math.pow(energy, 1.9) * 0.12);
  }

  const pulseA = Math.max(0, Math.sin(timestamp * 0.011));
  const pulseB = Math.max(0, Math.sin(timestamp * 0.0065 + 1.2)) * 0.6;
  const pulse = clamp01(Math.max(pulseA, pulseB));
  const gatedPulse = pulse < 0.18 ? 0 : Math.pow((pulse - 0.18) / 0.82, 0.8);

  return energy < 0.08 ? 0 : clamp01(Math.pow(energy, 0.88) * gatedPulse * 0.9);
};

const buildEnhancedMouthWeights = (speechMotion: SpeechMotionFrame, mouthOpenness: number): MouthWeightMap => {
  if (mouthOpenness <= 0.015 || (!speechMotion.speaking && speechMotion.rms < 0.01)) {
    return ZERO_MOUTH_WEIGHTS;
  }

  const total = speechMotion.low + speechMotion.mid + speechMotion.high;
  const lowRatio = total > 0 ? speechMotion.low / total : 0.34;
  const midRatio = total > 0 ? speechMotion.mid / total : 0.33;
  const highRatio = total > 0 ? speechMotion.high / total : 0.33;
  const openness = clamp01(mouthOpenness);
  const baseWeights: MouthWeightMap = {
    aa: 0.38 + lowRatio * 0.28 + midRatio * 0.06,
    ih: 0.07 + midRatio * 0.14 + highRatio * 0.05,
    ou: 0.06 + lowRatio * 0.08 + highRatio * 0.11,
    ee: 0.08 + highRatio * 0.26,
    oh: 0.18 + lowRatio * 0.20 + midRatio * 0.08,
  };
  const maxWeight = Math.max(
    baseWeights.aa,
    baseWeights.ih,
    baseWeights.ou,
    baseWeights.ee,
    baseWeights.oh,
  ) || 1;
  const contrast = 1.15 + openness * 1.35;

  return {
    aa: clamp01(Math.pow(baseWeights.aa / maxWeight, contrast) * openness * 1.05),
    ih: clamp01(Math.pow(baseWeights.ih / maxWeight, contrast) * openness * 1.05),
    ou: clamp01(Math.pow(baseWeights.ou / maxWeight, contrast) * openness * 1.05),
    ee: clamp01(Math.pow(baseWeights.ee / maxWeight, contrast) * openness * 1.05),
    oh: clamp01(Math.pow(baseWeights.oh / maxWeight, contrast) * openness * 1.05),
  };
};

const easeInOut = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

const VrmStage = ({
  isSpeaking,
  speechMotion = SILENT_SPEECH_MOTION,
  conversationStarted,
  progress,
  progressLabel,
  progressCountLabel,
  showProgress = true,
  onModelChange,
}: StageProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const poseAnimationRef = useRef<number | null>(null);
  const blinkStateRef = useRef<BlinkState>({
    lastBlink: 0,
    blinkStart: 0,
    blinking: false,
    nextBlinkDelay: createNextBlinkDelay('sample'),
  });
  const nodStateRef = useRef<NodState>({
    lastUpdate: 0,
    elapsed: 0,
    nextChange: 0,
    target: 0,
    current: 0,
  });
  const gestureStateRef = useRef<GestureState>({
    active: false,
    preset: 'rightBeat',
    startedAt: 0,
    duration: 0,
    cooldownUntil: 0,
  });
  const motionBoneRef = useRef<Object3D | null>(null);
  const baseMotionRotationRef = useRef<Euler | null>(null);
  const trackedBoneNodesRef = useRef<Partial<Record<(typeof TRACKED_BONES)[number], Object3D>>>({});
  const trackedBoneRotationsRef = useRef<Partial<Record<(typeof TRACKED_BONES)[number], Euler>>>({});
  const lookAtTargetRef = useRef<Object3D | null>(null);
  const directMorphTargetsRef = useRef<DirectMorphTargetMap>({
    mouthOpen: [],
    blinkLeft: [],
    blinkRight: [],
  });
  const expressionSupportRef = useRef<ExpressionSupport>({
    happy: false,
    relaxed: false,
    surprised: false,
    aa: false,
    ih: false,
    ou: false,
    ee: false,
    oh: false,
    blink: false,
    blinkLeft: false,
    blinkRight: false,
  });
  const smoothedSpeechMotionRef = useRef<SpeechMotionFrame>(SILENT_SPEECH_MOTION);
  const [isReady, setIsReady] = useState(false);
  const [modelIndex, setModelIndex] = useState(0);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);

  const isSpeakingRef = useRef(isSpeaking);
  const speechMotionRef = useRef(speechMotion);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    speechMotionRef.current = speechMotion;
  }, [speechMotion]);

  const currentModel = STAGE_MODELS[modelIndex];
  const currentBackground = STAGE_BACKGROUNDS[backgroundIndex];
  const isEnhancedModel = currentModel.id !== 'sample';

  const handleNextModel = useCallback(() => {
    setModelIndex((prev) => (prev + 1) % STAGE_MODELS.length);
  }, []);

  const handleNextBackground = useCallback(() => {
    setBackgroundIndex((prev) => (prev + 1) % STAGE_BACKGROUNDS.length);
  }, []);

  useEffect(() => {
    onModelChange?.(currentModel.id);
  }, [currentModel.id, onModelChange]);

  const setDirectMorphWeight = useCallback((bindings: MorphTargetBinding[], weight: number) => {
    const clamped = clamp01(weight);
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

  const getLipSyncPresetName = useCallback((modelId: StageModelId) => {
    const lipSyncExpression = STAGE_MODEL_POSES[modelId].lipSyncExpression;
    return lipSyncExpression === 'aa'
      ? VRMExpressionPresetName.Aa
      : VRMExpressionPresetName.Surprised;
  }, []);

  const applyFacialState = useCallback(
    ({
      blinkWeight,
      happyWeight,
      relaxedWeight,
      lipSyncWeight,
      mouthWeights,
    }: {
      blinkWeight?: number;
      happyWeight?: number;
      relaxedWeight?: number;
      lipSyncWeight?: number;
      mouthWeights?: MouthWeightMap;
    }) => {
      const manager = vrmRef.current?.expressionManager;
      const support = expressionSupportRef.current;
      const stagePose = STAGE_MODEL_POSES[currentModel.id];
      const lipSyncPresetName = getLipSyncPresetName(currentModel.id);
      let shouldUpdateManager = false;

      if (happyWeight != null && manager && support.happy) {
        manager.setValue(VRMExpressionPresetName.Happy, happyWeight);
        shouldUpdateManager = true;
      }

      if (relaxedWeight != null && manager && support.relaxed) {
        manager.setValue(VRMExpressionPresetName.Relaxed, relaxedWeight);
        shouldUpdateManager = true;
      }

      if (mouthWeights) {
        const weightedMouths = [
          { key: 'aa' as const, preset: VRMExpressionPresetName.Aa, supported: support.aa, weight: mouthWeights.aa },
          { key: 'ih' as const, preset: VRMExpressionPresetName.Ih, supported: support.ih, weight: mouthWeights.ih },
          { key: 'ou' as const, preset: VRMExpressionPresetName.Ou, supported: support.ou, weight: mouthWeights.ou },
          { key: 'ee' as const, preset: VRMExpressionPresetName.Ee, supported: support.ee, weight: mouthWeights.ee },
          { key: 'oh' as const, preset: VRMExpressionPresetName.Oh, supported: support.oh, weight: mouthWeights.oh },
        ];
        let hasManagedMouth = false;

        weightedMouths.forEach(({ preset, supported, weight }) => {
          if (!manager || !supported) return;
          manager.setValue(preset, clamp01(weight * stagePose.lipSyncWeightMultiplier));
          shouldUpdateManager = true;
          hasManagedMouth = true;
        });

        if (hasManagedMouth) {
          setDirectMorphWeight(directMorphTargetsRef.current.mouthOpen, 0);
        } else {
          setDirectMorphWeight(
            directMorphTargetsRef.current.mouthOpen,
            Math.max(mouthWeights.aa, mouthWeights.ih, mouthWeights.ou, mouthWeights.ee, mouthWeights.oh),
          );
        }
      } else if (lipSyncWeight != null) {
        const scaledLipSyncWeight = clamp01(lipSyncWeight * stagePose.lipSyncWeightMultiplier);
        const hasLipSyncExpression = lipSyncPresetName === VRMExpressionPresetName.Aa
          ? support.aa
          : support.surprised;

        if (manager && hasLipSyncExpression) {
          manager.setValue(lipSyncPresetName, scaledLipSyncWeight);
          shouldUpdateManager = true;
          setDirectMorphWeight(directMorphTargetsRef.current.mouthOpen, 0);
        } else {
          setDirectMorphWeight(directMorphTargetsRef.current.mouthOpen, scaledLipSyncWeight);
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
    [currentModel.id, getLipSyncPresetName, setDirectMorphWeight],
  );

  const setIdleExpression = useCallback(() => {
    const stagePose = STAGE_MODEL_POSES[currentModel.id];
    applyFacialState({
      happyWeight: stagePose.defaultHappyWeight,
      relaxedWeight: isEnhancedModel ? ENHANCED_IDLE_RELAXED_WEIGHT : 0.6,
      lipSyncWeight: isEnhancedModel ? undefined : 0,
      mouthWeights: isEnhancedModel ? ZERO_MOUTH_WEIGHTS : undefined,
      blinkWeight: 0,
    });
  }, [applyFacialState, currentModel.id, isEnhancedModel]);

  const resetMotionState = useCallback(() => {
    const now = performance.now();
    blinkStateRef.current = {
      lastBlink: now,
      blinkStart: 0,
      blinking: false,
      nextBlinkDelay: createNextBlinkDelay(currentModel.id),
    };
    nodStateRef.current = {
      lastUpdate: now,
      elapsed: 0,
      nextChange: currentModel.id === 'sample' ? 3 + Math.random() * 1.5 : 2.6 + Math.random() * 1.8,
      target: 0,
      current: 0,
    };
    gestureStateRef.current = {
      active: false,
      preset: 'rightBeat',
      startedAt: 0,
      duration: 0,
      cooldownUntil: now + createNextGestureCooldown(),
    };
    smoothedSpeechMotionRef.current = SILENT_SPEECH_MOTION;
  }, [currentModel.id]);

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
      const trackedNodes: Partial<Record<(typeof TRACKED_BONES)[number], Object3D>> = {};
      const trackedRotations: Partial<Record<(typeof TRACKED_BONES)[number], Euler>> = {};

      const setBoneEuler = (bone: VRMHumanBoneName, rotation: { x?: number; y?: number; z?: number }) => {
        const node = humanoid.getNormalizedBoneNode(bone);
        if (!node) return;
        node.rotation.set(
          rotation.x ?? node.rotation.x,
          rotation.y ?? node.rotation.y,
          rotation.z ?? node.rotation.z,
        );
      };

      Object.entries(stagePose.armRotations).forEach(([boneName, rotation]) => {
        setBoneEuler(boneName as VRMHumanBoneName, {
          x: rotation.x == null ? undefined : MathUtils.degToRad(rotation.x),
          y: rotation.y == null ? undefined : MathUtils.degToRad(rotation.y),
          z: rotation.z == null ? undefined : MathUtils.degToRad(rotation.z),
        });
      });

      TRACKED_BONES.forEach((bone) => {
        const node = humanoid.getNormalizedBoneNode(bone);
        if (!node) return;
        trackedNodes[bone] = node;
        trackedRotations[bone] = node.rotation.clone();
      });
      trackedBoneNodesRef.current = trackedNodes;
      trackedBoneRotationsRef.current = trackedRotations;

      const motionBone = getMotionBone(vrm);
      motionBoneRef.current = motionBone;
      if (motionBone) {
        motionBone.rotation.set(MathUtils.degToRad(stagePose.headTiltDeg), 0, 0);
        baseMotionRotationRef.current = motionBone.rotation.clone();
      }

      const lookAtTarget = lookAtTargetRef.current;
      if (lookAtTarget) {
        lookAtTarget.position.set(stagePose.lookAt.x, stagePose.lookAt.y, stagePose.lookAt.z + 1.35);
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

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
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

  const getBlinkWeight = useCallback((timestamp: number) => {
    const blinkState = blinkStateRef.current;
    if (!blinkState.blinking && timestamp - blinkState.lastBlink >= blinkState.nextBlinkDelay) {
      blinkState.blinking = true;
      blinkState.blinkStart = timestamp;
    }

    let blinkWeight = 0;
    if (blinkState.blinking) {
      const duration = currentModel.id === 'sample' ? 160 : 135;
      const progress = Math.min((timestamp - blinkState.blinkStart) / duration, 1);
      blinkWeight = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      if (progress >= 1) {
        blinkState.blinking = false;
        blinkState.lastBlink = timestamp;
        blinkState.nextBlinkDelay = createNextBlinkDelay(currentModel.id);
        blinkWeight = 0;
      }
    }

    return blinkWeight;
  }, [currentModel.id]);

  const updateStageMotion = useCallback(
    (timestamp: number) => {
      const vrm = vrmRef.current;
      if (!vrm) return;

      const humanoid = vrm.humanoid;
      const motionBone = motionBoneRef.current ?? getMotionBone(vrm);
      const blinkWeight = getBlinkWeight(timestamp);

      if (currentModel.id === 'sample') {
        if (humanoid && motionBone && baseMotionRotationRef.current) {
          motionBoneRef.current = motionBone;
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

        applyFacialState({
          blinkWeight,
          relaxedWeight: isSpeakingRef.current ? undefined : 0.6,
        });
        return;
      }

      const nodState = nodStateRef.current;
      const deltaSeconds = nodState.lastUpdate ? (timestamp - nodState.lastUpdate) / 1000 : 0;
      nodState.lastUpdate = timestamp;

      const incomingSpeech = speechMotionRef.current;
      const smoothedSpeech = smoothedSpeechMotionRef.current;
      const speechSmoothing = Math.min(Math.max(deltaSeconds * 10, 0.08), 1);
      smoothedSpeech.rms += (incomingSpeech.rms - smoothedSpeech.rms) * speechSmoothing;
      smoothedSpeech.low += (incomingSpeech.low - smoothedSpeech.low) * speechSmoothing;
      smoothedSpeech.mid += (incomingSpeech.mid - smoothedSpeech.mid) * speechSmoothing;
      smoothedSpeech.high += (incomingSpeech.high - smoothedSpeech.high) * speechSmoothing;
      smoothedSpeech.speaking = incomingSpeech.speaking;
      smoothedSpeech.updatedAt = incomingSpeech.updatedAt;

      const speakingStrength = clamp01(smoothedSpeech.rms * 4.8) * (incomingSpeech.speaking ? 1 : 0.35);
      const mouthOpenness = computeEnhancedMouthOpenness(smoothedSpeech, timestamp);
      const idleWave = Math.sin(timestamp * 0.0018);
      const speakingWave = Math.sin(timestamp * 0.023);

      if (humanoid && motionBone && baseMotionRotationRef.current) {
        motionBoneRef.current = motionBone;
        const baseRotation = baseMotionRotationRef.current;
        const headPitch = idleWave * 0.018 + speakingStrength * 0.055;
        const headYaw = Math.sin(timestamp * 0.0011) * 0.012 + speakingStrength * speakingWave * 0.015;
        const headRoll = Math.sin(timestamp * 0.0014) * 0.008;
        motionBone.rotation.set(
          baseRotation.x + headPitch,
          baseRotation.y + headYaw,
          baseRotation.z + headRoll,
        );
      }

      const lookAtTarget = lookAtTargetRef.current;
      if (lookAtTarget) {
        const lookAtBase = STAGE_MODEL_POSES[currentModel.id].lookAt;
        const driftScale = incomingSpeech.speaking ? 0.65 : 1;
        lookAtTarget.position.set(
          lookAtBase.x + Math.sin(timestamp * 0.0009) * 0.028 * driftScale,
          lookAtBase.y + 0.02 + Math.sin(timestamp * 0.0012) * 0.014 * driftScale + speakingStrength * 0.008,
          lookAtBase.z + 1.35,
        );
      }

      const gestureState = gestureStateRef.current;
      if (
        !gestureState.active
        && incomingSpeech.speaking
        && speakingStrength > 0.08
        && timestamp >= gestureState.cooldownUntil
      ) {
        const presets: GesturePreset[] = ['rightBeat', 'openArms', 'leftLift'];
        gestureState.active = true;
        gestureState.preset = presets[Math.floor(Math.random() * presets.length)] ?? 'rightBeat';
        gestureState.startedAt = timestamp;
        gestureState.duration = 780 + Math.random() * 620;
      }

      let gestureAmount = 0;
      if (gestureState.active) {
        const progressRatio = Math.min((timestamp - gestureState.startedAt) / gestureState.duration, 1);
        gestureAmount = easeInOut(progressRatio) * Math.sin(progressRatio * Math.PI) * (0.55 + speakingStrength * 0.45);
        if (progressRatio >= 1) {
          gestureState.active = false;
          gestureState.cooldownUntil = timestamp + createNextGestureCooldown();
          gestureAmount = 0;
        }
      }

      const torsoBreath = Math.sin(timestamp * 0.0022) * 0.012;
      const trackedNodes = trackedBoneNodesRef.current;
      const trackedRotations = trackedBoneRotationsRef.current;
      const trackedAdditions: Partial<Record<(typeof TRACKED_BONES)[number], { x: number; y: number; z: number }>> = {
        [VRMHumanBoneName.UpperChest]: {
          x: torsoBreath + speakingStrength * 0.014,
          y: 0,
          z: Math.sin(timestamp * 0.0013) * 0.006,
        },
        [VRMHumanBoneName.Chest]: {
          x: torsoBreath * 0.7,
          y: 0,
          z: Math.sin(timestamp * 0.0011) * 0.004,
        },
        [VRMHumanBoneName.Spine]: {
          x: torsoBreath * 0.4,
          y: 0,
          z: Math.sin(timestamp * 0.0009) * 0.003,
        },
      };

      if (gestureAmount > 0) {
        if (gestureState.preset === 'rightBeat') {
          trackedAdditions[VRMHumanBoneName.RightUpperArm] = {
            x: -0.05 * gestureAmount,
            y: -0.02 * gestureAmount,
            z: -0.18 * gestureAmount,
          };
          trackedAdditions[VRMHumanBoneName.RightLowerArm] = {
            x: 0.12 * gestureAmount,
            y: 0,
            z: -0.10 * gestureAmount,
          };
        } else if (gestureState.preset === 'openArms') {
          trackedAdditions[VRMHumanBoneName.LeftUpperArm] = {
            x: -0.03 * gestureAmount,
            y: 0.04 * gestureAmount,
            z: 0.16 * gestureAmount,
          };
          trackedAdditions[VRMHumanBoneName.RightUpperArm] = {
            x: -0.03 * gestureAmount,
            y: -0.04 * gestureAmount,
            z: -0.16 * gestureAmount,
          };
          trackedAdditions[VRMHumanBoneName.LeftLowerArm] = {
            x: 0.08 * gestureAmount,
            y: 0,
            z: 0.05 * gestureAmount,
          };
          trackedAdditions[VRMHumanBoneName.RightLowerArm] = {
            x: 0.08 * gestureAmount,
            y: 0,
            z: -0.05 * gestureAmount,
          };
        } else {
          trackedAdditions[VRMHumanBoneName.LeftUpperArm] = {
            x: -0.04 * gestureAmount,
            y: 0.03 * gestureAmount,
            z: 0.15 * gestureAmount,
          };
          trackedAdditions[VRMHumanBoneName.LeftLowerArm] = {
            x: 0.10 * gestureAmount,
            y: 0,
            z: 0.08 * gestureAmount,
          };
        }
      }

      TRACKED_BONES.forEach((bone) => {
        const node = trackedNodes[bone];
        const baseRotation = trackedRotations[bone];
        if (!node || !baseRotation) return;
        const addition = trackedAdditions[bone];
        node.rotation.set(
          baseRotation.x + (addition?.x ?? 0),
          baseRotation.y + (addition?.y ?? 0),
          baseRotation.z + (addition?.z ?? 0),
        );
      });

      if (humanoid) {
        humanoid.update();
      }

      applyFacialState({
        blinkWeight,
        happyWeight: STAGE_MODEL_POSES[currentModel.id].defaultHappyWeight,
        relaxedWeight: incomingSpeech.speaking ? ENHANCED_SPEAKING_RELAXED_WEIGHT : ENHANCED_IDLE_RELAXED_WEIGHT,
        mouthWeights: buildEnhancedMouthWeights(smoothedSpeech, mouthOpenness),
      });
    },
    [applyFacialState, currentModel.id, getBlinkWeight, getMotionBone],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let canceled = false;
    queueMicrotask(() => {
      if (!canceled) {
        setIsReady(false);
      }
    });

    motionBoneRef.current = null;
    baseMotionRotationRef.current = null;
    trackedBoneNodesRef.current = {};
    trackedBoneRotationsRef.current = {};
    lookAtTargetRef.current = null;
    directMorphTargetsRef.current = {
      mouthOpen: [],
      blinkLeft: [],
      blinkRight: [],
    };
    expressionSupportRef.current = {
      happy: false,
      relaxed: false,
      surprised: false,
      aa: false,
      ih: false,
      ou: false,
      ee: false,
      oh: false,
      blink: false,
      blinkLeft: false,
      blinkRight: false,
    };

    const scene = new Scene();
    scene.background = null;
    sceneRef.current = scene;

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
          happy: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.Happy)?.binds.length ?? 0) > 0,
          relaxed: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.Relaxed)?.binds.length ?? 0) > 0,
          surprised: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.Surprised)?.binds.length ?? 0) > 0,
          aa: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.Aa)?.binds.length ?? 0) > 0,
          ih: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.Ih)?.binds.length ?? 0) > 0,
          ou: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.Ou)?.binds.length ?? 0) > 0,
          ee: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.Ee)?.binds.length ?? 0) > 0,
          oh: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.Oh)?.binds.length ?? 0) > 0,
          blink: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.Blink)?.binds.length ?? 0) > 0,
          blinkLeft: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.BlinkLeft)?.binds.length ?? 0) > 0,
          blinkRight: (vrm.expressionManager?.getExpression(VRMExpressionPresetName.BlinkRight)?.binds.length ?? 0) > 0,
        };

        const lookAtTarget = new Object3D();
        lookAtTarget.visible = false;
        scene.add(lookAtTarget);
        lookAtTargetRef.current = lookAtTarget;
        if (vrm.lookAt) {
          vrm.lookAt.autoUpdate = isEnhancedModel;
          vrm.lookAt.target = isEnhancedModel ? lookAtTarget : null;
        }

        resetMotionState();
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
        updateStageMotion(timestamp);
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
      canceled = true;
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
      sceneRef.current = null;
      vrmRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      cameraRef.current = null;
      motionBoneRef.current = null;
      baseMotionRotationRef.current = null;
      trackedBoneNodesRef.current = {};
      trackedBoneRotationsRef.current = {};
      lookAtTargetRef.current = null;
    };
  }, [
    applyFrontPose,
    collectDirectMorphTargets,
    currentModel.path,
    getMotionBone,
    isEnhancedModel,
    resetMotionState,
    setIdleExpression,
    updateStageMotion,
  ]);

  useEffect(() => {
    if (!conversationStarted || !isReady) return;
    applyFrontPose();
    setIdleExpression();
  }, [conversationStarted, isReady, applyFrontPose, setIdleExpression]);

  useEffect(() => {
    const stagePose = STAGE_MODEL_POSES[currentModel.id];
    if (currentModel.id !== 'sample') {
      applyFacialState({
        happyWeight: stagePose.defaultHappyWeight,
        mouthWeights: ZERO_MOUTH_WEIGHTS,
        relaxedWeight: isSpeaking ? ENHANCED_SPEAKING_RELAXED_WEIGHT : ENHANCED_IDLE_RELAXED_WEIGHT,
      });
      return;
    }

    if (!isSpeaking) {
      applyFacialState({
        happyWeight: stagePose.defaultHappyWeight,
        lipSyncWeight: 0,
        relaxedWeight: 0.6,
      });
      return;
    }

    const interval = setInterval(() => {
      applyFacialState({
        lipSyncWeight: 0.05 + Math.random() * 0.25,
      });
    }, 350);

    return () => {
      clearInterval(interval);
      applyFacialState({
        happyWeight: stagePose.defaultHappyWeight,
        lipSyncWeight: 0,
        relaxedWeight: 0.6,
      });
    };
  }, [applyFacialState, currentModel.id, isSpeaking]);

  return (
    <Box
      bg="#f7f7f8"
      bgImage={`url(${currentBackground.image})`}
      bgSize="cover"
      bgRepeat="no-repeat"
      bgPosition="center"
      borderRadius="2xl"
      borderWidth="1px"
      borderColor="rgba(22, 94, 131, 0.18)"
      boxShadow="lg"
      overflow="hidden"
      position="relative"
      w="full"
      h={{ base: '240px', md: '420px' }}
    >
      <IconButton
        aria-label="モデルを切り替え"
        icon={<FiUser />}
        size="md"
        onClick={handleNextModel}
        position="absolute"
        top={3}
        left={3}
        zIndex={2}
        minW="48px"
        h="48px"
        mb={0}
        variant="solid"
        colorScheme="cyan"
        color="#12384d"
        bg="rgba(252,252,253,0.84)"
        _hover={{ bg: 'rgba(244,244,245,0.94)' }}
        _active={{ bg: 'rgba(238,238,239,0.94)' }}
        title={`モデル: ${currentModel.label}`}
      />
      <IconButton
        aria-label="背景を切り替え"
        icon={<RepeatIcon />}
        size="md"
        onClick={handleNextBackground}
        position="absolute"
        top="68px"
        left={3}
        zIndex={2}
        minW="48px"
        h="48px"
        mb={0}
        variant="solid"
        colorScheme="cyan"
        color="#12384d"
        bg="rgba(252,252,253,0.84)"
        _hover={{ bg: 'rgba(244,244,245,0.94)' }}
        _active={{ bg: 'rgba(238,238,239,0.94)' }}
        title={`背景: ${currentBackground.label}`}
      />
      {showProgress && (
        <Box
          position="absolute"
          bottom={3}
          right={3}
          zIndex={3}
          bg="rgba(252,252,253,0.84)"
          borderRadius="xl"
          px={4}
          py={2}
          borderWidth="1px"
          borderColor="rgba(22, 94, 131, 0.18)"
          color="#12384d"
          backdropFilter="blur(4px)"
          boxShadow="md"
          cursor="pointer"
          userSelect="none"
          onClick={() => setIsProgressExpanded((prev) => !prev)}
          role="button"
          tabIndex={0}
          aria-expanded={isProgressExpanded}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsProgressExpanded((prev) => !prev);
            }
          }}
        >
          <Flex align="center" justify="space-between" gap={3}>
            <Box>
              <Text fontSize="xs" color="#66889a" letterSpacing="0.08em" textTransform="uppercase">
                カルテ進行度
              </Text>
              <Text fontSize="lg" fontWeight="bold" lineHeight="shorter">
                {progress}% 完成
              </Text>
            </Box>
            <Icon
              as={FiChevronUp}
              boxSize={4}
              color="#3f6678"
              transform={isProgressExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}
              transition="transform 0.2s ease"
              flexShrink={0}
            />
          </Flex>
          <Collapse in={isProgressExpanded} animateOpacity>
            <Box mt={2}>
              {progressCountLabel ? (
                <Text fontSize="xs" color="#3f6678">
                  {progressCountLabel}
                </Text>
              ) : null}
              {progressLabel ? (
                <Text fontSize="xs" color="#3f6678" mt={1} maxW="220px">
                  現在: {progressLabel}
                </Text>
              ) : null}
            </Box>
          </Collapse>
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
          bgGradient="linear(to-b, rgba(252,252,253,0.84), rgba(244,244,245,0.94))"
        >
          <Text color="#315f76" fontSize="sm">
            VRMモデルを読み込み中...
          </Text>
        </Box>
      )}
      <Box ref={containerRef} position="absolute" inset={0} />
    </Box>
  );
};

export default VrmStage;

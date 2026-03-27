@pixiv/three-vrm

three-vrmVRMExpressionManager
Class VRMExpressionManager
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:3
Constructors
C
constructor
Properties
P
blinkExpressionNames
P
lookAtExpressionNames
P
mouthExpressionNames
Accessors
A
customExpressionMap
A
expressionMap
A
expressions
A
presetExpressionMap
Methods
M
clone
M
copy
M
getExpression
M
getExpressionTrackName
M
getValue
M
registerExpression
M
resetValues
M
setValue
M
unregisterExpression
M
update
constructor
new VRMExpressionManager(): VRMExpressionManager
Create a new VRMExpressionManager.

Returns VRMExpressionManager
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:44
blinkExpressionNames
blinkExpressionNames: string[]
A set of name or preset name of expressions that will be overridden by VRMExpression.overrideBlink.

Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:7
lookAtExpressionNames
lookAtExpressionNames: string[]
A set of name or preset name of expressions that will be overridden by VRMExpression.overrideLookAt.

Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:11
mouthExpressionNames
mouthExpressionNames: string[]
A set of name or preset name of expressions that will be overridden by VRMExpression.overrideMouth.

Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:15
customExpressionMap
get customExpressionMap(): { [name: string]: VRMExpression }
A map from name to expression, but excluding preset expressions.

Returns { [name: string]: VRMExpression }
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:38
expressionMap
get expressionMap(): { [name: string]: VRMExpression }
Returns { [name: string]: VRMExpression }
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:26
expressions
get expressions(): VRMExpression[]
Returns VRMExpression[]
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:21
presetExpressionMap
get presetExpressionMap(): {
    aa?: VRMExpression;
    angry?: VRMExpression;
    blink?: VRMExpression;
    blinkLeft?: VRMExpression;
    blinkRight?: VRMExpression;
    ee?: VRMExpression;
    happy?: VRMExpression;
    ih?: VRMExpression;
    lookDown?: VRMExpression;
    lookLeft?: VRMExpression;
    lookRight?: VRMExpression;
    lookUp?: VRMExpression;
    neutral?: VRMExpression;
    oh?: VRMExpression;
    ou?: VRMExpression;
    relaxed?: VRMExpression;
    sad?: VRMExpression;
    surprised?: VRMExpression;
}
A map from name to expression, but excluding custom expressions.

Returns {
    aa?: VRMExpression;
    angry?: VRMExpression;
    blink?: VRMExpression;
    blinkLeft?: VRMExpression;
    blinkRight?: VRMExpression;
    ee?: VRMExpression;
    happy?: VRMExpression;
    ih?: VRMExpression;
    lookDown?: VRMExpression;
    lookLeft?: VRMExpression;
    lookRight?: VRMExpression;
    lookUp?: VRMExpression;
    neutral?: VRMExpression;
    oh?: VRMExpression;
    ou?: VRMExpression;
    relaxed?: VRMExpression;
    sad?: VRMExpression;
    surprised?: VRMExpression;
}
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:32
clone
clone(): VRMExpressionManager
Returns a clone of this VRMExpressionManager.

Returns VRMExpressionManager
Copied VRMExpressionManager

Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:55
copy
copy(source: VRMExpressionManager): this
Copy the given VRMExpressionManager into this one.

Parameters
source: VRMExpressionManager
The VRMExpressionManager you want to copy

Returns this
this

Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:50
getExpression
getExpression(name: string): VRMExpression | null
Return a registered expression. If it cannot find an expression, it will return null instead.

Parameters
name: string
Name or preset name of the expression

Returns VRMExpression | null
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:62
getExpressionTrackName
getExpressionTrackName(name: string): string | null
Get a track name of specified expression. This track name is needed to manipulate its expression via keyframe animations.

Parameters
name: string
Name of the expression

Returns string | null
Example: Manipulate an expression using keyframe animation
const trackName = vrm.expressionManager.getExpressionTrackName( 'blink' );
const track = new THREE.NumberKeyframeTrack(
  name,
  [ 0.0, 0.5, 1.0 ], // times
  [ 0.0, 1.0, 0.0 ] // values
);

const clip = new THREE.AnimationClip(
  'blink', // name
  1.0, // duration
  [ track ] // tracks
);

const mixer = new THREE.AnimationMixer( vrm.scene );
const action = mixer.clipAction( clip );
action.play();
Copy
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:119
getValue
getValue(name: string): number | null
Get the current weight of the specified expression. If it doesn't have an expression of given name, it will return null instead.

Parameters
name: string
Name of the expression

Returns number | null
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:81
registerExpression
registerExpression(expression: VRMExpression): void
Register an expression.

Parameters
expression: VRMExpression
VRMExpression that describes the expression

Returns void
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:68
resetValues
resetValues(): void
Reset weights of all expressions to 0.0.

Returns void
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:92
setValue
setValue(name: string, weight: number): void
Set a weight to the specified expression.

Parameters
name: string
Name of the expression

weight: number
Weight

Returns void
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:88
unregisterExpression
unregisterExpression(expression: VRMExpression): void
Unregister an expression.

Parameters
expression: VRMExpression
The expression you want to unregister

Returns void
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:74
update
update(): void
Update every expressions.

Returns void
Defined in packages/three-vrm-core/types/expressions/VRMExpressionManager.d.ts:123
C
constructor
P
blinkExpressionNames
P
lookAtExpressionNames
P
mouthExpressionNames
A
customExpressionMap
A
expressionMap
A
expressions
A
presetExpressionMap
M
clone
M
copy
M
getExpression
M
getExpressionTrackName
M
getValue
M
registerExpression
M
resetValues
M
setValue
M
unregisterExpression
M
update
@pixiv/three-vrm
migration-guide-1.0
spring-bones-on-scaled-models
MToonMaterial
MToonMaterialLoaderPlugin
VRM
VRMAimConstraint
VRMCore
VRMCoreLoaderPlugin
VRMExpression
VRMExpressionLoaderPlugin
VRMExpressionManager
VRMExpressionMaterialColorBind
VRMExpressionMorphTargetBind
VRMExpressionTextureTransformBind
VRMFirstPerson
VRMFirstPersonLoaderPlugin
VRMHumanoid
VRMHumanoidHelper
VRMHumanoidLoaderPlugin
VRMLoaderPlugin
VRMLookAt
VRMLookAtBoneApplier
VRMLookAtExpressionApplier
VRMLookAtHelper
VRMLookAtLoaderPlugin
VRMLookAtRangeMap
VRMMetaLoaderPlugin
VRMNodeConstraint
VRMNodeConstraintHelper
VRMNodeConstraintLoaderPlugin
VRMNodeConstraintManager
VRMRollConstraint
VRMRotationConstraint
VRMSpringBoneCollider
VRMSpringBoneColliderHelper
VRMSpringBoneColliderShape
VRMSpringBoneColliderShapeCapsule
VRMSpringBoneColliderShapePlane
VRMSpringBoneColliderShapeSphere
VRMSpringBoneJoint
VRMSpringBoneJointHelper
VRMSpringBoneLoaderPlugin
VRMSpringBoneManager
VRMUtils
MToonMaterialLoaderPluginOptions
MToonMaterialParameters
VRM0Meta
VRM1Meta
VRMCoreLoaderPluginOptions
VRMCoreParameters
VRMExpressionBind
VRMFirstPersonMeshAnnotation
VRMHumanBone
VRMHumanoidLoaderPluginOptions
VRMLoaderPluginOptions
VRMLookAtApplier
VRMMetaImporterOptions
VRMParameters
VRMPoseTransform
VRMSpringBoneColliderGroup
VRMSpringBoneJointSettings
MToonMaterialDebugMode
MToonMaterialOutlineWidthMode
VRMExpressionMaterialColorType
VRMExpressionOverrideType
VRMExpressionPresetName
VRMFirstPersonMeshAnnotationType
VRMHumanBoneName
VRMHumanBones
VRMLookAtTypeName
VRMMeta
VRMPose
VRMRequiredHumanBoneName
MToonMaterialDebugMode
MToonMaterialOutlineWidthMode
VRMExpressionMaterialColorType
VRMExpressionOverrideType
VRMExpressionPresetName
VRMFirstPersonMeshAnnotationType
VRMHumanBoneList
VRMHumanBoneName
VRMHumanBoneParentMap
VRMLookAtTypeName
VRMRequiredHumanBoneName
VRMAnimation
VRMAnimationLoaderPlugin
VRMLookAtQuaternionProxy
createVRMAnimationClip
createVRMAnimationExpressionTracks
createVRMAnimationHumanoidTracks
createVRMAnimationLookAtTrack
Generated using TypeDoc
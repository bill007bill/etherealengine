/*
CPAL-1.0 License

The contents of this file are subject to the Common Public Attribution License
Version 1.0. (the "License"); you may not use this file except in compliance
with the License. You may obtain a copy of the License at
https://github.com/EtherealEngine/etherealengine/blob/dev/LICENSE.
The License is based on the Mozilla Public License Version 1.1, but Sections 14
and 15 have been added to cover use of software over a computer network and 
provide for limited attribution for the Original Developer. In addition, 
Exhibit A has been modified to be consistent with Exhibit B.

Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
specific language governing rights and limitations under the License.

The Original Code is Ethereal Engine.

The Original Developer is the Initial Developer. The Initial Developer of the
Original Code is the Ethereal Engine team.

All portions of the code written by the Ethereal Engine team are Copyright © 2021-2023 
Ethereal Engine. All Rights Reserved.
*/

import { Easing, Tween } from '@tweenjs/tween.js'
import { useEffect } from 'react'
import {
  AdditiveBlending,
  Box3,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3
} from 'three'

import { getState } from '@etherealengine/hyperflux'
import { AssetLoader } from '../../assets/classes/AssetLoader'
import { ObjectDirection } from '../../common/constants/Axis3D'
import { EngineState } from '../../ecs/classes/EngineState'
import {
  defineQuery,
  getComponent,
  getOptionalComponent,
  hasComponent,
  removeComponent,
  setComponent
} from '../../ecs/functions/ComponentFunctions'
import { removeEntity } from '../../ecs/functions/EntityFunctions'
import { defineSystem } from '../../ecs/functions/SystemFunctions'
import { NetworkObjectComponent } from '../../networking/components/NetworkObjectComponent'
import { Physics, RaycastArgs } from '../../physics/classes/Physics'
import { AvatarCollisionMask, CollisionGroups } from '../../physics/enums/CollisionGroups'
import { getInteractionGroups } from '../../physics/functions/getInteractionGroups'
import { PhysicsState } from '../../physics/state/PhysicsState'
import { SceneQueryType } from '../../physics/types/PhysicsTypes'
import { GroupComponent, addObjectToGroup } from '../../scene/components/GroupComponent'
import { VisibleComponent } from '../../scene/components/VisibleComponent'
import { setupObject } from '../../scene/systems/SceneObjectSystem'
import { TransformComponent } from '../../transform/components/TransformComponent'
import { TweenComponent } from '../../transform/components/TweenComponent'
import { AvatarControllerComponent } from '.././components/AvatarControllerComponent'
import { AvatarDissolveComponent } from '.././components/AvatarDissolveComponent'
import { AvatarEffectComponent } from '.././components/AvatarEffectComponent'

const lightScale = (y, r) => {
  return Math.min(1, Math.max(1e-3, y / r))
}

const lightOpacity = (y, r) => {
  return Math.min(1, Math.max(0, 1 - (y - r) * 0.5))
}

const downwardGroundRaycast = {
  type: SceneQueryType.Closest,
  origin: new Vector3(),
  direction: ObjectDirection.Down,
  maxDistance: 10,
  groups: getInteractionGroups(CollisionGroups.Avatars, AvatarCollisionMask)
} as RaycastArgs

const effectQuery = defineQuery([AvatarEffectComponent])
const growQuery = defineQuery([AvatarEffectComponent, GroupComponent])
const commonQuery = defineQuery([AvatarEffectComponent, GroupComponent])
const dissolveQuery = defineQuery([AvatarEffectComponent, GroupComponent, AvatarDissolveComponent])

const light = new Mesh(
  new PlaneGeometry(0.04, 3.2),
  new MeshBasicMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide
  })
)

const plate = new Mesh(
  new PlaneGeometry(1.6, 1.6),
  new MeshBasicMaterial({
    transparent: false,
    blending: AdditiveBlending,
    depthWrite: false
  })
)

light.geometry.computeBoundingSphere()
plate.geometry.computeBoundingSphere()
light.name = 'light_obj'
plate.name = 'plate_obj'

const tweenOutEffect = (entity, effectComponent) => {
  setComponent(
    entity,
    TweenComponent,
    new Tween<any>(effectComponent)
      .to(
        {
          opacityMultiplier: 0
        },
        2000
      )
      .start()
      .onComplete(() => {
        const objects = getOptionalComponent(entity, GroupComponent)
        let pillar: Mesh = null!
        let plate: Mesh = null!
        if (objects?.length)
          for (const obj of objects) {
            const childrens = obj.children as Mesh[]
            for (let i = 0; i < childrens.length; i++) {
              if (childrens[i].name === 'pillar_obj') pillar = childrens[i]
              if (childrens[i].name === 'plate_obj') plate = childrens[i]
            }
          }

        if (pillar !== null) {
          pillar.traverse(function (child) {
            if (child['material']) child['material'].dispose()
          })

          pillar.removeFromParent()
        }

        if (plate !== null) {
          plate.traverse(function (child) {
            if (child['material']) child['material'].dispose()
          })

          plate.removeFromParent()
        }

        removeEntity(entity)
      })
  )
}

const execute = () => {
  const delta = getState(EngineState).deltaSeconds

  for (const entity of effectQuery.enter()) {
    const effectComponent = getComponent(entity, AvatarEffectComponent)
    const sourceTransform = getComponent(effectComponent.sourceEntity, TransformComponent)
    setComponent(entity, TransformComponent, {
      position: sourceTransform.position.clone(),
      rotation: sourceTransform.rotation.clone(),
      scale: sourceTransform.scale.clone()
    })
    const transform = getComponent(entity, TransformComponent)
    setComponent(entity, VisibleComponent, true)
    /**
     * cast ray to move this downward to be on the ground
     */
    downwardGroundRaycast.origin.copy(sourceTransform.position)
    const hits = Physics.castRay(getState(PhysicsState).physicsWorld, downwardGroundRaycast)
    if (hits.length) {
      transform.position.y = hits[0].position.y
    }

    const group = new Group()
    group.name = `loading-effect-group-${entity}`

    const pillar = new Object3D()
    pillar.name = 'pillar_obj'
    addObjectToGroup(entity, group)
    group.add(pillar)

    const R = 0.6 * plate.geometry.boundingSphere?.radius!
    for (let i = 0, n = 5 + 10 * R * Math.random(); i < n; i += 1) {
      const ray = light.clone()
      ray.position.y -= 2 * ray.geometry.boundingSphere?.radius! * Math.random()

      const a = (2 * Math.PI * i) / n,
        r = R * Math.random()
      ray.position.x += r * Math.cos(a)
      ray.position.z += r * Math.sin(a)

      ray.rotation.y = Math.random() * 2 * Math.PI
      pillar.add(ray)
    }

    const pt = plate.clone()
    pt.name = 'plate_obj'
    pt.material = (pt.material as any).clone()
    pt.rotation.x = -0.5 * Math.PI
    pt.position.y = 0.01
    group.add(pt)

    setComponent(
      entity,
      TweenComponent,
      new Tween<any>(effectComponent)
        .to(
          {
            opacityMultiplier: 1
          },
          1000
        )
        .easing(Easing.Exponential.Out)
        .start()
        .onComplete(() => {
          removeComponent(entity, TweenComponent)
          const avatarObjects = getComponent(effectComponent.sourceEntity, GroupComponent)
          const bbox = new Box3()
          let scale = 1
          if (avatarObjects?.length) {
            for (const obj of avatarObjects) {
              bbox.expandByObject(obj)
              if (obj.userData?.scale) {
                scale = obj.userData.scale
              }
            }
          }
          if (typeof avatarObjects === 'object' && avatarObjects.length > 0)
            setComponent(entity, AvatarDissolveComponent, {
              minHeight: bbox.min.y / scale,
              maxHeight: bbox.max.y / scale
            })
        })
    )
  }

  for (const entity of growQuery()) {
    TransformComponent.dirtyTransforms[entity] = true
  }

  for (const entity of commonQuery()) {
    const group = getComponent(entity, GroupComponent)
    const opacityMultiplier = getComponent(entity, AvatarEffectComponent).opacityMultiplier

    let pillar: any = null!
    let plate: any = null!

    const childrens = group.map((obj) => obj.children).flat()
    for (let i = 0; i < childrens.length; i++) {
      if (childrens[i].name === 'pillar_obj') pillar = childrens[i]
      if (childrens[i].name === 'plate_obj') plate = childrens[i]
    }

    if (pillar !== null && plate !== null) {
      plate['material'].opacity = opacityMultiplier * (0.7 + 0.5 * Math.sin((Date.now() % 6283) * 5e-3))
      if (pillar !== undefined && plate !== undefined) {
        for (let i = 0, n = pillar.children.length; i < n; i++) {
          const ray = pillar.children[i]
          ray.position.y += 2 * delta
          ray.scale.y = lightScale(ray.position.y, ray['geometry'].boundingSphere.radius)
          ray['material'].opacity = lightOpacity(ray.position.y, ray['geometry'].boundingSphere.radius)

          if (ray['material'].opacity < 1e-3) {
            ray.position.y = plate.position.y
          }
          ray['material'].opacity *= opacityMultiplier
        }
      }
    }
  }

  for (const entity of dissolveQuery.enter()) {
    const effectComponent = getComponent(entity, AvatarEffectComponent)
    if (hasComponent(effectComponent.sourceEntity, AvatarControllerComponent))
      getComponent(effectComponent.sourceEntity, AvatarControllerComponent).movementEnabled = true
  }

  for (const entity of dissolveQuery()) {
    const effectComponent = getComponent(entity, AvatarEffectComponent)
    if (AvatarDissolveComponent.updateDissolveEffect(effectComponent.dissolveMaterials, entity, delta)) {
      removeComponent(entity, AvatarDissolveComponent)
      const avatarGroup = getOptionalComponent(effectComponent.sourceEntity, GroupComponent)
      if (avatarGroup?.length)
        effectComponent.originMaterials.forEach(({ id, material }) => {
          for (const avatarObject of avatarGroup) {
            avatarObject.traverse((obj) => {
              if (obj.uuid === id) {
                obj['material'] = material
              }
            })
            setupObject(avatarObject)
          }
        })

      tweenOutEffect(entity, effectComponent)
    }
  }

  for (const entity of effectQuery()) {
    const effectComponent = getComponent(entity, AvatarEffectComponent)
    const avatar = getComponent(effectComponent.sourceEntity, NetworkObjectComponent)
    if (avatar === undefined) {
      const tween = getComponent(entity, TweenComponent)
      if (tween === undefined) {
        tweenOutEffect(entity, effectComponent)
      }
    }
  }
}

const reactor = () => {
  useEffect(() => {
    AssetLoader.loadAsync('/static/itemLight.png').then((texture) => {
      texture.colorSpace = SRGBColorSpace
      texture.needsUpdate = true
      light.material.map = texture
    })

    AssetLoader.loadAsync('/static/itemPlate.png').then((texture) => {
      texture.colorSpace = SRGBColorSpace
      texture.needsUpdate = true
      plate.material.map = texture
    })
  }, [])
  return null
}

export const AvatarLoadingSystem = defineSystem({
  uuid: 'ee.engine.AvatarLoadingSystem',
  execute,
  reactor
})

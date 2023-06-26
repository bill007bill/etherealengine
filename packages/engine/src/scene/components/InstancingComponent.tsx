import React, { useEffect } from 'react'
import { InstancedBufferAttribute, InstancedMesh } from 'three'

import { defineComponent, useComponent, useOptionalComponent } from '../../ecs/functions/ComponentFunctions'
import { useEntityContext } from '../../ecs/functions/EntityFunctions'
import { getMeshes } from '../util/meshUtils'
import { MeshComponent } from './MeshComponent'
import { ModelComponent } from './ModelComponent'

export const InstancingComponent = defineComponent({
  name: 'EE_instancing',
  jsonID: 'instancing',
  onInit: (entity) => ({
    instanceMatrix: new InstancedBufferAttribute(new Float32Array(16), 16)
  }),
  onSet: (entity, component, json) => {
    if (!json) return
    if (Array.isArray(json.instanceMatrix)) {
      component.instanceMatrix.value.set(json.instanceMatrix)
    }
  },
  toJSON: (entity, component) => ({
    instanceMatrix: component.instanceMatrix.value.array
  }),
  reactor: InstancingReactor
})

function InstancingReactor() {
  const entity = useEntityContext()
  const instancingComponent = useComponent(entity, InstancingComponent)
  const meshComponent = useComponent(entity, MeshComponent)

  return null
}

import { BufferAttribute, BufferGeometry, InstancedBufferAttribute, Mesh } from 'three'

import { defineComponent } from '@etherealengine/engine/src/ecs/functions/ComponentFunctions'

export const MeshComponent = defineComponent({
  name: 'EE_mesh',
  jsonID: 'mesh',
  onInit: () => null as Mesh | null,
  onSet: (entity, component, mesh?: Mesh | null) => {
    if (mesh === null || mesh instanceof Mesh) {
      component.set(mesh)
      MeshComponent.valueMap[entity] = mesh
    }
  }
})

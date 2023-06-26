import React from 'react'
import { useTranslation } from 'react-i18next'
import { Material, Mesh } from 'three'

import { Entity } from '@etherealengine/engine/src/ecs/classes/Entity'
import { getComponent } from '@etherealengine/engine/src/ecs/functions/ComponentFunctions'
import { MeshComponent } from '@etherealengine/engine/src/scene/components/MeshComponent'

import GeometryEditor from '../geometry/GeometryEditor'
import CollapsibleBlock from '../layout/CollapsibleBlock'
import MaterialEditor from '../materials/MaterialEditor'
import NodeEditor from './NodeEditor'
import { EditorComponentType } from './Util'

export const MeshNodeEditor: EditorComponentType = (props: { entity: Entity }) => {
  const entity = props.entity
  const { t } = useTranslation()
  const meshComponent = getComponent(entity, MeshComponent) as Mesh | null
  return (
    <NodeEditor
      name={t('editor:properties.mesh.name')}
      description={t('editor:properties.mesh.description')}
      {...props}
    >
      <CollapsibleBlock label={t('editor:properties.mesh.geometryEditor')}>
        <GeometryEditor geometry={meshComponent?.geometry ?? null} />
      </CollapsibleBlock>
      <CollapsibleBlock label={t('editor:properties.mesh.materialEditor')}>
        <MaterialEditor material={(meshComponent?.material as Material) ?? null} />
      </CollapsibleBlock>
    </NodeEditor>
  )
}

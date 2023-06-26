import React from 'react'
import { useTranslation } from 'react-i18next'

import { Entity } from '@etherealengine/engine/src/ecs/classes/Entity'

import { ScatterPlot } from '@mui/icons-material'

import NodeEditor from './NodeEditor'
import { EditorComponentType } from './Util'

export const InstancingNodeEditor: EditorComponentType = (props: { entity: Entity }) => {
  const { t } = useTranslation()

  return (
    <NodeEditor
      name={t('editor:properties.instancing.name')}
      description={t('editor:properties.instancing.description')}
      {...props}
    ></NodeEditor>
  )
}

InstancingNodeEditor.iconComponent = ScatterPlot

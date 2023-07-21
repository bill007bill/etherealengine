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

import React from 'react'
import { Background, BackgroundVariant, ReactFlow } from 'reactflow'

import { GraphJSON } from '@etherealengine/engine/src/behave-graph/core'

import { useBehaveGraphFlow } from '../hooks/useBehaveGraphFlow.js'
import { useCoreRegistry } from '../hooks/useCoreRegistry.js'
import { useFlowHandlers } from '../hooks/useFlowHandlers.js'
import { useGraphRunner } from '../hooks/useGraphRunner.js'
import { useNodeSpecJson } from '../hooks/useNodeSpecJson.js'
import CustomControls from './Controls.js'
import { Examples } from './modals/LoadModal.js'
import { NodePicker } from './NodePicker.js'

type FlowProps = {
  initialGraph: GraphJSON
  examples: Examples
}

export const Flow: React.FC<FlowProps> = ({ initialGraph: graph, examples }) => {
  const { nodeDefinitions, valuesDefinitions, dependencies: dependencies } = useCoreRegistry()
  const specJson = useNodeSpecJson({
    nodes: nodeDefinitions,
    values: valuesDefinitions,
    dependencies
  })

  const { nodes, edges, onNodesChange, onEdgesChange, graphJson, setGraphJson, nodeTypes } = useBehaveGraphFlow({
    initialGraphJson: graph,
    specJson
  })
  const {
    onConnect,
    handleStartConnect,
    handleStopConnect,
    handlePaneClick,
    handlePaneContextMenu,
    nodePickerVisibility,
    handleAddNode,
    lastConnectStart,
    closeNodePicker,
    nodePickFilters
  } = useFlowHandlers({
    nodes,
    onEdgesChange,
    onNodesChange,
    specJSON: specJson
  })

  const { togglePlay, playing } = useGraphRunner({
    graphJson,
    valueTypeDefinitions: valuesDefinitions,
    nodeDefinitions,
    eventEmitter: dependencies.lifecycleEventEmitter,
    dependencies
  })

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      // @ts-ignore
      onConnectStart={handleStartConnect}
      // @ts-ignore
      onConnectEnd={handleStopConnect}
      fitView
      fitViewOptions={{ maxZoom: 1 }}
      onPaneClick={handlePaneClick}
      onPaneContextMenu={handlePaneContextMenu}
    >
      <CustomControls
        playing={playing}
        togglePlay={togglePlay}
        setBehaviorGraph={setGraphJson}
        examples={examples}
        specJson={specJson}
      />
      <Background variant={BackgroundVariant.Lines} color="#2a2b2d" style={{ backgroundColor: '#1E1F22' }} />
      {nodePickerVisibility && (
        <NodePicker
          position={nodePickerVisibility}
          filters={nodePickFilters}
          onPickNode={handleAddNode}
          onClose={closeNodePicker}
          specJSON={specJson}
        />
      )}
    </ReactFlow>
  )
}

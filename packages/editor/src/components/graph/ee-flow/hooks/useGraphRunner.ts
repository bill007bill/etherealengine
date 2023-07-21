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

import { useCallback, useEffect, useState } from 'react'

import {
  Dependencies,
  Engine,
  GraphJSON,
  GraphNodes,
  ILifecycleEventEmitter,
  NodeDefinitionsMap,
  readGraphFromJSON,
  ValueTypeMap
} from '@etherealengine/engine/src/behave-graph/core'

/** Runs the behavior graph by building the execution
 * engine and triggering start on the lifecycle event emitter.
 */
export const useGraphRunner = ({
  graphJson,
  eventEmitter,
  autoRun = false,
  nodeDefinitions,
  valueTypeDefinitions,
  dependencies
}: {
  graphJson: GraphJSON | undefined
  eventEmitter: ILifecycleEventEmitter
  autoRun?: boolean
  nodeDefinitions: NodeDefinitionsMap
  valueTypeDefinitions: ValueTypeMap
  dependencies: Dependencies | undefined
}) => {
  const [engine, setEngine] = useState<Engine>()

  const [run, setRun] = useState(autoRun)

  const play = useCallback(() => {
    setRun(true)
  }, [])

  const pause = useCallback(() => {
    setRun(false)
  }, [])

  const togglePlay = useCallback(() => {
    setRun((existing) => !existing)
  }, [])

  useEffect(() => {
    if (!graphJson || !valueTypeDefinitions || !run || !dependencies) return

    let graphNodes: GraphNodes
    try {
      graphNodes = readGraphFromJSON({
        graphJson,
        nodes: nodeDefinitions,
        values: valueTypeDefinitions,
        dependencies
      }).nodes
    } catch (e) {
      console.error(e)
      return
    }
    const engine = new Engine(graphNodes)

    setEngine(engine)

    return () => {
      engine.dispose()
      setEngine(undefined)
    }
  }, [graphJson, valueTypeDefinitions, nodeDefinitions, run, dependencies])

  useEffect(() => {
    if (!engine || !run) return

    engine.executeAllSync()

    let timeout: number

    const onTick = async () => {
      eventEmitter.tickEvent.emit()

      // eslint-disable-next-line no-await-in-loop
      await engine.executeAllAsync(500)

      timeout = window.setTimeout(onTick, 50)
    }

    ;(async () => {
      if (eventEmitter.startEvent.listenerCount > 0) {
        eventEmitter.startEvent.emit()

        await engine.executeAllAsync(5)
      } else {
        console.log('has no listener count')
      }
      onTick()
    })()

    return () => {
      window.clearTimeout(timeout)
    }
  }, [engine, eventEmitter.startEvent, eventEmitter.tickEvent, run])

  return {
    engine,
    playing: run,
    play,
    togglePlay,
    pause
  }
}

import { useEffect } from 'react'

import { API } from '@xrengine/client-core/src/API'
import { InstanceInterface } from '@xrengine/common/src/dbmodels/Instance'
import { matches, Validator } from '@xrengine/engine/src/common/functions/MatchesUtils'
import {
  addActionReceptor,
  defineAction,
  defineState,
  dispatchAction,
  getState,
  registerState,
  useState
} from '@xrengine/hyperflux'

type ActiveInstance = {
  id: string
  location: string
  // todo: assignedAt so we can sort by most recent?
}

const EditorActiveInstanceState = defineState({
  name: 'EditorActiveInstanceState',
  initial: () => ({
    activeInstances: [] as ActiveInstance[],
    fetching: false
  })
})

export const EditorActiveInstanceServiceReceptor = (action): any => {
  getState(EditorActiveInstanceState).batch((s) => {
    matches(action)
      .when(EditorActiveInstanceAction.fetchingActiveInstances.matches, (action) => {
        return s.merge({ fetching: true })
      })
      .when(EditorActiveInstanceAction.fetchedActiveInstances.matches, (action) => {
        return s.merge({ activeInstances: action.activeInstances, fetching: false })
      })
  })
}

export const accessEditorActiveInstanceState = () => getState(EditorActiveInstanceState)

export const useEditorActiveInstanceState = () => useState(accessEditorActiveInstanceState())

//Service
export const EditorActiveInstanceService = {
  getActiveInstances: async (sceneId: string) => {
    dispatchAction(EditorActiveInstanceAction.fetchingActiveInstances())
    const activeInstances = await API.instance.client.service('instances-active').find({
      query: { sceneId }
    })
    dispatchAction(EditorActiveInstanceAction.fetchedActiveInstances({ activeInstances }))
  }
  /** @todo figure out how to subscribe to this service with scoped permissions */
  // useAPIListeners: () => {
  //   useEffect(() => {
  //     const listener = (params) => {
  //       dispatchAction(EditorActiveInstanceAction.fetchedActiveInstances({ activeInstances: params.instances }))
  //     }
  //     API.instance.client.service('instances-active').on('created', listener)
  //     return () => {
  //       API.instance.client.service('instances-active').off('created', listener)
  //     }
  //   }, [])
  // }
}

//Action
export class EditorActiveInstanceAction {
  static fetchingActiveInstances = defineAction({
    type: 'editorActiveInstance.FETCHING_ACTIVE_INSTANCES' as const
  })

  static fetchedActiveInstances = defineAction({
    type: 'editorActiveInstance.FETCHED_ACTIVE_INSTANCES' as const,
    activeInstances: matches.array as Validator<unknown, ActiveInstance[]>
  })
}
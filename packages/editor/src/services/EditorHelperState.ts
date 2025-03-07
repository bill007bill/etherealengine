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

import { useHookstate } from '@hookstate/core'
import { useEffect } from 'react'

import InfiniteGridHelper from '@etherealengine/engine/src/scene/classes/InfiniteGridHelper'
import {
  SnapMode,
  SnapModeType,
  TransformMode,
  TransformModeType,
  TransformPivot,
  TransformPivotType,
  TransformSpace
} from '@etherealengine/engine/src/scene/constants/transformConstants'
import { defineState, getMutableState, startReactor, syncStateWithLocalStorage } from '@etherealengine/hyperflux'

export const EditorHelperState = defineState({
  name: 'EditorHelperState',
  initial: () => ({
    isFlyModeEnabled: false,
    transformMode: TransformMode.Translate as TransformModeType,
    transformModeOnCancel: TransformMode.Translate as TransformModeType,
    transformSpace: TransformSpace.World as TransformSpace,
    transformPivot: TransformPivot.Selection as TransformPivotType,
    snapMode: SnapMode.Grid as SnapModeType,
    translationSnap: 0.5,
    rotationSnap: 10,
    scaleSnap: 0.1,
    isGenerateThumbnailsEnabled: true
  }),
  onCreate: () => {
    syncStateWithLocalStorage(EditorHelperState, [
      'snapMode',
      'translationSnap',
      'rotationSnap',
      'scaleSnap',
      'isGenerateThumbnailsEnabled'
    ])
    /** @todo move this to EditorHelperServiceSystem when the receptor is moved over */
    startReactor(() => {
      const state = useHookstate(getMutableState(EditorHelperState))

      useEffect(() => {
        InfiniteGridHelper.instance?.setSize(state.translationSnap.value)
      }, [state.translationSnap])

      return null!
    })
  }
})

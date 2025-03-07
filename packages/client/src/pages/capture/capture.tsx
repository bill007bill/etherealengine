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

import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { NotificationService } from '@etherealengine/client-core/src/common/services/NotificationService'
import {
  useLoadEngineWithScene,
  useOfflineNetwork,
  useOnlineNetwork
} from '@etherealengine/client-core/src/components/World/EngineHooks'
import {
  useLoadLocation,
  useLoadLocationScene,
  useLoadScene
} from '@etherealengine/client-core/src/components/World/LoadLocationScene'
import { useRemoveEngineCanvas } from '@etherealengine/client-core/src/hooks/useRemoveEngineCanvas'
import { ClientNetworkingSystem } from '@etherealengine/client-core/src/networking/ClientNetworkingSystem'
import { AuthService } from '@etherealengine/client-core/src/user/services/AuthService'
import { AvatarMovementSystem } from '@etherealengine/engine/src/avatar/systems/AvatarMovementSystem'
import { PresentationSystemGroup } from '@etherealengine/engine/src/ecs/functions/EngineFunctions'
import { defineSystem, disableSystem, startSystems } from '@etherealengine/engine/src/ecs/functions/SystemFunctions'
import { ECSRecordingActions } from '@etherealengine/engine/src/recording/ECSRecordingSystem'
import { defineActionQueue } from '@etherealengine/hyperflux'
import CaptureUI from '@etherealengine/ui/src/pages/Capture'

const ecsRecordingErrorActionQueue = defineActionQueue(ECSRecordingActions.error.matches)

const NotifyRecordingErrorSystem = defineSystem({
  uuid: 'notifyRecordingErrorSystem',
  execute: () => {
    for (const action of ecsRecordingErrorActionQueue()) {
      NotificationService.dispatchNotify(action.error, { variant: 'error' })
    }
  }
})

const startCaptureSystems = () => {
  startSystems([ClientNetworkingSystem, NotifyRecordingErrorSystem], { after: PresentationSystemGroup })
  disableSystem(AvatarMovementSystem)
}

export const CaptureLocation = () => {
  useRemoveEngineCanvas()

  const params = useParams()

  const locationName = params?.locationName as string | undefined
  const offline = !locationName

  useLoadLocationScene()
  useLoadEngineWithScene({ spectate: true })

  if (offline) {
    useLoadScene({ projectName: 'default-project', sceneName: 'default' })
  } else {
    useLoadLocation({ locationName: params.locationName! })
  }

  if (offline) {
    useOfflineNetwork()
  } else {
    useOnlineNetwork()
  }

  AuthService.useAPIListeners()

  useEffect(() => {
    startCaptureSystems()
  }, [])

  return <CaptureUI />
}

export default CaptureLocation

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

import { none } from '@hookstate/core'
import { useEffect } from 'react'

import { Channel } from '@etherealengine/common/src/interfaces/Channel'
import { ChannelID } from '@etherealengine/common/src/interfaces/ChannelUser'
import { UserId } from '@etherealengine/common/src/interfaces/UserId'
import multiLogger from '@etherealengine/common/src/logger'
import { Engine } from '@etherealengine/engine/src/ecs/classes/Engine'
import { defineState, getMutableState } from '@etherealengine/hyperflux'

import { NotificationService } from '../../common/services/NotificationService'

const logger = multiLogger.child({ component: 'client-core:social' })

export const ChannelState = defineState({
  name: 'ChannelState',
  initial: () => ({
    channels: {
      channels: [] as Channel[],
      limit: 5,
      skip: 0,
      total: 0
    },
    targetChannelId: '' as ChannelID,
    instanceChannelFetching: false,
    instanceChannelFetched: false,
    partyChannelFetching: false,
    partyChannelFetched: false,
    messageCreated: false
  })
})

export const ChannelService = {
  getChannels: async () => {
    try {
      const channelResult = (await Engine.instance.api.service('channel').find({})) as Channel[]
      const channelState = getMutableState(ChannelState)
      channelState.channels.merge({
        channels: channelResult
      })
    } catch (err) {
      NotificationService.dispatchNotify(err.message, { variant: 'error' })
    }
  },
  getInstanceChannel: async () => {
    try {
      const channelResult = (await Engine.instance.api.service('channel').find({
        query: {
          instanceId: Engine.instance.worldNetwork.hostId
        }
      })) as Channel[]
      if (!channelResult.length) return setTimeout(() => ChannelService.getInstanceChannel(), 2000)

      const channel = channelResult[0]

      const channelState = getMutableState(ChannelState)
      let findIndex
      if (typeof channel.id === 'string')
        findIndex = channelState.channels.channels.findIndex((c) => c.id.value === channel.id)
      let idx = findIndex > -1 ? findIndex : channelState.channels.channels.length
      channelState.channels.channels[idx].set(channel)
      const endedInstanceChannelIndex = channelState.channels.channels.findIndex(
        (_channel) => channel.id !== _channel.id.value
      )
      if (endedInstanceChannelIndex > -1) channelState.channels.channels[endedInstanceChannelIndex].set(none)
      channelState.merge({
        instanceChannelFetched: true,
        instanceChannelFetching: false,
        targetChannelId: channel.id,
        messageCreated: true
      })
      channelState.merge({ messageCreated: true })
    } catch (err) {
      NotificationService.dispatchNotify(err.message, { variant: 'error' })
    }
  },
  createChannel: async (users: UserId[]) => {
    try {
      const channel = await Engine.instance.api.service('channel').create({
        users
      })
      await ChannelService.getChannels()
      const channelState = getMutableState(ChannelState)
      channelState.targetChannelId.set(channel.id)
    } catch (err) {
      NotificationService.dispatchNotify(err.message, { variant: 'error' })
    }
  },
  removeUserFromChannel: async (channelId: ChannelID, userId: UserId) => {
    try {
      await Engine.instance.api.service('channel-user').remove(null, {
        query: {
          channelId,
          userId
        }
      })
      await ChannelService.getChannels()
    } catch (err) {
      NotificationService.dispatchNotify(err.message, { variant: 'error' })
    }
  },
  clearChatTargetIfCurrent: (targetChannelId: ChannelID) => {
    getMutableState(ChannelState).targetChannelId.set(targetChannelId)
  },
  useAPIListeners: () => {
    useEffect(() => {
      const channelCreatedListener = (params: Channel) => {
        const channelState = getMutableState(ChannelState)
        const channelId = params.id
        const channel = channelState.channels.channels.find((c) => c.id.value === channelId)

        if (channel) {
          channel.merge(params)
        } else {
          channelState.channels.channels[channelState.channels.channels.length].set(params)
        }
      }

      const channelPatchedListener = (params: Channel) => {
        const channelState = getMutableState(ChannelState)
        const channelId = params.id
        const channel = channelState.channels.channels.find((c) => c.id.value === channelId)

        if (channel) {
          channel.merge(params)
        } else {
          channelState.channels.channels[channelState.channels.channels.length].set(params)
        }
        channelState.merge({ messageCreated: false })
      }

      const channelRemovedListener = (params: Channel) => {
        const channelState = getMutableState(ChannelState)
        const channelId = params.id
        const channelIdx = channelState.channels.channels.findIndex((c) => c.id.value === channelId)
        if (channelIdx > -1) {
          channelState.channels.channels[channelIdx].set(none)
        }
      }

      Engine.instance.api.service('channel').on('created', channelCreatedListener)
      Engine.instance.api.service('channel').on('patched', channelPatchedListener)
      Engine.instance.api.service('channel').on('removed', channelRemovedListener)

      return () => {
        Engine.instance.api.service('channel').off('created', channelCreatedListener)
        Engine.instance.api.service('channel').off('patched', channelPatchedListener)
        Engine.instance.api.service('channel').off('removed', channelRemovedListener)
      }
    }, [])
  }
}
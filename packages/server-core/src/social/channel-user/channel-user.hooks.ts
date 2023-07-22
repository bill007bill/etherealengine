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

import { HookContext } from '@feathersjs/feathers'
import { disallow, iff, isProvider } from 'feathers-hooks-common'

import channelUserPermissionAuthenticate from '@etherealengine/server-core/src/hooks/channel-user-permission-authenticate'
import setLoggedInUser from '@etherealengine/server-core/src/hooks/set-loggedin-user-in-body'

import authenticate from '../../hooks/authenticate'
import verifyScope from '../../hooks/verify-scope'

export default {
  before: {
    all: [authenticate()],
    find: [iff(isProvider('external'), channelUserPermissionAuthenticate())],
    get: [disallow('external')],
    create: [iff(isProvider('external'), verifyScope('admin', 'admin'))],
    update: [disallow('external')],
    patch: [iff(isProvider('external'), channelUserPermissionAuthenticate())],
    remove: [setLoggedInUser('userId')]
  },

  after: {
    all: [],
    find: [],
    get: [
      async (context: HookContext): Promise<HookContext> => {
        const { app, result } = context
        result.user = await app.service('user').get(result.userId)
        return context
      }
    ],
    create: [
      async (context: HookContext): Promise<HookContext> => {
        const { app, result } = context
        const user = await app.service('user').get(result.userId)
        await app.service('message').create(
          {
            channelId: result.channelId,
            text: `${user.name} joined the channel`,
            isNotification: true
          },
          {
            'identity-provider': {
              userId: result.userId
            }
          } as any
        )
        return context
      }
    ],
    update: [],
    patch: [],
    remove: [
      async (context: HookContext): Promise<HookContext> => {
        const { app, params, result } = context
        console.log('params', params, result)
        const user = await app.service('user').get(result.userId)
        await app.service('message').create({
          channelId: result.channelId,
          text: `${user.name} left the channel`,
          isNotification: true
        })
        /** @todo - remove channel if no users left */
        // if (params.channelUsersRemoved !== true) {
        //   const channelUserCount = await app.service('channel-user').find({
        //     query: {
        //       channelId: params.query!.channelId,
        //       $limit: 0
        //     }
        //   })
        //   if (channelUserCount.total < 1) {
        //     await app.service('channel').remove(params.query!.channelId, params)
        //   }
        // }
        return context
      }
    ]
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
} as any
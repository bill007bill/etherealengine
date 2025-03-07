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

import { hooks as schemaHooks } from '@feathersjs/schema'
import { iff, isProvider } from 'feathers-hooks-common'

import {
  AuthenticationSettingPatch,
  AuthenticationSettingType,
  authenticationSettingDataValidator,
  authenticationSettingPatchValidator,
  authenticationSettingPath,
  authenticationSettingQueryValidator
} from '@etherealengine/engine/src/schemas/setting/authentication-setting.schema'
import * as k8s from '@kubernetes/client-node'

import { getState } from '@etherealengine/hyperflux'
import { BadRequest } from '@feathersjs/errors'
import { HookContext } from '../../../declarations'
import logger from '../../ServerLogger'
import { ServerState } from '../../ServerState'
import config from '../../appconfig'
import verifyScope from '../../hooks/verify-scope'
import { AuthenticationSettingService } from './authentication-setting.class'
import {
  authenticationSettingDataResolver,
  authenticationSettingExternalResolver,
  authenticationSettingPatchResolver,
  authenticationSettingQueryResolver,
  authenticationSettingResolver,
  authenticationSettingSchemaToDb
} from './authentication-setting.resolvers'

/**
 * Maps settings for admin
 * @param context
 * @returns
 */
const mapSettingsAdmin = async (context: HookContext<AuthenticationSettingService>) => {
  const loggedInUser = context.params!.user!
  if (context.result && (!loggedInUser.scopes || !loggedInUser.scopes.find((scope) => scope.type === 'admin:admin'))) {
    const auth: AuthenticationSettingType[] = context.result['data'] ? context.result['data'] : context.result
    const data = auth.map((el) => {
      return {
        id: el.id,
        entity: el.entity,
        service: el.service,
        authStrategies: el.authStrategies,
        createdAt: el.createdAt,
        updatedAt: el.updatedAt,
        secret: ''
      }
    })
    context.result =
      context.params.paginate === false
        ? data
        : {
            data: data,
            total: data.length,
            limit: context.params?.query?.$limit || 0,
            skip: context.params?.query?.$skip || 0
          }
  }
}

/**
 * Updates OAuth in data
 * @param context
 * @returns
 */
const ensureOAuth = async (context: HookContext<AuthenticationSettingService>) => {
  if (!context.data || context.method !== 'patch') {
    throw new BadRequest(`${context.path} service only works for data in ${context.method}`)
  }

  const data: AuthenticationSettingPatch = context.data as AuthenticationSettingPatch
  const authSettings = await context.app.service(authenticationSettingPath).get(context.id!)

  const newOAuth = data.oauth!
  data.callback = authSettings.callback

  for (const key of Object.keys(newOAuth)) {
    if (config.authentication.oauth[key]?.scope) newOAuth[key].scope = config.authentication.oauth[key].scope
    if (config.authentication.oauth[key]?.custom_data)
      newOAuth[key].custom_data = config.authentication.oauth[key].custom_data
    if (key !== 'defaults' && data.callback && !data.callback[key])
      data.callback[key] = `${config.client.url}/auth/oauth/${key}`
  }

  context.data = authenticationSettingSchemaToDb(data) as any
}

/**
 * Refreshes API pods
 * @param context
 * @returns
 */
const refreshAPIPods = async (context: HookContext<AuthenticationSettingService>) => {
  const k8AppsClient = getState(ServerState).k8AppsClient

  if (k8AppsClient) {
    try {
      logger.info('Attempting to refresh API pods')
      const refreshApiPodResponse = await k8AppsClient.patchNamespacedDeployment(
        `${config.server.releaseName}-etherealengine-api`,
        'default',
        {
          spec: {
            template: {
              metadata: {
                annotations: {
                  'kubectl.kubernetes.io/restartedAt': new Date().toISOString()
                }
              }
            }
          }
        },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': k8s.PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH
          }
        }
      )
      logger.info(refreshApiPodResponse, 'updateBuilderTagResponse')
    } catch (e) {
      logger.error(e)
      return e
    }
  }
}

export default {
  around: {
    all: [
      schemaHooks.resolveExternal(authenticationSettingExternalResolver),
      schemaHooks.resolveResult(authenticationSettingResolver)
    ]
  },

  before: {
    all: [
      () => schemaHooks.validateQuery(authenticationSettingQueryValidator),
      schemaHooks.resolveQuery(authenticationSettingQueryResolver)
    ],
    find: [],
    get: [iff(isProvider('external'), verifyScope('admin', 'admin'), verifyScope('settings', 'read'))],
    create: [
      iff(isProvider('external'), verifyScope('admin', 'admin'), verifyScope('settings', 'write')),
      () => schemaHooks.validateData(authenticationSettingDataValidator),
      schemaHooks.resolveData(authenticationSettingDataResolver)
    ],
    update: [iff(isProvider('external'), verifyScope('admin', 'admin'), verifyScope('settings', 'write'))],
    patch: [
      iff(isProvider('external'), verifyScope('admin', 'admin'), verifyScope('settings', 'write')),
      () => schemaHooks.validateData(authenticationSettingPatchValidator),
      schemaHooks.resolveData(authenticationSettingPatchResolver),
      ensureOAuth
    ],
    remove: [iff(isProvider('external'), verifyScope('admin', 'admin'), verifyScope('settings', 'write'))]
  },

  after: {
    all: [],
    find: [mapSettingsAdmin],
    get: [],
    create: [],
    update: [],
    patch: [refreshAPIPods],
    remove: []
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

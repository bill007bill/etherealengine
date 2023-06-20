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

import { Paginated, Params } from '@feathersjs/feathers'
import { SequelizeServiceOptions, Service } from 'feathers-sequelize'
import { Knex } from 'knex'
import Sequelize, { Op } from 'sequelize'
import slugify from 'slugify'

import { Location as LocationType } from '@etherealengine/common/src/interfaces/Location'
import { UserInterface } from '@etherealengine/common/src/interfaces/User'
import {
  locationSettingPath,
  LocationSettingType
} from '@etherealengine/engine/src/schemas/social/location-setting.schema'

import { Application } from '../../../declarations'
import logger from '../../ServerLogger'
import { UserParams } from '../../user/user/user.class'
import { createLocationSettingModel } from './location.model'

export type LocationDataType = LocationType

export class Location<T = LocationDataType> extends Service<T> {
  app: Application
  docs: any

  constructor(options: Partial<SequelizeServiceOptions>, app: Application) {
    super(options)
    this.app = app
  }

  // async create (data: any, params: Params): Promise<any> {
  //   console.log(data);
  //   const { id } = data;
  //
  //   if (id) {
  //     await this.app.service('location').get(id).then((existingLocation: any) => {
  //       new Promise((resolve) =>
  //         setTimeout(() => resolve(super.update(id, data, params)), 1000)
  //       ).then((updatedLocation: any) => {
  //         this.createInstances({ id: updatedLocation.id, instance: data.instance }).then(() => {}, () => {});
  //       }, (reason: any) => {
  //         console.error(reason);
  //       });
  //     }, (newLoc: any) => {
  //       this.createNewLocation({ data, params }).then(() => {}, () => {});
  //     });
  //   } else {
  //     this.createNewLocation({ data, params }).then(() => {}, () => {});
  //   }
  //
  //   return 'success';
  // }

  /**
   * A method which is used to create new location
   *
   * @param param0 data of new location
   */

  async createNewLocation({ data, params }: { data: any; params: Params }): Promise<any> {
    await new Promise((resolve) => setTimeout(() => resolve(super.create(data, params)), 1000)).then(
      (updatedLocation: any) => {
        this.createInstances({ id: updatedLocation.id, instance: data.instance }).then(
          () => {},
          () => {}
        )
      },
      (reason: any) => {
        logger.error(reason)
      }
    )
  }

  /**
   * A function which is used to create new instance
   *
   * @param param0 data of instance
   */
  async createInstances({ id, instance }: { id: any; instance: any }): Promise<void> {
    if (instance) {
      await instance.forEach((element: any) => {
        if (element.id) {
          this.app.services.instance.get(element.id).then(
            (existingInstance: any) => {
              element.locationId = id
              new Promise((resolve) =>
                setTimeout(() => resolve(this.app.services.instance.update(existingInstance.id, element)), 1000)
              ).then(
                (value: any) => {
                  logger.info(value)
                },
                (reason: any) => {
                  logger.error(reason)
                }
              )
            },
            (newIns: any) => {
              element.locationId = id
              new Promise((resolve) =>
                setTimeout(() => resolve(this.app.services.instance.create(element)), 1000)
              ).then(
                (value: any) => {
                  logger.info(value)
                },
                (reasone: any) => {
                  logger.error(reasone)
                }
              )
            }
          )
        } else {
          element.locationId = id
          new Promise((resolve) => setTimeout(() => resolve(this.app.services.instance.create(element)), 1000)).then(
            (value: any) => {
              logger.info(value)
            },
            (reason: any) => {
              logger.error(reason)
            }
          )
        }
      })
    }
  }

  /**
   * A function which help to find and display all locations
   *
   * @param params of query with limit number and skip number
   * @returns {@Array} of all locations
   */
  async find(params?: UserParams): Promise<T[] | Paginated<T>> {
    let { $skip, $limit, $sort, joinableLocations, adminnedLocations, search, ...strippedQuery } = params?.query ?? {}

    if ($skip == null) $skip = 0
    if ($limit == null) $limit = 10

    const order: any[] = []
    if ($sort != null)
      Object.keys($sort).forEach((name, val) => {
        if (name === 'type') {
          order.push(['locationSetting', 'locationType', $sort[name] === 0 ? 'DESC' : 'ASC'])
        } else if (name === 'audioEnabled') {
          order.push(['locationSetting', 'audioEnabled', $sort[name] === 0 ? 'DESC' : 'ASC'])
        } else if (name === 'videoEnabled') {
          order.push(['locationSetting', 'videoEnabled', $sort[name] === 0 ? 'DESC' : 'ASC'])
        } else {
          order.push([name, $sort[name] === 0 ? 'DESC' : 'ASC'])
        }
      })

    if (joinableLocations) {
      const locationResult = await this.app.service('location').Model.findAndCountAll({
        offset: $skip,
        limit: $limit,
        where: strippedQuery,
        order: order,
        include: [
          {
            model: this.app.service('instance').Model,
            required: false,
            where: {
              currentUsers: {
                [Op.lt]: Sequelize.col('location.maxUsersPerInstance')
              },
              ended: false
            }
          },
          {
            model: createLocationSettingModel(this.app),
            required: false
          },
          {
            model: this.app.service('location-ban').Model,
            required: false
          },
          {
            model: this.app.service('location-authorized-user').Model,
            required: false
          }
        ]
      })
      return {
        skip: $skip,
        limit: $limit,
        total: locationResult.count,
        data: locationResult.rows
      }
    } else if (adminnedLocations) {
      const loggedInUser = params!.user as UserInterface
      const include = [
        {
          model: createLocationSettingModel(this.app),
          required: false
        },
        {
          model: this.app.service('location-ban').Model,
          required: false
        },
        {
          model: this.app.service('location-authorized-user').Model,
          require: false
        }
      ]

      if (!loggedInUser.scopes || !loggedInUser.scopes.find((scope) => scope.type === 'admin:admin')) {
        ;(include as any).push({
          model: this.app.service('location-admin').Model,
          where: {
            userId: loggedInUser.id
          }
        })
      }

      let q = {}

      if (search) {
        q = {
          [Op.or]: [
            Sequelize.where(Sequelize.fn('lower', Sequelize.col('name')), {
              [Op.like]: '%' + search.toLowerCase() + '%'
            }),
            Sequelize.where(Sequelize.fn('lower', Sequelize.col('sceneId')), {
              [Op.like]: '%' + search.toLowerCase() + '%'
            })
          ]
        }
      }
      const locationResult = await this.app.service('location').Model.findAndCountAll({
        offset: $skip,
        limit: $limit,
        where: { ...strippedQuery, ...q },
        order: order,
        include: include
      })
      return {
        skip: $skip,
        limit: $limit,
        total: locationResult.count,
        data: locationResult.rows
      }
    } else {
      return super.find(params)
    }
  }

  /**
   * A function which is used to create new location
   *
   * @param data of location
   * @param params
   * @returns new location object
   */
  async create(data: any, params?: UserParams): Promise<T> {
    const t = await this.app.get('sequelizeClient').transaction()
    const trx = await (this.app.get('knexClient') as Knex).transaction()

    try {
      // @ts-ignore
      let { locationSetting, ...locationData } = data
      const loggedInUser = params!.user as UserInterface
      locationData.slugifiedName = slugify(locationData.name, { lower: true })

      if (locationData.isLobby) await this.makeLobby(t, params)

      const location = await this.Model.create(locationData, { transaction: t })
      await trx.from<LocationSettingType>(locationSettingPath).insert({
        videoEnabled: !!locationSetting.videoEnabled,
        audioEnabled: !!locationSetting.audioEnabled,
        faceStreamingEnabled: !!locationSetting.faceStreamingEnabled,
        screenSharingEnabled: !!locationSetting.screenSharingEnabled,
        locationType: locationSetting.locationType || 'private',
        locationId: location.id
      })

      if (loggedInUser) {
        await Promise.all([
          this.app.service('location-admin').Model.create(
            {
              locationId: location.id,
              userId: loggedInUser.id
            },
            { transaction: t }
          ),
          this.app.service('location-authorized-user').Model.create(
            {
              locationId: location.id,
              userId: loggedInUser.id
            },
            { transaction: t }
          )
        ])
      }

      await t.commit()
      await trx.commit()

      return location as T
    } catch (err) {
      logger.error(err)
      await t.rollback()
      await trx.rollback()
      if (err.errors && err.errors[0].message === 'slugifiedName must be unique') {
        throw new Error('Name is in use.')
      }
      throw err
    }
  }

  /**
   * A function which is used to update location
   *
   * @param id of location to update
   * @param data of location going to be updated
   * @returns updated location
   */
  async patch(id: string, data: any, params?: Params): Promise<T> {
    const t = await this.app.get('sequelizeClient').transaction()
    const trx = await (this.app.get('knexClient') as Knex).transaction()

    try {
      // @ts-ignore
      let { locationSetting, ...locationData } = data
      locationSetting ??= data['locationSetting']

      const old = await this.Model.findOne({
        where: { id },
        include: [createLocationSettingModel(this.app)]
      })

      if (locationData.name) locationData.slugifiedName = slugify(locationData.name, { lower: true })
      if (!old.isLobby && locationData.isLobby) await this.makeLobby(t, params)

      await this.Model.update(locationData, { where: { id }, transaction: t }) // super.patch(id, locationData, params);

      await trx
        .from<LocationSettingType>(locationSettingPath)
        .update({
          videoEnabled: !!locationSetting.videoEnabled,
          audioEnabled: !!locationSetting.audioEnabled,
          faceStreamingEnabled: !!locationSetting.faceStreamingEnabled,
          screenSharingEnabled: !!locationSetting.screenSharingEnabled,
          locationType: locationSetting.locationType || 'private'
        })
        .where({ id: old.locationSetting.id })

      await t.commit()
      await trx.commit()

      const location = await this.Model.findOne({
        where: { id },
        include: [createLocationSettingModel(this.app)]
      })

      return location as T
    } catch (err) {
      logger.error(err)
      await t.rollback()
      await trx.rollback()
      if (err.errors && err.errors[0].message === 'slugifiedName must be unique') {
        throw new Error('That name is already in use')
      }
      throw err
    }
  }
  /**
   * A function which is used to remove location
   *
   * @param id of location which is going to be removed
   * @param params which contain user information
   * @returns {@function} of remove data
   */

  async remove(id: string, params?: UserParams): Promise<T> {
    const location = await this.app.service('location').Model.findOne({
      where: {
        isLobby: true,
        id: id
      },
      attributes: ['id', 'isLobby']
    })

    if (location) {
      throw new Error("Lobby can't be deleted")
    }

    if (id != null) {
      const selfUser = params!.user as UserInterface
      const location = await this.app.service('location').get(id)
      if (location.locationSettingId != null)
        await this.app.service(locationSettingPath).remove(location.locationSettingId)
      try {
        const locationAdminItems = await (this.app.service('location-admin') as any).Model.findAll({
          where: {
            locationId: id,
            userId: selfUser.id ?? null
          }
        })
        locationAdminItems.length &&
          locationAdminItems.forEach(async (route) => {
            await this.app.service('location-admin').remove(route.dataValues.id)
          })
      } catch (err) {
        logger.error(err, `Could not remove location-admin: ${err.message}`)
      }
    }
    return (await super.remove(id)) as T
  }

  async makeLobby(t, params?: UserParams): Promise<void> {
    const selfUser = params!.user as UserInterface

    if (!selfUser || !selfUser.scopes || !selfUser.scopes.find((scope) => scope.type === 'admin:admin'))
      throw new Error('Only Admin can set Lobby')

    await this.Model.update({ isLobby: false }, { where: { isLobby: true }, transaction: t })
  }
}

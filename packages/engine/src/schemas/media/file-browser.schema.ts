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

import type { Static } from '@feathersjs/typebox'
import { getValidator, Type } from '@feathersjs/typebox'
import { dataValidator } from '../validators'

export const fileBrowserPath = 'file-browser'
export const fileBrowserMethods = ['create', 'find', 'get', 'patch', 'remove', 'update'] as const

export const fileBrowserContentSchema = Type.Object(
  {
    key: Type.String(),
    type: Type.String(),
    name: Type.String(),
    url: Type.String(),
    size: Type.Optional(Type.Number())
  },
  {
    $id: 'FileBrowserContent'
  }
)
export interface FileBrowserContentType extends Static<typeof fileBrowserContentSchema> {}

export const fileBrowserUpdateSchema = Type.Object(
  {
    oldName: Type.String(),
    newName: Type.String(),
    oldPath: Type.String(),
    newPath: Type.String(),
    isCopy: Type.Optional(Type.Boolean()),
    storageProviderName: Type.Optional(Type.String())
  },
  {
    $id: 'FileBrowserUpdate'
  }
)
export interface FileBrowserUpdate extends Static<typeof fileBrowserUpdateSchema> {}

export const fileBrowserPatchSchema = Type.Object(
  {
    path: Type.String(),
    fileName: Type.String(),
    body: Type.Any(),
    contentType: Type.String(),
    storageProviderName: Type.Optional(Type.String())
  },
  {
    $id: 'FileBrowserPatch'
  }
)
export interface FileBrowserPatch extends Static<typeof fileBrowserPatchSchema> {}

export const fileBrowserContentValidator = getValidator(fileBrowserContentSchema, dataValidator)
export const fileBrowserUpdateValidator = getValidator(fileBrowserUpdateSchema, dataValidator)
export const fileBrowserPatchValidator = getValidator(fileBrowserPatchSchema, dataValidator)

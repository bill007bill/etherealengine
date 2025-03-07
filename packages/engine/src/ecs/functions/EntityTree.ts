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

import { EntityUUID } from '@etherealengine/common/src/interfaces/EntityUUID'
import { hookstate, NO_PROXY, none } from '@etherealengine/hyperflux'

import { matchesEntityUUID } from '../../common/functions/MatchesUtils'
import { UUIDComponent } from '../../scene/components/UUIDComponent'
import { Engine } from '../classes/Engine'
import { Entity } from '../classes/Entity'
import {
  defineComponent,
  getComponent,
  getMutableComponent,
  getOptionalComponentState,
  hasComponent,
  removeComponent,
  setComponent
} from '../functions/ComponentFunctions'
import { entityExists, removeEntity } from '../functions/EntityFunctions'

type EntityTreeSetType = {
  parentEntity: Entity | null
  uuid?: EntityUUID
  childIndex?: number
}

/**
 * EntityTreeComponent describes parent-child relationship between entities.
 * A root entity has it's parentEntity set to null.
 * @param {Entity} parentEntity
 * @param {string} uuid
 * @param {Readonly<Entity[]>} children
 */
export const EntityTreeComponent = defineComponent({
  name: 'EntityTreeComponent',

  onInit: (entity) => {
    return {
      // api
      parentEntity: null as Entity | null,
      // internal
      children: [] as Entity[],
      rootEntity: null as Entity | null
    }
  },

  onSet: (entity, component, json?: Readonly<EntityTreeSetType>) => {
    if (!json) return

    // If a previous parentEntity, remove this entity from its children
    if (component.parentEntity.value && component.parentEntity.value !== json.parentEntity) {
      const oldParent = getMutableComponent(component.parentEntity.value, EntityTreeComponent)
      const parentChildIndex = oldParent.children.value.findIndex((child) => child === entity)
      const children = oldParent.children.get(NO_PROXY)
      oldParent.children.set([...children.slice(0, parentChildIndex), ...children.slice(parentChildIndex + 1)])
    }

    // set new data
    if (typeof json.parentEntity !== 'undefined') component.parentEntity.set(json.parentEntity)

    if (matchesEntityUUID.test(json?.uuid)) setComponent(entity, UUIDComponent, json.uuid)

    if (component.parentEntity.value) {
      const parent = getOptionalComponentState(component.parentEntity.value, EntityTreeComponent)

      if (parent) {
        const prevChildIndex = parent?.children.value.indexOf(entity)
        const isDifferentIndex = typeof json.childIndex === 'number' ? prevChildIndex !== json.childIndex : false

        if (isDifferentIndex && prevChildIndex !== -1) {
          parent.children.set((prevChildren) => [
            ...prevChildren.slice(0, prevChildIndex),
            ...prevChildren.slice(prevChildIndex + 1)
          ])
        }

        if (isDifferentIndex || prevChildIndex === -1) {
          if (typeof json.childIndex !== 'undefined')
            parent.children.set((prevChildren) => [
              ...prevChildren.slice(0, json.childIndex),
              entity,
              ...prevChildren.slice(json.childIndex)
            ])
          else parent.children.set([...parent.children.value, entity])
        }
      }
    }

    // If parent is the world origin, then the parent entity is a tree root
    const isRoot = component.parentEntity.value === null
    if (isRoot) {
      EntityTreeComponent.roots[entity].set(true)
    } else {
      EntityTreeComponent.roots[entity].set(none)
    }

    const rootEntity = isRoot ? entity : getComponent(component.parentEntity.value, EntityTreeComponent).rootEntity
    component.rootEntity.set(rootEntity)
  },

  onRemove: (entity, component) => {
    if (entity === Engine.instance.originEntity) return

    if (component.parentEntity.value && entityExists(component.parentEntity.value)) {
      const parent = getMutableComponent(component.parentEntity.value, EntityTreeComponent)
      if (parent) {
        const parentChildIndex = parent.children.value.findIndex((child) => child === entity)
        const children = parent.children.get(NO_PROXY)
        parent.children.set([...children.slice(0, parentChildIndex), ...children.slice(parentChildIndex + 1)])
      }
    } else {
      EntityTreeComponent.roots[entity].set(none)
    }
  },

  roots: hookstate({} as Record<Entity, true>)
})

/**
 * Recursively destroys all the children entities of the passed entity
 */
export function destroyEntityTree(rootEntity: Entity): void {
  const children = getComponent(rootEntity, EntityTreeComponent).children.slice()
  for (const child of children) {
    destroyEntityTree(child)
  }
  removeEntity(rootEntity)
}

/**
 * Recursively removes all the children from the entity tree
 */
export function removeFromEntityTree(rootEntity: Entity): void {
  const children = getComponent(rootEntity, EntityTreeComponent).children.slice()
  for (const child of children) {
    removeFromEntityTree(child)
  }
  removeComponent(rootEntity, EntityTreeComponent)
}

/**
 * Removes an entity node from it's parent, and remove it's entity and all it's children nodes and entities
 * @param node
 * @param tree
 */
export function removeEntityNodeRecursively(entity: Entity) {
  traverseEntityNodeChildFirst(entity, (childEntity) => {
    removeEntity(childEntity)
  })
}

/**
 * Traverse child nodes of the given node. Traversal will start from the passed node
 * note - does not support removing the current node during traversal
 * @param entity Node to be traverse
 * @param cb Callback function which will be called for every traverse
 * @param index index of the curren node in it's parent
 * @param tree Entity Tree
 */
export function traverseEntityNode(entity: Entity, cb: (entity: Entity, index: number) => void, index = 0): void {
  const entityTreeNode = getComponent(entity, EntityTreeComponent)

  if (!entityTreeNode) return

  cb(entity, index)

  if (!entityTreeNode.children.length) return

  for (let i = 0; i < entityTreeNode.children.length; i++) {
    const child = entityTreeNode.children[i]
    traverseEntityNode(child, cb, i)
  }
}

export function traverseEntityNodeChildFirst(
  entity: Entity,
  cb: (entity: Entity, index: number) => void,
  index = 0
): void {
  const entityTreeNode = getComponent(entity, EntityTreeComponent)

  if (!entityTreeNode) return

  const children = [...entityTreeNode.children]

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    traverseEntityNodeChildFirst(child, cb, i)
  }

  cb(entity, index)
}

/**
 * Iteratively traverse parent nodes for given Entity Tree Node
 * @param node Node for which traversal will occur
 * @param cb Callback function which will be called for every traverse
 * @param pred Predicate function which will not process a node or its children if return false
 * @param snubChildren If true, will not traverse children of a node if pred returns false
 */
export function iterateEntityNode<R>(
  entity: Entity,
  cb: (entity: Entity, index: number) => R,
  pred: (entity: Entity) => boolean = (x) => true,
  snubChildren = false
): R[] {
  const frontier = [[entity]]
  const result: R[] = []
  while (frontier.length > 0) {
    const items = frontier.pop()!
    let idx = 0
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (pred(item)) {
        result.push(cb(item, idx))
        idx += 1
        snubChildren &&
          frontier.push(
            getComponent(item, EntityTreeComponent).children?.filter((x) => hasComponent(x, EntityTreeComponent)) ?? []
          )
      }
      !snubChildren &&
        frontier.push(
          getComponent(item, EntityTreeComponent).children?.filter((x) => hasComponent(x, EntityTreeComponent)) ?? []
        )
    }
  }
  return result
}

/**
 * Traverse parent nodes for given Entity Tree Node
 * @param node Node for which traversal will occur
 * @param cb Callback function which will be called for every traverse
 * @param tree Entity Tree
 */
export function traverseEntityNodeParent(entity: Entity, cb: (parent: Entity) => void): void {
  const entityTreeNode = getComponent(entity, EntityTreeComponent)
  if (entityTreeNode.parentEntity) {
    const parent = entityTreeNode.parentEntity
    cb(parent)
    traverseEntityNodeParent(parent, cb)
  }
}

/**
 * Finds the index of an entity tree node using entity.
 * This function is useful for node which is not contained in array but can have same entity as one of array elements
 * @param arr Nodes array
 * @param node Node to find index of
 * @returns index of the node if found -1 oterhwise.
 */
export function findIndexOfEntityNode(arr: Entity[], obj: Entity): number {
  for (let i = 0; i < arr.length; i++) {
    const elt = arr[i]
    if (obj === elt) return i
  }
  return -1
}

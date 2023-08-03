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
import { useTranslation } from 'react-i18next'

import ConfirmDialog from '@etherealengine/client-core/src/common/components/ConfirmDialog'
import { Channel } from '@etherealengine/common/src/interfaces/Channel'
import { getMutableState, useHookstate } from '@etherealengine/hyperflux'
import Box from '@etherealengine/ui/src/primitives/mui/Box'

import { ChannelID } from '@etherealengine/common/src/interfaces/ChannelUser'
import { AuthState } from '../../../user/services/AuthService'
import TableComponent from '../../common/Table'
import { channelColumns, ChannelData, ChannelPropsTable } from '../../common/variables/channel'
import { AdminChannelService, AdminChannelState, CHANNEL_PAGE_LIMIT } from '../../services/ChannelService'
import styles from '../../styles/admin.module.scss'
import ChannelDrawer, { ChannelDrawerMode } from './ChannelDrawer'

const ChannelTable = ({ className, search }: ChannelPropsTable) => {
  const { t } = useTranslation()
  const page = useHookstate(0)
  const rowsPerPage = useHookstate(CHANNEL_PAGE_LIMIT)
  const openConfirm = useHookstate(false)
  const channelId = useHookstate('' as ChannelID)
  const fieldOrder = useHookstate('asc')
  const sortField = useHookstate('name')
  const openChannelDrawer = useHookstate(false)
  const channelAdmin = useHookstate<Channel | undefined>(undefined)

  const user = useHookstate(getMutableState(AuthState).user)
  const adminChannelState = useHookstate(getMutableState(AdminChannelState))
  const adminChannelData = adminChannelState.channels?.get({ noproxy: true }) || []
  const adminChannelCount = adminChannelState.total.value

  useEffect(() => {
    AdminChannelService.fetchAdminChannel(search, page.value, sortField.value, fieldOrder.value)
  }, [user?.id?.value, adminChannelState.updateNeeded.value, search])

  const handlePageChange = (event: unknown, newPage: number) => {
    AdminChannelService.fetchAdminChannel(search, page.value, sortField.value, fieldOrder.value)
    page.set(newPage)
  }

  useEffect(() => {
    if (adminChannelState.fetched.value) {
      AdminChannelService.fetchAdminChannel(search, page.value, sortField.value, fieldOrder.value)
    }
  }, [fieldOrder.value])

  const submitRemoveChannel = async () => {
    await AdminChannelService.removeChannel(channelId.value)
    openConfirm.set(false)
  }

  const handleOpenChannelDrawer = (open: boolean, channel: any) => {
    channelAdmin.set(channel)
    openChannelDrawer.set(open)
  }

  const handleCloseChannelDrawer = () => {
    channelAdmin.set(undefined)
    openChannelDrawer.set(false)
  }

  const createData = (el: Channel, id: ChannelID, name: string): ChannelData => {
    return {
      el,
      id,
      name,
      action: (
        <>
          <a className={styles.actionStyle} onClick={() => handleOpenChannelDrawer(true, el)}>
            <span className={styles.spanWhite}>{t('admin:components.common.view')}</span>
          </a>
          <a
            className={styles.actionStyle}
            onClick={() => {
              channelId.set(id)
              openConfirm.set(true)
            }}
          >
            <span className={styles.spanDange}>{t('admin:components.common.delete')}</span>
          </a>
        </>
      )
    }
  }

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    rowsPerPage.set(+event.target.value)
    page.set(0)
  }

  const rows = adminChannelData?.map((el: Channel) => {
    return createData(el, el.id!, el.name)
  })

  return (
    <Box className={className}>
      <TableComponent
        allowSort={false}
        fieldOrder={fieldOrder.value}
        setSortField={sortField.set}
        setFieldOrder={fieldOrder.set}
        rows={rows}
        column={channelColumns}
        page={page.value}
        rowsPerPage={rowsPerPage.value}
        count={adminChannelCount}
        handlePageChange={handlePageChange}
        handleRowsPerPageChange={handleRowsPerPageChange}
      />
      <ConfirmDialog
        open={openConfirm.value}
        description={`${t('admin:components.channel.confirmChannelDelete')}`}
        onClose={() => openConfirm.set(false)}
        onSubmit={submitRemoveChannel}
      />
      <ChannelDrawer
        open={openChannelDrawer.value}
        mode={ChannelDrawerMode.ViewEdit}
        selectedChannel={channelAdmin.value}
        onClose={handleCloseChannelDrawer}
      />
    </Box>
  )
}

export default ChannelTable
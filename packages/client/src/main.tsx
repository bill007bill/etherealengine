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

import { t } from 'i18next'
import React, { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import ErrorBoundary from '@etherealengine/client-core/src/common/components/ErrorBoundary'
import { LoadingCircle } from '@etherealengine/client-core/src/components/LoadingCircle'

import './pages/styles.scss'
// tslint:disable:ordered-imports
// @ts-ignore
;(globalThis as any).process = { env: { ...(import.meta as any).env, APP_ENV: (import.meta as any).env.MODE } }

const Engine = lazy(() => import('./engine'))

/** @deprecated see https://github.com/EtherealEngine/etherealengine/issues/6485 */
const AppPage = lazy(() => import('./pages/_app'))
const TailwindPage = lazy(() => import('./pages/_app_tw'))

const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* @todo - these are for backwards compatibility with non tailwind pages - they will be removed eventually */}
          <Route
            key={'admin'}
            path={'/admin/*'}
            element={
              <Suspense fallback={<LoadingCircle message={t('common:loader.starting')} />}>
                <Engine>
                  <AppPage route={'admin'} />
                </Engine>
              </Suspense>
            }
          />
          <Route
            key={'location'}
            path={'/location/*'}
            element={
              <Suspense fallback={<LoadingCircle message={t('common:loader.starting')} />}>
                <Engine>
                  <AppPage route={'location'} />
                </Engine>
              </Suspense>
            }
          />
          <Route
            key={'studio'}
            path={'/studio/*'}
            element={
              <Suspense fallback={<LoadingCircle message={t('common:loader.starting')} />}>
                <Engine>
                  <AppPage route={'studio'} />
                </Engine>
              </Suspense>
            }
          />
          <Route
            key={'offline'}
            path={'/offline/*'}
            element={
              <Suspense fallback={<LoadingCircle message={t('common:loader.starting')} />}>
                <Engine>
                  <AppPage route={'offline'} />
                </Engine>
              </Suspense>
            }
          />
          {/* This will become redundant and we can embed the TailwindPage directly */}
          <Route
            key={'default'}
            path={'/*'}
            element={
              <Suspense>
                <TailwindPage />
              </Suspense>
            }
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

const container = document.getElementById('root')
const root = createRoot(container!)
root.render(<App />)

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

import {
  defineState,
  getMutableState,
  getState,
  syncStateWithLocalStorage,
  useHookstate
} from '@etherealengine/hyperflux'

import { useEffect } from 'react'
import { MediaSettingsState } from '../networking/MediaSettingsState'

/**
 * All values ranged from 0 to 1
 */
export const AudioState = defineState({
  name: 'AudioState',
  initial: () => ({
    audioContext: null! as AudioContext,
    cameraGainNode: null! as GainNode,
    gainNodeMixBuses: {
      mediaStreams: null! as GainNode,
      notifications: null! as GainNode,
      music: null! as GainNode,
      soundEffects: null! as GainNode
    },
    masterVolume: 0.5,
    microphoneGain: 0.5,
    positionalMedia: false,
    usePositionalMedia: 'auto' as 'auto' | 'off' | 'on',
    mediaStreamVolume: 1,
    notificationVolume: 1,
    soundEffectsVolume: 1,
    backgroundMusicVolume: 0.5
  }),
  onCreate: () => {
    syncStateWithLocalStorage(AudioState, [
      'masterVolume',
      'microphoneGain',
      'positionalMedia',
      'mediaStreamVolume',
      'notificationVolume',
      'soundEffectsVolume',
      'backgroundMusicVolume'
    ])
    //FIXME do this more gracefully than a hard setTimeout
    setTimeout(() => {
      getMutableState(MediaSettingsState).immersiveMedia.set(getState(AudioState).positionalMedia)
    }, 1000)
  }
})

export const useAudioState = () => {
  const audioState = useHookstate(getMutableState(AudioState))

  useEffect(() => {
    const audioContext = getState(AudioState).audioContext

    const audioState = getMutableState(AudioState)
    const currentTime = audioState.audioContext.currentTime.value

    audioState.cameraGainNode.gain.value.setTargetAtTime(audioState.masterVolume.value, currentTime, 0.01)

    /** create gain nodes for mix buses */
    audioState.gainNodeMixBuses.mediaStreams.set(audioContext.createGain())
    audioState.gainNodeMixBuses.mediaStreams.value.connect(audioState.cameraGainNode.value)
    audioState.gainNodeMixBuses.mediaStreams.value.gain.setTargetAtTime(
      audioState.mediaStreamVolume.value,
      currentTime,
      0.01
    )

    audioState.gainNodeMixBuses.notifications.set(audioContext.createGain())
    audioState.gainNodeMixBuses.notifications.value.connect(audioState.cameraGainNode.value)
    audioState.gainNodeMixBuses.notifications.value.gain.setTargetAtTime(
      audioState.notificationVolume.value,
      currentTime,
      0.01
    )

    audioState.gainNodeMixBuses.music.set(audioContext.createGain())
    audioState.gainNodeMixBuses.music.value.connect(audioState.cameraGainNode.value)
    audioState.gainNodeMixBuses.music.value.gain.setTargetAtTime(
      audioState.backgroundMusicVolume.value,
      currentTime,
      0.01
    )

    audioState.gainNodeMixBuses.soundEffects.set(audioContext.createGain())
    audioState.gainNodeMixBuses.soundEffects.value.connect(audioState.cameraGainNode.value)
    audioState.gainNodeMixBuses.soundEffects.value.gain.setTargetAtTime(
      audioState.soundEffectsVolume.value,
      currentTime,
      0.01
    )

    return () => {
      audioState.gainNodeMixBuses.mediaStreams.value.disconnect()
      audioState.gainNodeMixBuses.mediaStreams.set(null!)
      audioState.gainNodeMixBuses.notifications.value.disconnect()
      audioState.gainNodeMixBuses.notifications.set(null!)
      audioState.gainNodeMixBuses.music.value.disconnect()
      audioState.gainNodeMixBuses.music.set(null!)
      audioState.gainNodeMixBuses.soundEffects.value.disconnect()
      audioState.gainNodeMixBuses.soundEffects.set(null!)
    }
  }, [])

  useEffect(() => {
    audioState.cameraGainNode.value.gain.setTargetAtTime(
      audioState.masterVolume.value,
      audioState.audioContext.value.currentTime,
      0.01
    )
  }, [audioState.masterVolume])

  useEffect(() => {
    audioState.gainNodeMixBuses.value.mediaStreams.gain.setTargetAtTime(
      audioState.mediaStreamVolume.value,
      audioState.audioContext.value.currentTime,
      0.01
    )
  }, [audioState.mediaStreamVolume])

  useEffect(() => {
    audioState.gainNodeMixBuses.value.notifications.gain.setTargetAtTime(
      audioState.notificationVolume.value,
      audioState.audioContext.value.currentTime,
      0.01
    )
  }, [audioState.notificationVolume])

  useEffect(() => {
    audioState.gainNodeMixBuses.value.soundEffects.gain.setTargetAtTime(
      audioState.soundEffectsVolume.value,
      audioState.audioContext.value.currentTime,
      0.01
    )
  }, [audioState.soundEffectsVolume])

  useEffect(() => {
    audioState.gainNodeMixBuses.value.music.gain.setTargetAtTime(
      audioState.backgroundMusicVolume.value,
      audioState.audioContext.value.currentTime,
      0.01
    )
  }, [audioState.backgroundMusicVolume])

  useEffect(() => {
    getMutableState(MediaSettingsState).immersiveMedia.set(audioState.positionalMedia.value)
  }, [audioState.positionalMedia])
}

export const getPositionalMedia = () => {
  const audioState = getState(AudioState)
  return audioState.usePositionalMedia === 'auto' ? audioState.positionalMedia : audioState.usePositionalMedia === 'on'
}

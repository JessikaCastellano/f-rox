/*
 * Copyright (C) 2021 by Fonoster Inc (https://fonoster.com)
 * http://github.com/fonoster/rox
 *
 * This file is part of Rox AI
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *    https://opensource.org/licenses/MIT
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import logger from '@fonoster/logger'
import { PlaybackControl, VoiceResponse } from '@fonoster/voice'
import { CerebroStatus, Effect, EffectsManagerConfig } from '../@types/cerebro'
import { Intent } from '../@types/intents'
import { nanoid } from 'nanoid'
import { playBusy, playNoAnswer, playTransfering } from './helper'

export class EffectsManager {
  voice: VoiceResponse
  config: EffectsManagerConfig
  constructor(config: EffectsManagerConfig) {
    this.voice = config.voice
    this.config = config
  }

  async invokeEffects(intent: Intent,
    status: CerebroStatus, beforeEffectsCallback: Function, affterEffectsCallback: Function) {
    
    if (status === CerebroStatus.SLEEP) {
      logger.verbose(`@rox/cerebro/effects ignoring effects for sleeping brain`)  
      return
    }

    logger.verbose(`@rox/cerebro/effects invoking before effects callback`)
    beforeEffectsCallback()
    
    if (this.config.activationIntent === intent.ref) {
      logger.verbose("@rox/cerebro/effects fired activation intent")
      return;
    } else if (this.config.activationIntent
      && status != CerebroStatus.AWAKE_ACTIVE) {
      logger.verbose("@rox/cerebro/effects got an intent but cerebro is not awake")
      // If we have activation intent cerebro needs and active status
      // before we can have any effects
      return
    }

    for (let effect of intent.effects) {
      logger.verbose(`@rox/cerebro/effects running effect [type = ${effect.type}]`)
      await this.run({effect, isEndInteraction: intent.isEndInteraction || false})
    }

    if (intent.effects.find(e => e.type === 'transfer' || e.type === 'hangup') ) {
      logger.verbose(`@rox/cerebro/effects ignored after effects callback`)
    } else {
      logger.verbose(`@rox/cerebro/effects invoking after effects callback`)
      affterEffectsCallback()
    }
  }

  async run(runParams: { effect: Effect, isEndInteraction: boolean}) {
    
    const { effect, isEndInteraction } = runParams
    try {
      switch (effect.type) {
        case 'say':
          await this.voice.say(effect.parameters['response'] as string, this.config.voiceConfig)
          break
        case 'hangup':
          await this.voice.hangup()
          break
        case 'transfer':
          // TODO: Add record effect
          await this.transferEffect(this.voice, effect, isEndInteraction)
          break
        case 'send_data':
          // Only send if client support events
          if (this.config.eventsClient) {
            this.config.eventsClient.send(effect.parameters as any)
          }
          break
        default:
          throw new Error(`@rox/cerebro/effects received unknown effect ${effect.type}`)
      }
    } catch(e) {
      if ((e as any)?.response?.status !== 404) {
        logger.error(e)
      }
    }
  }

  async transferEffect(voice: VoiceResponse, effect: Effect, isEndInteraction: boolean) {
    if (isEndInteraction) { 
      await this.voice.closeMediaPipe()
    }
    
    const stream = await this.voice.dial(effect.parameters['destination'] as string)
    const playbackId: string = nanoid()
    const control: PlaybackControl = this.voice.playback(playbackId)
    
    let stay = true
    const moveForward = async() => { 
      stay = false
      await control.stop()
    }

    stream.on('answer', () => {
      moveForward()
    })

    stream.on('busy', async() => {
      await moveForward()
      await playBusy(this.voice, playbackId, this.config)
      await this.voice.hangup()
    })

    stream.on('noanswer', async() => {
      await moveForward()
      await playNoAnswer(this.voice, playbackId, this.config)
      await this.voice.hangup()
    })

    while(stay) {
      await playTransfering(this.voice, playbackId, this.config)
    }
  }
}
